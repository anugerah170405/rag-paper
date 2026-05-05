# 📚 Research Paper Assistant (Paper RAG)
Research Paper Assistant – AI bantu baca jurnal ilmiah

Paper RAG adalah aplikasi berbasis AI yang dirancang untuk membantu pengguna dalam membaca, memahami, dan mengekstrak informasi penting dari jurnal ilmiah secara cepat dan efisien. Dengan memanfaatkan pendekatan Retrieval-Augmented Generation (RAG), sistem ini mampu menggabungkan kemampuan pencarian dokumen dengan kecerdasan generatif untuk memberikan jawaban yang relevan dan kontekstual.

## Anggota Kelompok 1

1. Mamahit, Sthaford Beim (Ketua)
2. Londok, Stieven Joshua
3. Loing, Rayden Vigo Avogadro
4. Hongjoyo, Zacklee Johanes
5. Gari, Anugerah

## Link Reels
Instagram: https://www.instagram.com/reel/DX8cDSvx0oV/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==


## ✨ Overview

Pengguna dapat mengunggah file PDF jurnal, lalu sistem akan:

- Mengekstrak isi dokumen secara otomatis
- Membagi konten menjadi bagian-bagian terstruktur (chunking)
- Menyimpan informasi ke dalam basis data
- Menyediakan fitur tanya jawab berbasis isi jurnal

Melalui fitur chat interaktif, pengguna dapat mengajukan pertanyaan seperti:

> “Apa tujuan penelitian ini?”  
> “Metode apa yang digunakan?”  
> “Apa kesimpulan utama dari paper ini?”

AI akan menjawab berdasarkan isi dokumen yang telah diunggah, bukan dari pengetahuan umum saja, sehingga hasilnya lebih akurat dan kontekstual.

---

## 🚀 Fitur Utama

- 📄 Upload & parsing PDF jurnal
- 🧠 AI-powered Q&A berbasis dokumen
- 🔍 Ekstraksi metadata (judul, penulis, dll)
- 💬 Chat interaktif dengan konteks paper
- 🗂 Penyimpanan dan manajemen dokumen
- ⚡ Pencarian informasi cepat dan terarah

---

## 🛠 Teknologi yang Digunakan

| Layer        | Teknologi              |
|-------------|----------------------|
| Backend     | FastAPI              |
| Frontend    | Vite + React         |
| Database    | SQLite               |
| AI Model    | Gemini API           |
| PDF Engine  | PyMuPDF              |
| Pipeline    | RAG (chunking + retrieval + generation) |

---

## ⚙️ Setup & Installation

Ikuti langkah berikut untuk menjalankan project **Paper RAG** secara lokal.

---

### 🚀 Full Setup (Backend + Frontend)

```bash
# Clone repository
git clone https://github.com/username/paper-rag.git
cd paper-rag

# ========================
# 🔹 BACKEND SETUP
# ========================
cd Backend

# Buat virtual environment
python3 -m venv venv

# Aktifkan venv (Mac/Linux)
source venv/bin/activate

# Install dependencies
python -m pip install \
fastapi \
uvicorn \
python-dotenv \
"pydantic[email]" \
pymupdf \
python-multipart

# Jalankan backend
uvicorn main:app --reload --port 8001

# ========================
# 🔹 FRONTEND SETUP
# (buka terminal baru)
# ========================
cd frontend

# Install dependencies
npm install

# Jalankan frontend
npm run dev