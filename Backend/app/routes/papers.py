import shutil
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlparse, parse_qs
from urllib.request import Request, urlopen
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from ..config import settings
from ..database import get_conn, next_id, text_value
from ..schemas import (
    ChatRequest,
    ChatResponse,
    ImportResponse,
    PaperDetail,
    PaperOut,
    SourceOut,
    SummaryRequest,
    SummaryResponse,
    UserOut,
)
from ..security import current_user
from ..services.ai_service import call_gemini, fallback_answer
from ..services.pdf_service import build_sections, extract_pdf_metadata, extract_pdf_pages, split_words
from ..services.rag_service import search_chunks


router = APIRouter(prefix="/papers", tags=["papers"])
MAX_LINK_DOWNLOAD_BYTES = 50 * 1024 * 1024
EMPTY_METADATA_VALUES = {"unknown", "untitled", "none", "null", "anonymous", "unspecified", "not available"}


def clean_db_metadata(value) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(str(value).split()).strip()
    if not cleaned or cleaned.lower() in EMPTY_METADATA_VALUES:
        return None
    return cleaned


def clean_db_published(value, authors: str | None, journal: str | None, doi: str | None) -> str | None:
    cleaned = clean_db_metadata(value)
    if not cleaned:
        return None
    if re.fullmatch(r"20\d{2}-\d{2}-\d{2}", cleaned) and not any([authors, journal, doi]):
        return None
    return cleaned


def paper_from_row(row) -> PaperOut:
    authors = clean_db_metadata(row[2])
    journal = clean_db_metadata(row[3])
    doi = clean_db_metadata(row[4])
    published_date = clean_db_published(row[5], authors, journal, doi)
    return PaperOut(
        id=int(row[0]),
        title=row[1],
        authors=authors,
        journal=journal,
        doi=doi,
        published_date=published_date,
        page_count=int(row[6] or 0),
        original_filename=row[7],
        file_size=int(row[8] or 0),
        document_link=row[9],
        created_at=str(row[10]) if row[10] else None,
    )


