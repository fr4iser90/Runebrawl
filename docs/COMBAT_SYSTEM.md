# Runebrawl Combat System

This document explains how combat works end-to-end in Runebrawl:
- server simulation rules
- event generation
- client replay/animation mapping
- extension points for new mechanics

## 1) Design Goals

- **Server authoritative**: combat outcome is decided only on server.
- **Deterministic simulation**: seeded RNG for reproducible behavior.
- **Replay-driven client**: client visualizes combat from server events.
- **Incremental extensibility**: effects routed through event + registry paths.

## 2) High-Level Flow

1. Match enters `COMBAT` phase in `MatchInstance`.
2. Alive players are paired into duels.
3. Each duel runs `simulateCombat(teamA, teamB, seed)` on server.
4. Duel result returns:
   - winner / survivors
   - combat log lines
   - structured combat step events
5. Server applies round damage to losing player (or draw = no damage).
6. Server broadcasts state with:
   - `combatLog`
   - `combatEvents`
7. Client plays event queue with phase-timed animation mapping.

## 3) Server Combat Simulation

Main file:
- `apps/server/src/engine/combat.ts`

Core concepts:
- `CombatUnit`: runtime unit representation (`alive`, `nextActionAt`, owner, slot).
- **initiative model**: each unit acts when `nextActionAt` is reached.
- **tie-breaking**: speed, slot index, owner fallback.
- **iteration safety cap**: max loop iterations to prevent infinite loops.

### Target Selection

Targeting rules:
1. Prefer living enemies with `TAUNT`.
2. If attacker is `Melee` or `Tank`, prefer frontline targets (slot `< 3`).
3. Otherwise choose random living enemy.

### Attack Resolution

Combat uses an explicit event:
- `ATTACK_HIT` (`GameEvent`)

Damage exchange path:
1. attacker and defender selected
2. attack message event emitted (`ATTACK`)
3. `ATTACK_HIT` sent through `RESOLVE_ATTACK_HIT` effect
4. HP is mutated by effect handler (not direct inline damage code)

## 4) Ability Handling (Current)

Ability effects are processed through registry effects in:
- `apps/server/src/rules/effectRegistry.ts`

Implemented ability paths:
- `BLOODLUST`:
  - trigger: on kill
  - effect: `BLOODLUST_ON_KILL` (+1 attack, +1 hp/maxHp)
- `DEATH_BURST`:
  - trigger: on death
  - effect: `DEATH_BURST_ON_DEATH` (2 damage to random enemy)
- `LIFESTEAL`:
  - trigger: on hit
  - effect: `LIFESTEAL_ON_HIT` (heal based on dealt damage)
- Hero passive `BONUS_GOLD`:
  - effect: `GAIN_GOLD` in tavern round-start flow

## 5) Event Contracts

### Engine-Level Events

- `GameEvent` lives in `apps/server/src/rules/events.ts`
- current types include:
  - `ROUND_START`
  - `ATTACK_HIT`
  - `UNIT_DIED`

### Replay Events (Client-Facing)

`CombatReplayEvent` (shared contract) includes:
- `type`:
  - `ATTACK`
  - `UNIT_DIED`
  - `ABILITY_TRIGGERED`
  - `DUEL_RESULT`
- source/target metadata (owner, slot, unit name)
- `abilityKey` for `ABILITY_TRIGGERED`
- message text

Definition:
- `packages/shared/src/index.ts`

## 6) Integrity Guards

To keep event contracts safe:
- `ABILITY_TRIGGERED` events are pushed via a dedicated helper.
- Server asserts that every `ABILITY_TRIGGERED` has `abilityKey`.
- Simulation throws if contract is violated.

This prevents client hint and UI mapping drift.

## 7) Client Replay & Animation Mapping

Main file:
- `apps/client/src/components/GameClient.vue`

Client does not decide outcomes. It only replays.

Current playback model:
- sequential queue runner (not simple fixed interval)
- per-event animation phases with explicit durations

Current mapping:
- `ATTACK`: `WINDUP` -> `HIT` -> `RECOVER`
- `ABILITY_TRIGGERED`: `ABILITY`
- `UNIT_DIED`: `DEATH` -> `CLEANUP`
- `DUEL_RESULT`: `RESULT`

Visual layers:
- attacker/target highlights
- target line overlay (`source -> target`)
- damage numbers
- death fade
- replay phase label in active combat line

## 8) Extension Pattern (How to Add Mechanics)

When adding new combat mechanics:

1. Add trigger source in combat flow (`on hit`, `on death`, etc.).
2. Emit/route through a `GameEvent`.
3. Implement effect handler in `effectRegistry.ts`.
4. Emit `ABILITY_TRIGGERED` with `abilityKey`.
5. (Optional) add client hint/tooltip text for new ability key.

Keep this rule:
- prefer effect registry over inline mutation logic.

## 9) Known Limitations (Current MVP)

- Combat pairing is simple and not yet advanced matchmaking-aware.
- Client visuals are still lightweight (no projectile trajectories yet).
- Some non-combat systems remain partially legacy (not fully registry-driven).
- Ability interactions are intentionally limited for stability while iterating.

## 10) Debugging Checklist

When combat looks wrong:

1. Confirm server `combatEvents` order.
2. Verify `abilityKey` exists for `ABILITY_TRIGGERED`.
3. Check source/target owner + slot metadata.
4. Compare combat log line vs event message.
5. Re-run same seed scenario to confirm deterministic behavior.

## 11) Key Files

- Server simulation: `apps/server/src/engine/combat.ts`
- Effect registry: `apps/server/src/rules/effectRegistry.ts`
- Event types: `apps/server/src/rules/events.ts`
- Match integration: `apps/server/src/matchInstance.ts`
- Shared replay contract: `packages/shared/src/index.ts`
- Client replay/animation: `apps/client/src/components/GameClient.vue`
