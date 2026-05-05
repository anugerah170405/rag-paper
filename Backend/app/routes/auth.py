from fastapi import APIRouter, Depends, HTTPException

from ..database import get_conn
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from ..security import create_token, current_user, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def me(user: UserOut = Depends(current_user)) -> UserOut:
    return user


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> AuthResponse:
    with get_conn() as conn:
        cur = conn.execute(
            "SELECT id FROM rag_users WHERE LOWER(email) = LOWER(?)",
            (payload.email,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")

        cur = conn.execute(
            """
            INSERT INTO rag_users (username, email, password_hash)
            VALUES (?, ?, ?)
            """,
            (payload.username, payload.email, hash_password(payload.password)),
        )
        user_id = cur.lastrowid
        conn.commit()

    user = UserOut(id=user_id, username=payload.username, email=payload.email)
    return AuthResponse(access_token=create_token(user_id), user=user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    with get_conn() as conn:
        cur = conn.execute(
            """
            SELECT id, username, email, password_hash
            FROM rag_users
            WHERE LOWER(email) = LOWER(?)
            """,
            (payload.email,),
        )
        row = cur.fetchone()

    if not row or not verify_password(payload.password, row[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = UserOut(id=int(row[0]), username=row[1], email=row[2])
    return AuthResponse(access_token=create_token(user.id), user=user)