def get_paper_or_404(cur, paper_id: int, user_id: int) -> PaperOut:
    cur.execute(
        """
        SELECT id, title, authors, journal, doi, published_date, page_count,
               original_filename, file_size, document_link, created_at
        FROM rag_papers
        WHERE id = ? AND user_id = ?
        """,
        (paper_id, user_id),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper_from_row(row)


def stored_file_path(user_id: int, stored_filename: str) -> Path:
    return settings.upload_dir / f"user_{user_id}" / stored_filename


def title_from_filename(filename: str | None) -> str:
    return Path(filename or "paper.pdf").stem.replace("_", " ").strip()


def should_replace_title(current_title: str, original_filename: str | None, metadata_title: str | None) -> bool:
    if not metadata_title:
        return False
    current = (current_title or "").strip().lower()
    filename_title = title_from_filename(original_filename).lower()
    generic_titles = {"materi sql", "linked paper", "paper", filename_title}
    return current in generic_titles


def refresh_paper_metadata_if_needed(conn, cur, paper: PaperOut, user_id: int) -> PaperOut:
    missing_metadata = not paper.authors or not paper.journal or not paper.doi or not paper.published_date
    if not missing_metadata:
        return paper

    cur.execute(
        """
        SELECT stored_filename, document_link
        FROM rag_papers
        WHERE id = ? AND user_id = ?
        """,
        (paper.id, user_id),
    )
    row = cur.fetchone()
    if not row:
        return paper

    file_path = stored_file_path(user_id, row[0])
    if not file_path.exists():
        return paper

    pages = extract_pdf_pages(file_path)
    metadata = extract_pdf_metadata(file_path, pages, row[1])
    updates = {
        "authors": paper.authors or metadata.get("authors"),
        "journal": paper.journal or metadata.get("journal"),
        "doi": paper.doi or metadata.get("doi"),
        "published_date": paper.published_date or metadata.get("published_date"),
    }
    if should_replace_title(paper.title, paper.original_filename, metadata.get("title")):
        updates["title"] = metadata["title"]

    set_clauses = []
    params = []
    for column, value in updates.items():
        if value:
            set_clauses.append(f"{column} = ?")
            params.append(value)

    if set_clauses:
        params.extend([paper.id, user_id])
        cur.execute(
            f"""
            UPDATE rag_papers
            SET {", ".join(set_clauses)}
            WHERE id = ? AND user_id = ?
            """,
            params,
        )
        conn.commit()
        return get_paper_or_404(cur, paper.id, user_id)

    return paper


def safe_pdf_filename(value: str | None, fallback: str = "linked_paper.pdf") -> str:
    filename = Path(unquote(value or "")).name.strip() or fallback
    filename = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._") or fallback
    if not filename.lower().endswith(".pdf"):
        filename = f"{filename}.pdf"
    return filename[:180]


def normalize_document_link(document_link: str) -> str:
    parsed = urlparse(document_link.strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Link must start with http:// or https://")

    host = parsed.netloc.lower()
    path = parsed.path

    if host.endswith("arxiv.org") and path.startswith("/abs/"):
        arxiv_id = path.removeprefix("/abs/").strip("/")
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"

    if host.endswith("drive.google.com") and "/file/d/" in path:
        file_id = path.split("/file/d/", 1)[1].split("/", 1)[0]
        return f"https://drive.google.com/uc?export=download&id={file_id}"

    if host.endswith("drive.google.com") and path == "/open":
        file_id = parse_qs(parsed.query).get("id", [""])[0]
        if file_id:
            return f"https://drive.google.com/uc?export=download&id={file_id}"

    return document_link.strip()


def filename_from_headers(url: str, headers) -> str:
    disposition = headers.get("Content-Disposition", "")
    match = re.search(r"filename\*?=(?:UTF-8''|\"?)([^\";]+)", disposition, flags=re.I)
    if match:
        return safe_pdf_filename(match.group(1))
    return safe_pdf_filename(Path(urlparse(url).path).name)


def find_pdf_link_in_html(base_url: str, html: bytes) -> str | None:
    try:
        text = html.decode("utf-8", errors="ignore")
    except Exception:
        return None

    match = re.search(r"""href=["']([^"']+\.pdf(?:\?[^"']*)?)["']""", text, flags=re.I)
    if not match:
        return None
    return urljoin(base_url, match.group(1))


def download_pdf_link(document_link: str, user_dir: Path, allow_html_follow: bool = True) -> tuple[str, str, Path]:
    source_url = normalize_document_link(document_link)
    request = Request(source_url, headers={"User-Agent": "PaperRAG/1.0"})

    try:
        with urlopen(request, timeout=30) as response:
            final_url = response.geturl()
            content_type = response.headers.get("Content-Type", "").lower()
            first_chunk = response.read(8192)
            looks_like_pdf = (
                first_chunk.startswith(b"%PDF")
                or "application/pdf" in content_type
                or urlparse(final_url).path.lower().endswith(".pdf")
            )

            if not looks_like_pdf:
                if allow_html_follow and "text/html" in content_type:
                    html = first_chunk + response.read(200_000)
                    pdf_url = find_pdf_link_in_html(final_url, html)
                    if pdf_url:
                        return download_pdf_link(pdf_url, user_dir, allow_html_follow=False)
                raise HTTPException(
                    status_code=400,
                    detail="Link is not a direct PDF. Use a direct .pdf link or an arXiv /abs link.",
                )

            original_filename = filename_from_headers(final_url, response.headers)
            stored_name = f"{uuid.uuid4().hex}_{original_filename.replace(' ', '_')}"
            destination = user_dir / stored_name
            total = len(first_chunk)

            with destination.open("wb") as output:
                output.write(first_chunk)
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_LINK_DOWNLOAD_BYTES:
                        output.close()
                        destination.unlink(missing_ok=True)
                        raise HTTPException(status_code=413, detail="PDF link is larger than 50 MB")
                    output.write(chunk)

            return original_filename, stored_name, destination
    except HTTPException:
        raise
    except HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Could not download PDF link: HTTP {exc.code}") from exc
    except URLError as exc:
        raise HTTPException(status_code=400, detail=f"Could not download PDF link: {exc.reason}") from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=400, detail="PDF link download timed out") from exc


@router.get("/", response_model=list[PaperOut])
def list_papers(user: UserOut = Depends(current_user)) -> list[PaperOut]:
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, title, authors, journal, doi, published_date, page_count,
                   original_filename, file_size, document_link, created_at
            FROM rag_papers
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user.id,),
        )
        return [paper_from_row(row) for row in cur.fetchall()]


