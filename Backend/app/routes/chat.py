from fastapi import APIRouter, Depends, HTTPException

from ..database import get_conn, text_value
from ..schemas import UserOut
from ..security import current_user


router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/sessions/{session_id}")
def get_chat_session(session_id: int, user: UserOut = Depends(current_user)):
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT cs.id, cs.paper_id, cs.title
            FROM rag_chat_sessions cs
            WHERE cs.id = ? AND cs.user_id = ?
            """,
            (session_id, user.id),
        )
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

        cur = conn.execute(
            """
            SELECT role, content, created_at
            FROM rag_chat_messages
            WHERE session_id = ?
            ORDER BY id ASC
            """,
            (session_id,),
        )
        messages = [
            {
                "role": row[0],
                "content": text_value(row[1]),
                "created_at": str(row[2]) if row[2] else None,
            }
            for row in cur.fetchall()
        ]

    return {
        "id": int(session[0]),
        "paper_id": int(session[1]),
        "title": session[2],
        "messages": messages,
    }