## Portrait assets (optimized)

Runtime portraits live here (WebP/SVG). The Vue loader is `loader.ts` in this folder.

- Units: `apps/client/src/assets/optimized/portraits/units/unit_<unitId>.webp`
- Heroes: `apps/client/src/assets/optimized/portraits/heroes/hero_<heroId>.webp`

Optional generic backplates (see `docs/ART_PROMPTS.md` §13):

- `optimized/portraits/backplates/units/portrait_bg_unit_<key>.webp`
- `optimized/portraits/backplates/heroes/portrait_bg_hero_<key>.webp`

Source PNG/TIFF: `apps/client/src/assets/raw/portraits/...` → run `npm run assets:optimize` from repo root (inside `nix-shell`).
