from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import BASE_DIR, settings
from app.database import get_conn, init_schema, DB_PATH
from app.routes import auth, chat, papers


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(papers.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup() -> None:
    init_schema()


@app.get("/health")
def health() -> dict[str, Any]:
    settings.reload()
    database_ok = False
    error = None
    try:
        with get_conn() as conn:
            cur = conn.execute("SELECT 1")
            database_ok = cur.fetchone()[0] == 1
    except Exception as exc:
        error = str(exc)

    return {
        "status": "ok" if database_ok else "error",
        "database": database_ok,
        "database_type": "sqlite",
        "database_path": str(DB_PATH),
        "ai_provider": "gemini",
        "ai": bool(settings.gemini_api_key),
        "gemini_key_loaded": bool(settings.gemini_api_key),
        "chat_model": settings.gemini_chat_model,
        "config_dir": str(BASE_DIR),
        "error": error,
    }