# Paper RAG Backend Standalone

Backend ini hanya backend. Tidak ada frontend, tidak ada proxy Vite, dan tidak ada file React.

## Struktur Folder

```text
paper_rag_backend_standalone/
  main.py                 # Entry point FastAPI
  app/
    config.py             # Ambil setting dari .env
    database.py           # Koneksi Oracle dan schema table
    schemas.py            # Bentuk request/response API
    security.py           # Password hash dan token login
    routes/
      auth.py             # Register dan login
      papers.py           # Upload PDF, list paper, summary, chat paper
      chat.py             # Riwayat chat session
    services/
      ai_service.py       # Gemini AI dan fallback
      pdf_service.py      # Ekstrak teks PDF
      rag_service.py      # Cari potongan PDF yang relevan
```

## Cara Run

```powershell
cd "C:\Users\Stieven Londok\Documents\Codex\2026-05-01\files-mentioned-by-the-user-dialog\paper_rag_backend_standalone"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\run_backend.ps1
```

Kalau berhasil:

```text
Uvicorn running on http://127.0.0.1:8001
```

Tes:

```text
http://127.0.0.1:8001/health
http://127.0.0.1:8001/docs
```

## Endpoint Utama

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /papers/`
- `GET /papers/search?query=sql`
- `POST /papers/import`
- `GET /papers/{paper_id}`
- `GET /papers/{paper_id}/file`
- `GET /papers/{paper_id}/sections/{section_type}`
- `POST /papers/{paper_id}/summary`
- `POST /papers/{paper_id}/chat`
- `GET /chat/sessions/{session_id}`

## Catatan Oracle

Default `.env.example` memakai:

```env
ORACLE_USER=paper_rag
ORACLE_PASSWORD=paper_rag123
ORACLE_DSN=localhost:1521/XE
```

Kalau Oracle kamu beda, edit file `.env`.

## Catatan AI

Isi `GEMINI_API_KEY` di `.env` agar summary dan chat memakai Gemini. Kalau belum diisi, backend tetap jalan dan memakai fallback berbasis teks PDF.
