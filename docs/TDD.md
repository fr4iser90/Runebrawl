# Runebrawl - Technical Design Document (TDD)

## 1) Architecture Overview

Runebrawl uses a **server-authoritative multiplayer architecture**:
- Client sends intents (`BuyUnit`, `RerollShop`, `PlaceUnit`, `LockShop`, etc.)
- Server validates and applies all game rules
- Server runs combat simulation and broadcasts results/events

This prevents desync and cheating while keeping simulation deterministic.

## 2) Suggested Stack

### Frontend
- `Vue 3` + `TypeScript`
- State management: `Pinia`
- UI modules:
  - tavern/shop
  - battlefield + bench
  - player board/status
  - round timer
  - combat log

### Backend
- `Node.js` + `TypeScript`
- Framework: `Fastify` (or `Express`)
- Real-time transport: `WebSocket`

### Database
- `PostgreSQL`
- Optional `Redis` for pub/sub or short-lived session caching

---

## 3) Core Backend Modules

- `Matchmaking Service`
  - Queue management
  - Lobby assembly (up to 8 players)
- `Match Service`
  - Round lifecycle and player elimination
- `Economy Service`
  - Gold gain/spend rules
  - Tavern tier upgrade cost/progression
- `Shop Service`
  - Unit pool rolls, rerolls, lock/freeze behavior
- `Board Service`
  - Bench + battlefield slot management
  - Position validation and swaps
- `Combat Engine`
  - Automatic battle simulation
  - Ability trigger execution
- `Persistence Service`
  - Snapshots, event logs, match history

---

## 4) Data Model (Conceptual)

### Core Tables
- `units`
  - `id`, `name`, `type`, `base_hp`, `base_attack`, `base_speed`, `ability_key`, `tier`
- `unit_levels`
  - `unit_id`, `level`, `hp`, `attack`, `speed`, `ability_scale`
- `players`
  - `id`, `display_name`, `mmr`, `created_at`
- `matches`
  - `id`, `status`, `round`, `winner_player_id`, `created_at`, `ended_at`
- `match_players`
  - `match_id`, `player_id`, `health`, `gold`, `tavern_tier`, `is_eliminated`
- `match_boards`
  - `match_id`, `player_id`, `bench_state_json`, `battlefield_state_json`, `shop_state_json`
- `match_events`
  - `id`, `match_id`, `round`, `event_type`, `payload_json`, `created_at`

### Unit Definition (Example JSON)
```json
{
  "id": "unit_iron_guard",
  "name": "Iron Guard",
  "type": "Tank",
  "tier": 2,
  "stats": { "hp": 18, "attack": 4, "speed": 3 },
  "ability": {
    "key": "taunt_aura",
    "trigger": "aura",
    "params": { "radius": 1, "armor_bonus": 1 }
  },
  "upgradeRule": { "copiesRequired": 3 }
}
```

---

## 5) Runtime State Model

### Match State
- `matchId`
- `round`
- `phase` (`TavernPhase`, `PositioningPhase`, `CombatPhase`, `RoundEnd`)
- `players[]`
- `pairings[]` (who fights whom this round)
- `rngSeed`
- `sequence`

### Player Runtime State
- `playerId`
- `health`
- `gold`
- `xp`
- `tavernTier`
- `shopUnits[]`
- `bench[]`
- `battlefield[]`
- `lockedShop` (freeze)

---

## 6) Client Intents and Domain Events

### Client -> Server Intents
- `BuyUnit`
- `SellUnit`
- `RerollShop`
- `LockShop`
- `UnlockShop`
- `UpgradeTavern`
- `MoveUnit` (bench <-> board, slot swaps)
- `ReadyForCombat`
- `Concede`

### Server Events
- `GoldUpdated`
- `ShopUpdated`
- `UnitPurchased`
- `UnitMerged`
- `BoardUpdated`
- `RoundStarted`
- `CombatStarted`
- `CombatEvent` (attack, damage, buff, death, summon)
- `CombatResolved`
- `PlayerDamaged`
- `PlayerEliminated`
- `MatchEnded`

---

## 7) Combat Engine Design

### Responsibilities
- Resolve combat automatically with no player input
- Execute deterministic action order based on speed and tie-break rules
- Apply abilities and triggers (`onCombatStart`, `onAttack`, `onDeath`, `aura`, etc.)

### Determinism Rules
- Server-owned random seed per match/round
- Stable ordering for simultaneous effects
- Explicit tie-break keys (`speed`, `slotIndex`, `spawnOrder`)

### Isolation Boundary
- Combat engine only consumes snapshots and emits combat events/results
- No direct DB access from combat engine (pure simulation layer)

---

## 8) Networking and Sync

### WebSocket Envelope
- `type`
- `matchId`
- `clientActionId`
- `payload`
- `sequence`
- `serverTimestamp`

### Reconnect Strategy
- Client reconnects with `matchId` + last known `sequence`
- Server sends:
  1. Current snapshot
  2. Missed events from sequence+1

### Anti-cheat
- Client never mutates authoritative state
- Server validates every economic and positioning action
- Combat is always simulated server-side

---

## 9) Modularity and Extensibility

### Unit System
- Units are data-driven and loaded from DB/JSON
- New units should be content-only in most cases

### Ability System
- Abilities use a registry/factory:
  - trigger parser
  - condition evaluator
  - effect executor

### Shop/Tavern Module
- Isolated service for roll probabilities and tier pools
- Swappable strategy for future shop designs

---

## 10) Testing Strategy

### Unit Tests
- Economy calculations
- Shop roll logic
- Unit merge/level-up rules
- Ability handlers

### Integration Tests
- Full round flow (`Tavern -> Positioning -> Combat -> RoundEnd`)
- 8-player elimination progression
- Reconnect and event replay

### Simulation Tests
- Deterministic combat test suites with fixed seeds
- Regression snapshots for known battle scenarios

---

## 11) Deployment and Operations

### Initial Deployment
- Frontend: static hosting
- Backend: containerized Node service
- PostgreSQL: managed instance

### CI/CD Baseline
- Lint + typecheck + tests on PR
- Build and deploy on main
- Schema migrations versioned and repeatable

