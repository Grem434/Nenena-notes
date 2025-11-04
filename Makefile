.PHONY: up down logs api web

up:
	docker compose -f deploy/compose.yml up -d --build

down:
	docker compose -f deploy/compose.yml down

logs:
	docker compose -f deploy/compose.yml logs -f --tail=100

api-shell:
	docker compose -f deploy/compose.yml exec api bash
