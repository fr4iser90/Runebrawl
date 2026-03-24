# Runebrawl

Browser-based multiplayer autobattler inspired by genre-defining games such as Hearthstone Battlegrounds.

## Documentation

See `docs/README.md` for:
- `docs/GDD.md` (game design)
- `docs/TDD.md` (technical architecture)
- `docs/ROADMAP.md` (milestones)

## Legal Note

Runebrawl is an original game project. All trademarks and game titles referenced belong to their respective owners.

## MVP Implementation (Milestone 0 + 1)

This repository now includes a runnable MVP:
- `apps/server` - Fastify + WebSocket authoritative game server
- `apps/client` - Vue 3 frontend (tavern top, board/bench bottom, status/combat log)
- `packages/shared` - Shared game protocol/types
- `db/migrations` - Initial database schema
- `docker-compose.yml` - PostgreSQL service

## Run Local

1. Install dependencies:
   - `npm install`
2. Start app:
   - `npm run dev`
3. Open UI:
   - `http://localhost:5173`
4. Server health:
   - `http://localhost:3001/health`