# Runebrawl Synergy System (Light v1)

This document defines a minimal, low-risk first version of synergies.

Goal:
- add meaningful composition decisions quickly
- avoid large system complexity
- keep integration compatible with current event/effect architecture

## 1) Scope (v1)

Only one synergy in v1:
- `BERSERKER`

Activation rule:
- if a player has **3+ units** with `BERSERKER` tag on board

Effect (v1):
- on hit: berserker units gain `+2 attack` for this combat

Notes:
- v1 is intentionally simple and combat-only.
- no persistent buffs across rounds.

## 2) Data Model

Add optional tags to unit definitions:

```json
{
  "id": "some_unit",
  "name": "Some Unit",
  "tags": ["BERSERKER"]
}
```

Suggested shared type addition (later in implementation):
- `UnitDefinition.tags?: string[]`
- `UnitInstance.tags?: string[]` (or derive from definition at combat init)

## 3) Runtime Behavior

At duel start:
1. Count synergy tags on each player's board.
2. Mark active synergies for that combat (`Set<string>` or compact object).

During attack flow:
1. After `ATTACK_HIT` resolution, check if attacker has `BERSERKER`.
2. If attacker owner has active `BERSERKER` synergy:
   - apply effect `BERSERKER_ON_HIT_BUFF` (`+2 attack`)
   - emit `ABILITY_TRIGGERED` with a dedicated key/message for replay clarity.

## 4) Integration with Current Architecture

Use the existing pattern:
- Event -> Effect Registry -> Replay Event

Recommended implementation path:
1. Add synergy context to combat runtime (per side A/B).
2. Add effect handler in `effectRegistry.ts`:
   - `BERSERKER_ON_HIT_BUFF`
3. Route through `applyOnHitEffects(...)` in combat engine.
4. Emit replay metadata (`abilityKey` or `synergyKey`) for client hinting.

## 5) UI/Clarity Requirements (MVP)

In board/shop UI:
- show `BERSERKER` tag chip on tagged units

In combat replay:
- when buff triggers, show clear hint:
  - `Berserker synergy: +2 attack`

In player panel:
- optional mini indicator:
  - `Synergy: Berserker (active)`

## 6) Rules for v1 Simplicity

Keep v1 constrained:
- only one synergy
- only one threshold (`3+`)
- only one trigger (`on hit`)
- only one buff type (`+attack`)

Do not add in v1:
- multiple tiers (3/6)
- cross-round stacking
- multiple simultaneous synergy systems
- complex UI panel redesign

## 7) Test Checklist

1. 2 berserkers on board: no synergy trigger.
2. 3 berserkers on board: trigger appears on hit.
3. Buff affects subsequent attacks in same combat.
4. No carryover to next combat.
5. Replay event/hint is visible and correctly mapped.

## 8) Next Step (v2 after validation)

Only after playtest feedback confirms clarity/value:
- add second synergy family
- add tiered thresholds
- add compact synergy summary UI
