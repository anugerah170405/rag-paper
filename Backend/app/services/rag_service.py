from typing import Any

from ..database import text_value


def score_chunk(query: str, content: str) -> float:
    query_terms = [term.lower() for term in query.split() if len(term) > 2]
    if not query_terms:
        return 0.0
    content_lower = content.lower()
    hits = sum(content_lower.count(term) for term in query_terms)
    coverage = sum(1 for term in set(query_terms) if term in content_lower)
    return float(hits + coverage * 2)


def search_chunks(cur, paper_id: int, query: str, top_k: int = 5) -> list[dict[str, Any]]:
    cur.execute(
        """
        SELECT id, page_number, section_type, content
        FROM rag_chunks
        WHERE paper_id = ?
        """,
        (paper_id,),
    )
    results = []
    for row in cur.fetchall():
        content = text_value(row[3]) or ""
        score = score_chunk(query, content)
        if score > 0:
            results.append(
                {
                    "chunk_id": int(row[0]),
                    "page_number": int(row[1]),
                    "section_type": row[2],
                    "content": content,
                    "score": score,
                }
            )

    if not results:
        cur.execute(
            """
            SELECT id, page_number, section_type, content
            FROM rag_chunks
            WHERE paper_id = ?
            LIMIT ?
            """,
            (paper_id, top_k),
        )
        for row in cur.fetchall():
            content = text_value(row[3]) or ""
            results.append(
                {
                    "chunk_id": int(row[0]),
                    "page_number": int(row[1]),
                    "section_type": row[2],
                    "content": content,
                    "score": 0.5,
                }
            )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results[:top_k]