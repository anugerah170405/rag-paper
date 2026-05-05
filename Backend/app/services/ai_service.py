import json
from urllib import error as urlerror
from urllib import request as urlrequest

from ..config import settings


import httpx

def call_gemini(prompt: str) -> str:
    settings.reload()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY belum diisi di file .env")

    url = f"{settings.gemini_base_url}/chat/completions"
    payload = {
        "model": settings.gemini_chat_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "max_tokens": 900,
    }

    try:
        with httpx.Client(timeout=settings.gemini_timeout_seconds) as client:
            response = client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.gemini_api_key}"},
            )
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"Groq HTTP error {exc.response.status_code}: {exc.response.text}") from exc
    except Exception as exc:
        raise RuntimeError(f"Groq request failed: {exc}") from exc

    try:
        return body["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        raise RuntimeError(f"Groq response tidak sesuai: {body}") from exc


def fallback_answer(context: str, task: str, reason: str | None = None) -> str:
    context = " ".join(context.split())
    if not context:
        return "Saya belum menemukan teks yang bisa dibaca dari PDF ini."
    preview = context[:900]
    reason_text = f" Detail Gemini: {reason[:600]}. " if reason else " "
    return (
        "Mode fallback aktif karena Gemini gagal dipanggil."
        f"{reason_text}"
        f"Berdasarkan potongan PDF yang paling relevan, {task}: {preview}"
    )
