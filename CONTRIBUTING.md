# Contributing to Runebrawl

Thanks for helping build Runebrawl.

This project is moving toward a community-driven content model. You can contribute:

- Units
- Heroes
- Synergies / tags
- Mechanics and balance proposals
- Art (portraits, icons, VFX placeholders)
- Tests and docs

## Project Direction

Runebrawl is an autobattler (Battlegrounds-like), not a card draw/deckbuilding game.

- Use "units/heroes/synergies/mechanics" terminology
- Avoid introducing deck/hand/draw systems in content proposals

## Quick Start

1. Fork and clone repository
2. Install dependencies: `npm install`
3. Copy env: `cp .env.example .env`
4. Start dev: `npm run dev`
5. Run checks:
   - `npm run typecheck`
   - `npm run test -w @runebrawl/server`
   - `npm run validate:community-content`

## Content Contribution Flow (v1)

Use the template under `community/content-pack-template/`:

1. Copy folder to `community/submissions/<your-pack-name>/`
2. Fill `metadata.json`
3. Add/adjust `units.json`, `heroes.json`, optional notes
4. Include balancing rationale and test notes in `playtest-notes.md`
5. Open PR and use the PR template checklist

For full details, read `docs/COMMUNITY_CONTENT_PIPELINE.md`.

## Rules for Content PRs

- Keep IDs stable and lowercase snake_case
- Keep changes scoped (small coherent packs)
- Include "why" and expected gameplay impact
- Add or update tests when changing mechanics
- Do not commit secrets (`.env`, credentials)

## Art Contribution Rules

- Portrait naming:
  - `apps/client/src/assets/portraits/units/unit_<unitId>.webp`
  - `apps/client/src/assets/portraits/heroes/hero_<heroId>.webp`
- Use specs in:
  - `docs/ART_PROMPTS.md`
  - `docs/ASSETS.md`

## Pull Request Checklist (minimum)

- [ ] Scope is clear and small enough to review
- [ ] Data IDs and formats are valid
- [ ] Typecheck/tests pass locally
- [ ] Community content validation passes locally (`npm run validate:community-content`)
- [ ] Docs/changelog updated when behavior changed
- [ ] No unrelated files touched

