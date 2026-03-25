# Runebrawl Asset Notes

## Placeholder-First Workflow

Use placeholders during gameplay iteration:
- Units/icons as simple symbols
- Shop cards and slots as clean UI blocks
- Basic VFX via CSS only

Benefit:
- Faster balancing and UX iteration
- No expensive art rework while rules are still changing

## Current Asset Guide

Detailed technical guide for icon assets:
- `apps/client/src/assets/STYLE_GUIDE.md`

This includes:
- naming conventions
- SVG sizing rules
- replacement workflow
- role/ability color guidance

## Iterative Content Pipeline

1. Gameplay + readability first
2. Placeholder icon pass
3. Stabilize mechanics and UX
4. Replace placeholders with final icon set
5. Add richer unit portraits/VFX/audio after core loop is stable

## Where files live (plug-and-play overview)

You do **not** need to move existing assets for the current build. Use this map when adding content.

### Game data (units, heroes, balance)

| What | Where |
| --- | --- |
| Live unit/hero rows (bundled with server) | `apps/server/src/data/units.json`, `heroes.json` |
| Economy / timers / tier odds | `apps/server/src/data/balance.json` |
| Content manifest (themes, scene background filenames) | `packages/game-content/src/manifest.json` |
| Community pack template (PR flow) | `community/content-pack-template/` |

Process for **external/community** packs: `docs/COMMUNITY_CONTENT_PIPELINE.md` and root `CONTRIBUTING.md`.

### Client art

| What | Where |
| --- | --- |
| Unit portraits | `apps/client/src/assets/portraits/units/unit_<unitId>.webp` (see `docs/ART_PROMPTS.md`) |
| Hero portraits | `apps/client/src/assets/portraits/heroes/hero_<heroId>.webp` |
| Scene backgrounds (any theme) | `apps/client/src/assets/backgrounds/<filename>.svg` or `.webp` |
| Role / ability icons | `apps/client/src/assets/icons/` |
| Scene ornaments | `apps/client/src/assets/backgrounds/ornament-*.svg` |

**Themes:** Drop new background files into `apps/client/src/assets/backgrounds/`, then reference **only the filename** under each theme in `packages/game-content/src/manifest.json`. The client resolves them at build time via glob. In-game selection: Settings → Scene theme.

### New units/heroes (minimal checklist)

1. Add row to `units.json` / `heroes.json` (stable `id`, snake_case).
2. Add portrait file matching the naming above (optional: placeholder until art exists).
3. If the unit uses a **new** `ability` / `powerKey` / `tag`, you still need matching **server code** and often `packages/shared` types — not JSON-only today. See `docs/SYNERGY_SYSTEM.md` and server `effectRegistry` / combat wiring.
4. For community contribution, use the template under `community/` and follow `CONTRIBUTING.md`.