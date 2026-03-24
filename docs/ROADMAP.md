# Runebrawl - Roadmap

## Guiding Principle
Ship a playable multiplayer autobattler first, then scale content and modes without rewriting core systems.

## Milestone 0 - Foundation (Week 1-2)
- Monorepo/app scaffolding (frontend + backend + shared types)
- Initial DB schema (`units`, `players`, `matches`, `match_events`)
- WebSocket session lifecycle
- Round/phase state model
- Basic logging and replayable event stream

## Milestone 1 - MVP Autobattler (Week 3-6)
- Mode: small FFA (`1v1v1v1`)
- Tavern/shop with buy, reroll, lock
- Gold economy baseline
- Bench + battlefield slots with drag/drop positioning
- Auto-combat engine v1 (attack order + death + simple abilities)
- Unit merging/level-up (duplicate copies)
- Basic UI layout:
  - top tavern
  - bottom battlefield/bench
  - side status panel (gold, round, level, health)

## Milestone 2 - Core Expansion (Week 7-10)
- Expand unit pool (~30-50 units)
- Tavern tier upgrades and tiered unit pools
- Ability modules: taunt, deathrattle, buff aura, summon
- Combat readability improvements (animations + log detail)
- Reconnect and snapshot recovery
- Match history screen

## Milestone 3 - Full FFA Target (Week 11-14)
- 8-player Free-for-All matchmaking
- Round pairings and elimination flow hardening
- Balance tooling (unit stats and roll rates config)
- Performance optimization for concurrent combats
- Spectator/replay baseline for finished rounds

## Milestone 4 - Feature Maturity (Week 15+)
- Ranked queue + MMR
- Duo/team variant prototype
- Better progression (profile, cosmetics, seasonal reset)
- Admin balancing tools and telemetry dashboards
- Scalability improvements and live-ops pipeline

## Backlog / Optional
- Mobile/PWA packaging
- Friendly custom lobbies with mutators
- Tournament tools
- Rich VFX pass for combat clarity

## Definition of Done (per milestone)
- End-to-end playable flow in target mode
- Tests for new economy/combat/ability paths
- Telemetry and error logging for new systems
- Documentation updated in `docs/`

