# Nenena Notes API – Dockerfile (corregido para context ../apps/api)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Copiar dependencias del proyecto
COPY pyproject.toml /app/pyproject.toml

# Instalar dependencias base del entorno
RUN pip install --upgrade pip && pip install \
    "fastapi==0.115.0" \
    "uvicorn[standard]==0.30.6" \
    "pydantic-settings==2.4.0" \
    "python-multipart==0.0.9" \
    "email-validator==2.2.0"

# Copiar el código fuente
COPY app /app/app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
