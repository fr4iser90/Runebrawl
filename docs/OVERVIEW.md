# Runebrawl - Current Project Overview

This document summarizes what is already implemented in the project right now.

## Product Snapshot

Runebrawl is a browser-based, server-authoritative multiplayer autobattler.

Core identity:
- No hand cards
- No deckbuilding during matches
- No draw mechanics
- Players buy units in a tavern/shop, position them, then watch automatic combat

## Implemented Gameplay Flow

The current round/game flow is implemented with explicit phases:
- `LOBBY`
- `HERO_SELECTION`
- `TAVERN`
- `POSITIONING`
- `COMBAT`
- `ROUND_END`
- `FINISHED`

### Hero System v1

- Hero pool is data-driven (`apps/server/src/data/heroes.json`)
- Each player gets 3 random hero options before round 1
- Hero selection is required (timeout fallback auto-picks)
- Passive and active hero powers are supported
- Active powers consume gold and are limited per tavern phase

### Unit + Economy Systems

- Data-driven unit pool (`apps/server/src/data/units.json`)
- Shop buy/reroll/lock flow
- Tavern tier upgrades and XP progression
- Unit placement between bench and board
- Unit merge/level-up behavior for duplicates

## Multiplayer + Matchmaking

- WebSocket real-time game protocol
- Multiple matches in parallel
- Quick match queue (`QUICK_MATCH`)
- Private lobbies with invite codes (`CREATE_PRIVATE_MATCH`, `JOIN_PRIVATE_MATCH`)
- Join open public lobby by `matchId` (`JOIN_LOBBY`)
- Reconnect and state recovery (`RECONNECT`)

### Lobby Rules

- Private lobbies: start only when all players are ready and leader triggers force start
- Quick lobbies: start when full
- Optional quick timeout fallback to fill with bots and start (`quickStartOnTimeoutFillBots`)

### Lobby Controls

- Ready toggle in lobby (`READY_LOBBY`)
- Add bot (`ADD_BOT_TO_LOBBY`)
- Kick player (`KICK_PLAYER`)
- Force start (private leader) (`FORCE_START`)

## Combat + Replay

### Backend Combat

- Deterministic seeded combat simulation
- Initiative/speed-based turn order
- Targeting rules (taunt priority, frontline preference for melee/tank)
- Ability hooks (`DEATH_BURST`, `BLOODLUST`, `TAUNT`)

### Combat Events v2

- Backend emits structured combat replay events per duel
- Event types:
  - `ATTACK`
  - `UNIT_DIED`
  - `ABILITY_TRIGGERED`
  - `DUEL_RESULT`
- Events include duel context, owner side (`A`/`B`), slot indices, unit names, and message

### Client Combat View (MVP Visuals)

- Automatic switch to combat view
- Event-driven replay sequence (not regex parsing)
- Slot highlight for attacker/defender
- HP bar updates per event
- Floating damage numbers per hit
- Death fade on `UNIT_DIED`

## Admin + Operations

### Admin API

- Lobby snapshots with filters (`GET /admin/lobbies`)
- Lobby detail (`GET /admin/lobbies/:matchId`)
- Lobby SSE event stream (`GET /admin/lobbies/:matchId/events/stream`)
- Metrics endpoint (`GET /admin/metrics`)

### Admin UI

- Dedicated `/admin` view
- Metrics cards and lobby list
- Lobby detail inspector
- Live SSE event feed

### Admin Authentication

- Cookie-based admin session auth
- Endpoints:
  - `POST /auth/admin/login`
  - `POST /auth/admin/logout`
  - `GET /auth/admin/status`

## Architecture + Repository

- Monorepo with workspaces:
  - `apps/client` (Vue 3 + TypeScript + Vite)
  - `apps/server` (Fastify + WebSocket + TypeScript)
  - `packages/shared` (shared protocol/types)
- PostgreSQL scaffold via `docker-compose.yml` and SQL migrations
- Server-authoritative design for anti-desync and rule consistency

## Data-Driven Configuration

- Balance config: `apps/server/src/data/balance.json`
- Unit config: `apps/server/src/data/units.json`
- Hero config: `apps/server/src/data/heroes.json`

## Current MVP Boundaries

Current implementation is already playable and testable as an MVP, but still intentionally simple:
- Basic visual combat replay (not full production animation system)
- No long-term progression/economy meta yet (ranked seasons, cosmetics, etc.)
- Hero power targeting is still mostly simple/random in v1

## Suggested Next Steps

1. Combat visuals v3 (projectiles, hit timing curves, death cleanup timing, sound hooks)
2. Hero system v2 (targeted powers, more hero identities, balancing tools)
3. Match persistence and full replay storage to database
4. Spectator mode and observer APIs
5. Automated integration tests for full match lifecycle
