# Runebrawl Asset Style Guide (Placeholder -> Production)

This guide defines how to create and replace UI/game icons safely.

## Goals

- Keep placeholder assets consistent while gameplay is evolving.
- Make replacement with final art trivial (same names, same slots).
- Avoid layout regressions when art changes.

## Folder Structure

- `apps/client/src/assets/optimized/icons/role-*.svg`
- `apps/client/src/assets/optimized/icons/ability-*.svg`

Current icon sets:
- Roles: `role-tank.svg`, `role-melee.svg`, `role-ranged.svg`, `role-support.svg`
- Abilities: `ability-none.svg`, `ability-taunt.svg`, `ability-death-burst.svg`, `ability-bloodlust.svg`, `ability-lifesteal.svg`

## Naming Rules

- Use lowercase kebab-case.
- Prefix by category:
  - `role-<name>.svg`
  - `ability-<name>.svg`
- Never rename an existing file unless you also update imports in `GameClient.vue`.

## Technical Specs

- Format: SVG only (preferred for fast iteration and sharp rendering).
- Viewbox: `0 0 24 24` for small UI chips.
- Visual style:
  - clear silhouette
  - high contrast
  - minimal details
- Keep icon readability at 12px and 16px, because chips use both sizes.

## Color Guidance (Placeholder Stage)

- Role icons:
  - Tank: blue family
  - Melee: red/orange family
  - Ranged: green family
  - Support: yellow/light family
- Ability icons:
  - Taunt: purple/blue
  - Death Burst: red/orange
  - Bloodlust: crimson
  - Lifesteal: teal/green

## Replacement Workflow

1. Keep the same filename.
2. Replace SVG content only.
3. Run:
   - `npm run typecheck -w @runebrawl/client`
   - `npm run build -w @runebrawl/client`
4. Verify in UI:
   - Shop card chips
   - Board/bench meta chips
   - Light and dark contrast on current theme

## Do / Don't

Do:
- keep icons simple and symbolic
- keep stroke widths consistent
- test at chip sizes before commit

Don't:
- use raster images for these chips
- introduce huge SVGs with unnecessary metadata
- rely on text inside icons
