from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()

class LoginIn(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(payload: LoginIn):
    # Placeholder: returns fake tokens until DB/JWT implemented
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Missing credentials")
    return {
        "access_token": "fake-access-token",
        "refresh_token": "fake-refresh-token",
        "token_type": "bearer"
    }

@router.get("/me")
def me():
    # Placeholder user
    return {"id": "00000000-0000-0000-0000-000000000000", "email": "admin@nenena.com", "name": "Admin", "role": "admin"}
