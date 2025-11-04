# Nenena Notes – MVP Skeleton

Este esqueleto te permite **levantar el stack local** con API FastAPI, frontend Vite React y Nginx como reverse proxy.

## Requisitos
- Docker + Docker Compose
- Puertos libres: 80, 5173, 8000, 5432

## Arranque rápido
```bash
cp deploy/env/.env.dev deploy/env/.env.local || true  # opcional
docker compose -f deploy/compose.yml up -d --build
```

- Frontend: http://localhost
- API: http://localhost/api/v1  (health: http://localhost/health)

> La API viene con endpoints **placeholder**. Próximo paso: añadir PostgreSQL + JWT + modelos `users` y `notes`.

## Estructura
- `apps/api`: FastAPI minimal (rutas: `/auth`, `/notes` fake)
- `apps/web`: React + Vite + Tailwind (maquetación inicial)
- `deploy`: Dockerfiles, Compose, Nginx, envs

## Próximos pasos
1. Añadir SQLAlchemy + Alembic y conectar DB.
2. Implementar registro/login real con JWT y hash.
3. CRUD de notas con compartición y eventos de notificación.