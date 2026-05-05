import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .config import settings

# Lokasi file SQLite — disimpan di folder yang sama dengan project
DB_PATH = Path(__file__).parent.parent / "rag_database.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def init_schema() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS rag_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rag_papers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            authors TEXT,
            journal TEXT,
            doi TEXT,
            published_date TEXT,
            page_count INTEGER DEFAULT 0,
            original_filename TEXT,
            stored_filename TEXT,
            file_size INTEGER DEFAULT 0,
            document_link TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rag_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_id INTEGER NOT NULL,
            section_type TEXT NOT NULL,
            content TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rag_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_id INTEGER NOT NULL,
            page_number INTEGER NOT NULL,
            section_type TEXT,
            content TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rag_chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS rag_chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
    ]

    with get_conn() as conn:
        for statement in statements:
            conn.execute(statement)
        conn.commit()


def next_id(cur, table_name: str) -> int:
    """
    Di SQLite tidak ada SEQUENCE seperti Oracle.
    Fungsi ini dipertahankan untuk kompatibilitas, tapi sebaiknya
    gunakan AUTOINCREMENT dan ambil lastrowid setelah INSERT.
    Mengembalikan nilai id terakhir + 1 dari tabel yang diberikan.
    """
    cur.execute(f"SELECT COALESCE(MAX(id), 0) + 1 FROM {table_name}")
    return int(cur.fetchone()[0])


def text_value(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "read"):
        return value.read()
    return str(value)