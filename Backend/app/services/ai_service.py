import json
from urllib import error as urlerror
from urllib import request as urlrequest

from ..config import settings


def call_gemini(prompt: str) -> str:
    settings.reload()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY belum diisi di file .env")

    url = (
        f"{settings.gemini_base_url}/models/{settings.gemini_chat_model}:generateContent"
        f"?key={settings.gemini_api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 900},
    }
    data = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=settings.gemini_timeout_seconds) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP error {exc.code}: {detail}") from exc
    except Exception as exc:
        raise RuntimeError(f"Gemini request failed: {exc}") from exc

    try:
        return body["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as exc:
        raise RuntimeError(f"Gemini response tidak sesuai: {body}") from exc


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
