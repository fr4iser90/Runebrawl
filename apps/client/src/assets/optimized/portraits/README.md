## Portrait Asset Slots

Drop portraits here:

- Units: `apps/client/src/assets/portraits/units/unit_<unitId>.webp`
- Heroes: `apps/client/src/assets/portraits/heroes/hero_<heroId>.webp`

Optional **generic portrait backplates** (4:5 plates, see `docs/ART_PROMPTS.md` §13):

- Unit plates: `apps/client/src/assets/portraits/backplates/units/portrait_bg_unit_<key>.webp`
- Hero plates: `apps/client/src/assets/portraits/backplates/heroes/portrait_bg_hero_<key>.webp`

Those are for compositing in art tools (or future runtime); the game still loads `unit_*` / `hero_*` for display until you bake a plate into each portrait export.

Examples:

- `unit_alley_blade.webp`
- `hero_warchief.webp`

Notes:

- The loader auto-falls back to `unit-placeholder.svg` / `hero-placeholder.svg`.
- Supported formats: `png`, `webp`, `jpg`, `jpeg`, `svg`.
