# Runebrawl Changelog

All notable project changes are documented in this file.

## 2026-03-24

### Added

- Hero System v1:
  - New `HERO_SELECTION` phase before round 1
  - Data-driven hero pool (`apps/server/src/data/heroes.json`)
  - Three random hero options per player
  - Hero selection intent and hero power intent support
  - Passive and active hero powers integrated into tavern flow
- Combat replay improvements:
  - Structured combat events (`ATTACK`, `UNIT_DIED`, `ABILITY_TRIGGERED`, `DUEL_RESULT`)
  - `combatEvents` included in match public state
  - Event-driven client combat replay
  - Visual combat updates: HP bars, floating damage numbers, death fade
- Documentation:
  - Added `docs/OVERVIEW.md` with current implementation status

### Improved

- Client combat view now uses structured event metadata (owner side, slot index, unit identity) instead of log parsing.
- Hero and combat systems are more data-driven and easier to evolve without protocol breakage.

### Infrastructure/Operations Status

- Matchmaking and lobby flows include quick queue, private lobbies, ready/force-start rules, and reconnect support.
- Admin stack includes cookie-authenticated endpoints, lobby detail/filters, metrics, and SSE event streaming.

---

## Changelog Update Rule

When adding new features or significant behavior changes:

1. Add a new date section (`YYYY-MM-DD`).
2. Use categories: `Added`, `Improved`, `Fixed`, `Changed`, `Removed` as needed.
3. Keep entries short and concrete (what changed and where).
