import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Header, HTTPException

from .config import settings
from .database import get_conn
from .schemas import UserOut


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, salt_b64, digest_b64 = stored_hash.split("$", 2)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def create_token(user_id: int) -> str:
    payload = {
        "sub": user_id,
        "exp": int(time.time()) + settings.token_expire_minutes * 60,
    }
    payload_part = b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(
        settings.token_secret.encode(),
        payload_part.encode(),
        hashlib.sha256,
    ).digest()
    return f"{payload_part}.{b64url_encode(signature)}"


def verify_token(token: str) -> int:
    try:
        payload_part, signature_part = token.split(".", 1)
        expected = hmac.new(
            settings.token_secret.encode(),
            payload_part.encode(),
            hashlib.sha256,
        ).digest()
        actual = b64url_decode(signature_part)
        if not hmac.compare_digest(actual, expected):
            raise ValueError("bad signature")
        payload = json.loads(b64url_decode(payload_part))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("expired")
        return int(payload["sub"])
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def current_user(authorization: str | None = Header(default=None)) -> UserOut:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization bearer token is required")
    user_id = verify_token(authorization.split(" ", 1)[1].strip())
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT id, username, email FROM rag_users WHERE id = ?",
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    return UserOut(id=int(row[0]), username=row[1], email=row[2])