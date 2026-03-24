# Runebrawl - Game Design Document (GDD)

## 1) Project Overview

### Working Title
- `Runebrawl`

### Elevator Pitch
Runebrawl is a browser-based multiplayer autobattler inspired by genre-defining games such as Hearthstone Battlegrounds.  
Players buy units from a tavern/shop, position them on the battlefield, and combat resolves automatically.

### Core Rules Identity
- No hand cards
- No deck
- No draw mechanics
- Focus on economy, unit composition, positioning, and timing of upgrades

### Genre and Scope
- Multiplayer autobattler
- Round-based progression
- Server-authoritative competitive gameplay

---

## 2) Match Structure

### Round Phases (granular)

1. `StartOfRoundPhase`       # Preparation: distribute base gold/XP, generate or refresh shop, carry over units from previous round
                             # Trigger Hooks: onRoundStart, onShopRefresh, onPlayerXPUpdate

2. `BuyPhaseBegin`           # Beginning of buy phase
                             # Trigger Hooks: onBuyPhaseStart
                             # Player actions allowed:
                             #   - Buy units from tavern/shop
                             #   - Manage bench
                             #   - Refresh shop
                             #   - Upgrade tavern tier

3. `PositioningPhase`        # Player positions units on battlefield
                             # Trigger Hooks: onPositioningStart, onUnitMoved
                             # Note: Positioning is part of the Buy Phase in HS Battlegrounds

4. `BuyPhaseEnd`             # End of buy phase
                             # Trigger Hooks: onBuyPhaseEnd
                             # Finalize all purchases and positions before combat

5. `CombatPhase` (automatic) # Automatic combat
                             # Trigger Hooks: onCombatStart, onAttack, onDeath, onCombatEnd
                             # Units attack automatically, abilities trigger (buffs, deathrattles, auras)
                             # Damage is calculated and applied, winner determined

6. `RoundEndPhase`           # End-of-round evaluation
                             # Trigger Hooks: onRoundEnd
                             # Apply damage to players based on surviving units
                             # Update health, rewards
                             # Reset buffs, remove dead units
                             # Prepare state for next round

### Phase Details

#### Tavern / Shop Phase
- Player sees a shop offering units.
- Player spends gold to buy units.
- Player can refresh shop (reroll).
- Player can upgrade tavern tier (unlock stronger unit pool).
- Bought units go to bench and/or battlefield depending on free slots.

#### Positioning Phase
- Player arranges units on battlefield slots.
- Formation affects combat outcome (frontline/backline logic).
- Drag-and-drop interaction (or click-to-move fallback on mobile).

#### Combat Phase
- Player actions are disabled (spectator mode for own fight).
- Units act automatically based on combat rules.
- Attacks, abilities, deaths, and buffs resolve automatically.
- Winner is the side with units remaining.

#### Upgrade / Next Round
- Players gain base gold and progression rewards.
- Shop refreshes for next round.
- Defeated players lose health; elimination when health reaches 0.

---

## 3) Units and Stats

### Unit Archetypes (MVP)
- `Tank`
- `Melee`
- `Ranged`
- `Support`

### Core Stats
- `hp`
- `attack`
- `speed` (or initiative)
- `ability` (passive/triggered/special)

### Unit Progression
- Buying duplicate copies of the same unit merges toward level up.
- Example rule (configurable): 3 copies -> upgraded unit.
- Upgraded units gain improved stats and/or stronger ability values.

---

## 4) Abilities and Triggers

### Initial Trigger Set
- `onCombatStart`
- `onAttack`
- `onHit`
- `onDeath` (deathrattle-style)
- `onKill`
- `aura` (continuous effect)

### Ability Principles
- Data-driven definition plus reusable effect modules
- Deterministic execution order
- Full event log for replay/debug

---

## 5) Game Modes

### Core Modes
- `1v1v1v1` (small FFA)
- `8-player Free-for-All` (primary target mode)

### Optional / Future Modes
- Duos / team-based mode
- Ranked ladder
- Custom lobbies with private rules

---

## 6) Win Conditions

### Match Victory
- Last surviving player wins.

### Round Outcomes
- Win round: survive with remaining units and deal damage to opponent.
- Lose round: take damage based on round/tier/surviving enemy units.

---

## 7) UX and Interface Design

### Layout
- Top: Tavern/Shop panel
- Bottom: Battlefield and bench
- Side/overlay: Gold, round, tavern tier, player health, combat log

### UX Requirements
- Fast buy/sell/reroll actions
- Clear affordability and upgrade indicators
- Clear positioning affordances (slot highlights)
- Simple combat animations, readable damage/heal feedback
- No active user interaction required during combat

---

## 8) Balance and Content Strategy

- Units are data-first (JSON/DB entries)
- Ability effects use modular handlers (buff, taunt, summon, deathrattle, etc.)
- Tavern tiers gate power progression
- Balance via data patches rather than engine rewrites

---

## 9) Non-Goals (Initial Scope)

- Hand/deck/draw gameplay systems
- Manual actions during combat
- Highly cinematic VFX pipeline at MVP

---

## 10) Inspiration and IP Note

- Runebrawl is an original game project.
- Any referenced game titles are used only as genre/inspiration context.
- All trademarks and game titles belong to their respective owners.

