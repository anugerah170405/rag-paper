from pathlib import Path
from typing import Any
import re

import fitz


DOI_RE = re.compile(r"\b10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.I)
DOI_FLEX_RE = re.compile(r"\b10\s*\.\s*\d{4,9}\s*/\s*[-._;()/:A-Z0-9\s]+", re.I)
YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def clean_text_value(value: str | None, max_len: int = 500) -> str | None:
    if not value:
        return None
    cleaned = " ".join(str(value).replace("\x00", " ").split()).strip()
    if not cleaned or cleaned.lower() in {
        "unknown",
        "untitled",
        "none",
        "null",
        "anonymous",
        "unspecified",
        "not available",
    }:
        return None
    return cleaned[:max_len]


def clean_doi(value: str | None) -> str | None:
    text = value or ""
    match = DOI_RE.search(text)
    if match:
        return match.group(0).rstrip(".,;:) ]}").strip()

    match = DOI_FLEX_RE.search(text)
    if not match:
        return None
    compact = re.sub(r"\s+", "", match.group(0))
    return compact.rstrip(".,;:) ]}").strip()


def clean_doi_from_link(value: str | None) -> str | None:
    if not value:
        return None
    text = value.replace("%2F", "/").replace("%2f", "/")
    return clean_doi(text)


def parse_pdf_date(value: str | None) -> str | None:
    if not value:
        return None
    match = re.search(r"(19|20)\d{2}(?:\d{2})?(?:\d{2})?", value)
    if not match:
        return None
    digits = match.group(0)
    if len(digits) >= 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    return digits[:4]


def first_page_lines(pages: list[dict[str, Any]]) -> list[str]:
    text = "\n".join(page["text"] for page in pages[:2] if page.get("text"))
    lines = []
    for line in text.splitlines():
        cleaned = clean_text_value(line, 220)
        if cleaned:
            lines.append(cleaned)
    return lines


def is_bad_metadata_line(line: str) -> bool:
    lowered = line.lower()
    bad_keywords = [
        "abstract",
        "keywords",
        "doi",
        "issn",
        "isbn",
        "copyright",
        "all rights reserved",
        "http://",
        "https://",
        "www.",
        "received",
        "accepted",
        "published",
        "volume",
        "vol.",
        "issue",
        "page ",
        "pages ",
    ]
    return any(keyword in lowered for keyword in bad_keywords)


def guess_title(lines: list[str]) -> str | None:
    for line in lines[:18]:
        if is_bad_metadata_line(line):
            continue
        if len(line) < 12 or len(line) > 220:
            continue
        if line.isdigit():
            continue
        return line
    return None


def guess_authors(lines: list[str], title: str | None) -> str | None:
    start_index = 0
    if title:
        for index, line in enumerate(lines[:20]):
            if line.strip().lower() == title.strip().lower():
                start_index = index + 1
                break

    for line in lines[start_index : start_index + 8]:
        if is_bad_metadata_line(line):
            continue
        if len(line) < 3 or len(line) > 220:
            continue
        if "@" in line or YEAR_RE.search(line):
            continue
        lowered = line.lower()
        if lowered.startswith("by "):
            line = line[3:].strip()
        has_author_shape = (
            "," in line
            or " and " in lowered
            or bool(re.search(r"\b[A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)+\b", line))
        )
        if has_author_shape:
            return clean_text_value(line, 500)
    return None


def guess_journal(lines: list[str]) -> str | None:
    journal_words = [
        "journal",
        "proceedings",
        "conference",
        "transactions",
        "review",
        "bulletin",
        "letters",
        "science",
        "nature",
        "springer",
        "elsevier",
        "ieee",
        "acm",
    ]
    for line in lines[:35]:
        lowered = line.lower()
        if any(word in lowered for word in journal_words) and not lowered.startswith("doi"):
            return clean_text_value(line, 255)
    return None


def guess_published_date(text: str, metadata_date: str | None) -> str | None:
    labelled = re.search(
        r"(published|publication date|available online|copyright|received|accepted)[^\n]{0,80}?((19|20)\d{2})",
        text,
        flags=re.I,
    )
    if labelled:
        return labelled.group(2)
    match = YEAR_RE.search(text[:4000])
    return match.group(0) if match else None


def extract_pdf_metadata(
    file_path: Path,
    pages: list[dict[str, Any]],
    document_link: str | None = None,
) -> dict[str, str | None]:
    with fitz.open(file_path) as document:
        raw = document.metadata or {}

    lines = first_page_lines(pages)
    first_pages_text = "\n".join(page["text"] for page in pages[:3] if page.get("text"))
    full_text = "\n".join(page["text"] for page in pages if page.get("text"))
    raw_text = "\n".join(str(value) for value in raw.values() if value)

    title = clean_text_value(raw.get("title"), 255) or guess_title(lines)
    authors = clean_text_value(raw.get("author"), 500) or guess_authors(lines, title)
    journal = clean_text_value(raw.get("subject"), 255) or guess_journal(lines)
    doi = clean_doi_from_link(document_link) or clean_doi(raw_text) or clean_doi(first_pages_text) or clean_doi(full_text)
    published_date = guess_published_date(
        first_pages_text,
        parse_pdf_date(raw.get("creationDate") or raw.get("modDate")),
    )

    return {
        "title": title,
        "authors": authors,
        "journal": journal,
        "doi": doi,
        "published_date": published_date,
    }


def extract_pdf_pages(file_path: Path) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    with fitz.open(file_path) as document:
        for index, page in enumerate(document, start=1):
            pages.append({"page_number": index, "text": page.get_text("text").strip()})
    return pages


def split_words(text: str, max_words: int = 260, overlap: int = 35) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    step = max(1, max_words - overlap)
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + max_words]).strip()
        if chunk:
            chunks.append(chunk)
        if start + max_words >= len(words):
            break
    return chunks


def detect_section(full_text: str, section_name: str) -> str | None:
    markers = {
        "abstract": ["abstract"],
        "methodology": ["methodology", "method", "methods"],
        "results": ["results", "result"],
        "conclusion": ["conclusion", "conclusions"],
    }
    lowered = full_text.lower()
    starts = [(lowered.find(marker), marker) for marker in markers.get(section_name, [])]
    starts = [(idx, marker) for idx, marker in starts if idx >= 0]
    if not starts:
        return None
    start = min(starts)[0]

    next_positions = []
    for marker_list in markers.values():
        for marker in marker_list:
            idx = lowered.find(marker, start + 20)
            if idx > start:
                next_positions.append(idx)
    end = min(next_positions) if next_positions else min(len(full_text), start + 2500)
    return full_text[start:end].strip()[:5000] or None


def build_sections(pages: list[dict[str, Any]]) -> dict[str, str | None]:
    full_text = "\n\n".join(page["text"] for page in pages if page["text"])
    overview = full_text[:4500] if full_text else "PDF uploaded, but no readable text was detected."
    return {
        "overview": overview,
        "abstract": detect_section(full_text, "abstract"),
        "methodology": detect_section(full_text, "methodology"),
        "results": detect_section(full_text, "results"),
        "conclusion": detect_section(full_text, "conclusion"),
    }
