from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=3, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PaperOut(BaseModel):
    id: int
    title: str
    authors: str | None = None
    journal: str | None = None
    doi: str | None = None
    published_date: str | None = None
    page_count: int
    original_filename: str | None = None
    file_size: int
    document_link: str | None = None
    created_at: str | None = None


class PaperDetail(BaseModel):
    paper: PaperOut
    sections: dict[str, str | None]


class ImportResponse(BaseModel):
    paper: PaperOut
    sections_created: int
    chunks_created: int
    message: str


class SummaryRequest(BaseModel):
    mode: str = Field(default="tldr", pattern="^(tldr|beginner|researcher|detailed)$")


class SummaryResponse(BaseModel):
    paper_id: int
    mode: str
    summary: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    session_id: int | None = None
    top_k: int = Field(default=5, ge=1, le=10)


class SourceOut(BaseModel):
    chunk_id: int
    page_number: int
    section_type: str | None = None
    score: float
    preview: str


class ChatResponse(BaseModel):
    session_id: int
    answer: str
    sources: list[SourceOut]
