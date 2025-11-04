from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from uuid import UUID, uuid4

router = APIRouter()

class Note(BaseModel):
    id: UUID
    title: str
    content: str
    status: str = "pending"
    color: str | None = None
    tags: List[str] = []

# In-memory mock
NOTES = [
    Note(id=uuid4(), title="Bienvenida", content="Hola equipo Nenena 👋", status="pending", tags=["general"]),
]

@router.get("")
def list_notes():
    return {"items": [n.dict() for n in NOTES], "total": len(NOTES)}

@router.post("")
def create_note(note: Note):
    NOTES.insert(0, note)
    return note
