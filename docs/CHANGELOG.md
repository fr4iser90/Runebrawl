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
- Incremental architecture evolution started:
  - Added server-side `GameEvent` layer (`apps/server/src/rules/events.ts`)
  - Added effect registry (`apps/server/src/rules/effectRegistry.ts`)
  - Migrated passive hero gold bonus to `GAIN_GOLD` effect
  - Migrated attack damage exchange to `ATTACK_HIT` + `RESOLVE_ATTACK_HIT` effect path
  - Migrated combat `BLOODLUST` on-kill handling to registry effect path
  - Migrated combat `DEATH_BURST` death-trigger handling to registry effect path
  - Added `on-hit` combat extension hook (`applyOnHitEffects`) for future ability routing
  - Added first concrete on-hit ability via registry: `LIFESTEAL_ON_HIT`
  - Added new unit `Soul Reaver` with `LIFESTEAL` ability in unit pool
  - Added server combat integrity assertion to enforce `abilityKey` on `ABILITY_TRIGGERED` events
- Placeholder presentation pass:
  - Added local SVG role/ability icons under `apps/client/src/assets/icons/`
  - Replaced emoji-based chips with icon-backed metadata in shop and board/bench UI
  - Added icon asset style guide (`apps/client/src/assets/STYLE_GUIDE.md`)
  - Updated `docs/ASSETS.md` with the placeholder-to-production asset pipeline
  - Combat log hints now map ability explanations via event metadata (`abilityKey`) instead of text parsing

### Infrastructure/Operations Status

- Matchmaking and lobby flows include quick queue, private lobbies, ready/force-start rules, and reconnect support.
- Admin stack includes cookie-authenticated endpoints, lobby detail/filters, metrics, and SSE event streaming.

---

## Changelog Update Rule

When adding new features or significant behavior changes:

1. Add a new date section (`YYYY-MM-DD`).
2. Use categories: `Added`, `Improved`, `Fixed`, `Changed`, `Removed` as needed.
3. Keep entries short and concrete (what changed and where).