@router.get("/search", response_model=list[PaperOut])
def search_papers(
    query: str = Query(default=""),
    user: UserOut = Depends(current_user),
) -> list[PaperOut]:
    query_like = f"%{query.lower()}%"
    with get_conn() as conn:
        if query.strip():
            cur = conn.execute(
                """
                SELECT id, title, authors, journal, doi, published_date, page_count,
                       original_filename, file_size, document_link, created_at
                FROM rag_papers
                WHERE user_id = ?
                  AND (
                    LOWER(title) LIKE ?
                    OR LOWER(COALESCE(original_filename, '')) LIKE ?
                    OR LOWER(COALESCE(authors, '')) LIKE ?
                    OR LOWER(COALESCE(journal, '')) LIKE ?
                    OR EXISTS (
                        SELECT 1 FROM rag_chunks c
                        WHERE c.paper_id = rag_papers.id
                          AND LOWER(c.content) LIKE ?
                    )
                  )
                ORDER BY created_at DESC
                """,
                (user.id, query_like, query_like, query_like, query_like, query_like),
            )
        else:
            cur = conn.execute(
                """
                SELECT id, title, authors, journal, doi, published_date, page_count,
                       original_filename, file_size, document_link, created_at
                FROM rag_papers
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user.id,),
            )
        return [paper_from_row(row) for row in cur.fetchall()]


@router.post("/import", response_model=ImportResponse)
def import_paper(
    title: str = Form(default=""),
    document_link: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    user: UserOut = Depends(current_user),
) -> ImportResponse:
    user_dir = settings.upload_dir / f"user_{user.id}"
    user_dir.mkdir(parents=True, exist_ok=True)

    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        original_filename = safe_pdf_filename(file.filename)
        stored_name = f"{uuid.uuid4().hex}_{original_filename.replace(' ', '_')}"
        destination = user_dir / stored_name
        with destination.open("wb") as output:
            shutil.copyfileobj(file.file, output)
        source_link = document_link or None
    else:
        if not document_link.strip():
            raise HTTPException(status_code=400, detail="Upload a PDF file or provide a PDF link")
        original_filename, stored_name, destination = download_pdf_link(document_link, user_dir)
        source_link = document_link.strip()

    pages = extract_pdf_pages(destination)
    sections = build_sections(pages)
    metadata = extract_pdf_metadata(destination, pages, source_link)
    file_size = destination.stat().st_size
    chunks_created = 0
    clean_title = title.strip() or metadata.get("title") or title_from_filename(original_filename)

    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO rag_papers (
                user_id, title, authors, journal, doi, published_date, page_count,
                original_filename, stored_filename, file_size, document_link
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user.id,
                clean_title,
                metadata.get("authors"),
                metadata.get("journal"),
                metadata.get("doi"),
                metadata.get("published_date"),
                len(pages),
                original_filename,
                stored_name,
                file_size,
                source_link,
            ),
        )
        paper_id = cur.lastrowid

        for section_type, content in sections.items():
            conn.execute(
                """
                INSERT INTO rag_sections (paper_id, section_type, content)
                VALUES (?, ?, ?)
                """,
                (paper_id, section_type, content),
            )

        for page in pages:
            for chunk in split_words(page["text"]):
                chunks_created += 1
                conn.execute(
                    """
                    INSERT INTO rag_chunks (paper_id, page_number, section_type, content)
                    VALUES (?, ?, ?, ?)
                    """,
                    (paper_id, page["page_number"], "overview", chunk),
                )

        conn.commit()
        cur2 = conn.execute(
            """
            SELECT id, title, authors, journal, doi, published_date, page_count,
                   original_filename, file_size, document_link, created_at
            FROM rag_papers WHERE id = ?
            """,
            (paper_id,),
        )
        paper = paper_from_row(cur2.fetchone())

    return ImportResponse(
        paper=paper,
        sections_created=len(sections),
        chunks_created=chunks_created,
        message="PDF imported successfully",
    )


@router.get("/{paper_id}", response_model=PaperDetail)
def get_paper(paper_id: int, user: UserOut = Depends(current_user)) -> PaperDetail:
    with get_conn() as conn:
        cur = conn.cursor()
        paper = get_paper_or_404(cur, paper_id, user.id)
        paper = refresh_paper_metadata_if_needed(conn, cur, paper, user.id)
        cur.execute(
            "SELECT section_type, content FROM rag_sections WHERE paper_id = ?",
            (paper_id,),
        )
        sections = {row[0]: text_value(row[1]) for row in cur.fetchall()}
    return PaperDetail(paper=paper, sections=sections)


@router.get("/{paper_id}/file")
def get_paper_file(paper_id: int, user: UserOut = Depends(current_user)):
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT stored_filename, original_filename FROM rag_papers WHERE id = ? AND user_id = ?",
            (paper_id, user.id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Paper not found")

    file_path = stored_file_path(user.id, row[0])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    return FileResponse(file_path, media_type="application/pdf", filename=row[1] or "paper.pdf")


@router.delete("/{paper_id}")
def delete_paper(paper_id: int, user: UserOut = Depends(current_user)):
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT stored_filename FROM rag_papers WHERE id = ? AND user_id = ?",
            (paper_id, user.id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Paper not found")

        stored_filename = row[0]
        conn.execute(
            """
            DELETE FROM rag_chat_messages
            WHERE session_id IN (
                SELECT id FROM rag_chat_sessions
                WHERE paper_id = ? AND user_id = ?
            )
            """,
            (paper_id, user.id),
        )
        conn.execute(
            "DELETE FROM rag_chat_sessions WHERE paper_id = ? AND user_id = ?",
            (paper_id, user.id),
        )
        conn.execute("DELETE FROM rag_chunks WHERE paper_id = ?", (paper_id,))
        conn.execute("DELETE FROM rag_sections WHERE paper_id = ?", (paper_id,))
        conn.execute(
            "DELETE FROM rag_papers WHERE id = ? AND user_id = ?",
            (paper_id, user.id),
        )
        conn.commit()

    if stored_filename:
        stored_file_path(user.id, stored_filename).unlink(missing_ok=True)

    return {"status": "deleted", "paper_id": paper_id}


@router.get("/{paper_id}/sections/{section_type}")
def get_section(paper_id: int, section_type: str, user: UserOut = Depends(current_user)):
    with get_conn() as conn:
        cur = conn.cursor()
        get_paper_or_404(cur, paper_id, user.id)
        cur.execute(
            """
            SELECT content FROM rag_sections
            WHERE paper_id = ? AND section_type = ?
            """,
            (paper_id, section_type),
        )
        row = cur.fetchone()

    return {
        "paper_id": paper_id,
        "section_type": section_type,
        "content": text_value(row[0]) if row else None,
    }


@router.post("/{paper_id}/summary", response_model=SummaryResponse)
def summarize_paper(
    paper_id: int,
    payload: SummaryRequest,
    user: UserOut = Depends(current_user),
) -> SummaryResponse:
    with get_conn() as conn:
        cur = conn.cursor()
        paper = get_paper_or_404(cur, paper_id, user.id)
        chunks = search_chunks(cur, paper_id, paper.title, top_k=6)

    context = "\n\n".join(f"[Page {item['page_number']}] {item['content']}" for item in chunks)
    mode_instruction = {
        "tldr": "Buat ringkasan sangat singkat 3-5 kalimat.",
        "beginner": "Jelaskan dengan bahasa sederhana untuk pemula.",
        "researcher": "Buat ringkasan teknis untuk mahasiswa/peneliti.",
        "detailed": "Buat ringkasan detail per poin penting.",
    }[payload.mode]
    prompt = (
        "Kamu adalah asisten RAG untuk materi kuliah. Jawab dalam bahasa Indonesia.\n"
        f"Judul PDF: {paper.title}\n"
        f"Instruksi: {mode_instruction}\n"
        "Gunakan hanya konteks berikut.\n\n"
        f"{context}"
    )

    try:
        summary = call_gemini(prompt)
    except RuntimeError as exc:
        summary = fallback_answer(context, "ringkasan paper ini", str(exc))

    return SummaryResponse(paper_id=paper_id, mode=payload.mode, summary=summary)


@router.post("/{paper_id}/chat", response_model=ChatResponse)
def chat_with_paper(
    paper_id: int,
    payload: ChatRequest,
    user: UserOut = Depends(current_user),
) -> ChatResponse:
    with get_conn() as conn:
        cur = conn.cursor()
        paper = get_paper_or_404(cur, paper_id, user.id)
        chunks = search_chunks(cur, paper_id, payload.message, top_k=payload.top_k)

        session_id = payload.session_id
        if session_id is None:
            cur2 = conn.execute(
                """
                INSERT INTO rag_chat_sessions (paper_id, user_id, title)
                VALUES (?, ?, ?)
                """,
                (paper_id, user.id, payload.message[:180]),
            )
            session_id = cur2.lastrowid

        conn.execute(
            """
            INSERT INTO rag_chat_messages (session_id, role, content)
            VALUES (?, ?, ?)
            """,
            (session_id, "user", payload.message),
        )

        context = "\n\n".join(
            f"[Source {idx + 1} | halaman {item['page_number']}] {item['content']}"
            for idx, item in enumerate(chunks)
        )
        prompt = (
            "Kamu adalah asisten RAG untuk PDF kampus. Jawab dalam bahasa Indonesia.\n"
            "Jawaban harus berdasarkan konteks PDF, dan sebutkan halaman sumber di akhir.\n"
            f"Judul PDF: {paper.title}\n"
            f"Pertanyaan: {payload.message}\n\n"
            f"Konteks:\n{context}"
        )

        try:
            answer = call_gemini(prompt)
        except RuntimeError as exc:
            answer = fallback_answer(context, f"jawaban untuk pertanyaan '{payload.message}'", str(exc))

        conn.execute(
            """
            INSERT INTO rag_chat_messages (session_id, role, content)
            VALUES (?, ?, ?)
            """,
            (session_id, "assistant", answer),
        )
        conn.commit()

    sources = [
        SourceOut(
            chunk_id=item["chunk_id"],
            page_number=item["page_number"],
            section_type=item["section_type"],
            score=round(float(item["score"]), 3),
            preview=item["content"][:240],
        )
        for item in chunks
    ]
    return ChatResponse(session_id=session_id, answer=answer, sources=sources)