# Runebrawl

Browser-based multiplayer autobattler inspired by genre-defining games such as Hearthstone Battlegrounds.

## Documentation

See `docs/README.md` for:
- `docs/CHANGELOG.md` (chronological project updates)
- `docs/COMBAT_SYSTEM.md` (combat architecture and event flow)
- `docs/COMMUNITY_CONTENT_PIPELINE.md` (community contribution flow for content packs)
- `docs/EXECUTION_PLAN.md` (next 2 sprints execution plan)
- `docs/OVERVIEW.md` (current implementation status)
- `docs/GDD.md` (game design)
- `docs/TDD.md` (technical architecture)
- `docs/ROADMAP.md` (milestones)

## Legal Note

Runebrawl is an original game project. All trademarks and game titles referenced belong to their respective owners.

## MVP Implementation (Milestone 0 + 1)

This repository now includes a runnable MVP:
- `apps/server` - Fastify + WebSocket authoritative game server
- `apps/client` - Vue 3 frontend (recruitment hall top, board/bench bottom, status/combat log)
- `packages/shared` - Shared game protocol/types
- `db/migrations` - Initial database schema
- `docker-compose.yml` - PostgreSQL + server + client services

## Run Local

1. Install dependencies:
   - `npm install`
2. Create local env:
   - `cp .env.example .env`
3. Start app:
   - `npm run dev`
4. Open UI:
   - `http://localhost:5173`
5. Server health:
   - `http://localhost:3001/health`

## Run With Docker Compose

1. Start all services:
   - `docker compose up --build`
2. Open UI:
   - `http://localhost:5173`
3. Server health:
   - `http://localhost:3001/health`

Notes:
- Server uses container-internal DB URL (`postgres`) automatically in Compose.
- Hot-reload works via bind mounts for `apps/client`, `apps/server`, and shared packages.

## Run Behind Traefik (Subdomains)

1. Create/update `.env` (based on `.env.example`) and set at least:
   - `APP_URL` (for example `runebrawl.example.com`)
   - `POSTGRES_PASSWORD`
   - `ADMIN_PASSWORD`
   - `PLAYER_SESSION_SECRET`
2. Ensure your Traefik `proxy` Docker network exists.
3. Start stack:
   - `docker compose -f docker-compose.traefik.yml up -d --build`

Expected endpoints:
- Game UI: `https://<APP_URL>`
- API: `https://<APP_URL>/api/*` (Traefik strips `/api` before forwarding to server)
- WebSocket: `wss://<APP_URL>/ws`

## Infra Upgrades Implemented

- Reconnect support (`RECONNECT` intent with persisted `playerId`)
- State sequence snapshots for recovery (`state.sequence`)
- 8-player FFA fill target (bots auto-fill empty seats)
- JSON-driven balance and unit data:
  - `apps/server/src/data/balance.json`
  - `apps/server/src/data/units.json`
- Match history/replay endpoints:
  - `GET /matches/:matchId/history`
  - `GET /matches/:matchId/replay?from=<sequence>`

## Matchmaking / Lobby v1

- Quick Match queue (`QUICK_MATCH`) with automatic lobby creation
- Multiple matches can run in parallel (each with unique `matchId`)
- Private lobbies:
  - Create (`CREATE_PRIVATE_MATCH`)
  - Join by invite code (`JOIN_PRIVATE_MATCH`)
- Lobby admin controls:
  - Add bot (`ADD_BOT_TO_LOBBY`)
  - Force start (`FORCE_START`)

## Lobby Start Rules

- Private lobby:
  - Starts only when **all players are ready** and lobby leader triggers **Force Start**
- Quick match:
  - Starts automatically when lobby is full
  - Optional fallback: on quick-lobby timeout, fill with bots and start (`quickStartOnTimeoutFillBots` in `balance.json`)

## Lobby UX v2

- Lobby ready-check (`READY_LOBBY`) with auto-start when all ready
- Admin kick control (`KICK_PLAYER`) in lobby phase
- Open lobby listing endpoint:
  - `GET /lobbies`
- Join a specific open lobby:
  - `JOIN_LOBBY`
- Quick-match buckets by `region` and `mmr` bands (low/mid/high)

## Telemetry / Presence v1

- Admin lobby presence:
  - `GET /admin/lobbies`
  - Supports filters: `?phase=LOBBY&region=EU&visibility=public|private|all`
  - Detail endpoint: `GET /admin/lobbies/:matchId?events=100`
  - SSE stream endpoint: `GET /admin/lobbies/:matchId/events/stream?from=0&snapshotEvents=50`
  - Includes phase, ready count, bots, connected humans, region/mmr bucket, lifecycle timestamps
- Admin metrics:
  - `GET /admin/metrics`
  - Includes active/finished match counts, open lobby counts, start reason distribution, average queue fill time

## Admin UI Panel

- Available at `/admin` (separate client view):
  - Metrics cards (auto-refresh)
  - Filterable admin lobby list
  - Lobby detail inspector
  - Live SSE event feed for selected lobby
- Game client remains at `/`

## Admin Auth (Cookie Session)

- Admin endpoints now require authentication via secure HTTP cookie session.
- Login endpoints:
  - `POST /auth/admin/login` with `{ "username": "...", "password": "..." }`
  - `POST /auth/admin/logout`
  - `GET /auth/admin/status`
- Environment variables:
  - `ADMIN_USERNAME` (default: `admin`)
  - `ADMIN_PASSWORD` (default: `change-me`, change this immediately)
  - `PLAYER_SESSION_SECRET` (required in production; signs player identity session cookies)