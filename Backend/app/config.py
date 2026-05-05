from pathlib import Path
import os

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env", override=True)


class Settings:
    def __init__(self) -> None:
        self.reload()

    def reload(self) -> None:
        load_dotenv(BASE_DIR / ".env", override=True)
        self.app_name = os.getenv("APP_NAME", "Paper RAG Backend")
        self.app_host = os.getenv("APP_HOST", "127.0.0.1")
        self.app_port = int(os.getenv("APP_PORT", "8001"))
        self.token_secret = os.getenv("TOKEN_SECRET", "change-this-secret-key")
        self.token_expire_minutes = int(os.getenv("TOKEN_EXPIRE_MINUTES", "1440"))
        self.upload_dir = BASE_DIR / os.getenv("UPLOAD_DIR", "uploads")

        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_base_url = os.getenv(
            "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
        ).rstrip("/")
        self.gemini_chat_model = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash-lite")
        self.gemini_timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "120"))


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)