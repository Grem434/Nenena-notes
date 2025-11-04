from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from .api.v1.router import api_router

class Settings(BaseSettings):
    API_CORS_ORIGINS: str = "http://localhost,http://localhost:5173"

settings = Settings()

app = FastAPI(title="Nenena Notes API", version="0.1.0")

# CORS
origins = [o.strip() for o in settings.API_CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(api_router, prefix="/api/v1")
