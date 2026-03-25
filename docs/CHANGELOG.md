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
  - Added stat/player-type SVG icons (players, gold, health, human, bot) and wired them into game HUD/player list
  - Added event-to-animation mapping playback system in client combat view (phase-based timing: windup/hit/recover/death/result)
  - Added dedicated combat documentation (`docs/COMBAT_SYSTEM.md`)
  - Added minimal synergy design spec (`docs/SYNERGY_SYSTEM.md`) for first `BERSERKER` rollout
  - Implemented Synergy Light v1:
    - Added `BERSERKER` tags to selected units
    - Added combat synergy trigger (`3+ BERSERKER` on board)
    - Added `BERSERKER_ON_HIT_BUFF` effect (`+2 attack on hit`)
    - Added replay metadata (`synergyKey`) and client hint mapping for synergy triggers
    - Added synergy tag chips in shop and board/bench UI
  - Bot iteration improvements:
    - Added bot difficulty tiers (`EASY`, `NORMAL`, `HARD`)
    - Added smarter bot buying/reroll/upgrading heuristics
    - Added hero-power usage logic for bots
    - Added stronger board auto-placement for non-easy bots
  - Added server test foundation with Vitest (`@runebrawl/server`):
    - bot-logic unit tests
    - combat contract tests (synergy trigger + trigger metadata integrity)
  - Added playtest documentation:
    - `docs/PLAYTEST_CHECKLIST.md`
    - `docs/PLAYTEST_RESULTS.md`
  - Added Balance Telemetry v1 in `/admin/metrics`:
    - aggregate `unitBuys` counters
    - aggregate `synergyTriggers` counters
    - admin panel now shows top unit buys and top synergy trigger counts
    - unit buy telemetry now includes `unitName (unitId)` labeling in admin view
    - synergy telemetry now includes readable labels in admin view (e.g. `Berserker (3+)`)
    - admin metrics now also show readable match start reasons
    - admin lobby phase labels are now human-readable in filters and lists
  - Added client language system v1 (EN/DE):
    - global language switch in app header with localStorage persistence
    - shared i18n utility/composable (`apps/client/src/i18n/useI18n.ts`)
    - central translation dictionaries (`apps/client/src/i18n/messages.ts`)
    - translated key UI texts in game and admin panels
    - i18n v2 polish: localized animation phase labels, duel separator, HP short label, unknown fallback
    - browser language default now auto-selects German for `de-*` if no stored preference exists
    - i18n v3: WebSocket errors now include stable `errorCode`s and are translated client-side (EN/DE)
    - i18n v4: admin HTTP errors now include `errorCode`s and are translated in admin UI (EN/DE)
    - i18n v5: admin SSE feed lines and end reasons are now localized (including `match_not_found`)
    - added Admin Content Builder v1 (integrated): draft/save/validate/publish flow for units and heroes
    - publish now hot-swaps runtime unit/hero pools for new roll/shop/hero selection generation
    - content builder v1.1: added form editor mode (units/heroes) and draft diff preview before publish
    - content builder v1.2: added inline form validation (field highlighting + per-entity error list) and save/publish guard
    - content builder v1.3: localized builder UI/validation/status text (EN/DE)
    - builder locale cleanup: German strings now use consistent Einheiten/Helden terminology
    - added weighted content generation v1:
      - units now support `shopWeight`
      - heroes now support `offerWeight`
      - shop rolls now use tavern tier odds + weighted unit selection
      - hero selection options now use weighted picks without replacement
      - added shared per-match unit copy pool (shop draw consumes copies, reroll/refresh returns, sell/elimination returns)
    - added admin pool observability:
      - new endpoint `GET /admin/content/pool?matchId=<id>` for per-match pool snapshot
      - admin panel now shows live scarce-unit view (available/shop/board/bench/consumed)

### Infrastructure/Operations Status

- Matchmaking and lobby flows include quick queue, private lobbies, ready/force-start rules, and reconnect support.
- Admin stack includes cookie-authenticated endpoints, lobby detail/filters, metrics, and SSE event streaming.

---

## Changelog Update Rule

When adding new features or significant behavior changes:

1. Add a new date section (`YYYY-MM-DD`).
2. Use categories: `Added`, `Improved`, `Fixed`, `Changed`, `Removed` as needed.
3. Keep entries short and concrete (what changed and where).
