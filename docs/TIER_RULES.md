# Runebrawl Tier Ruleset (Practical)

This document defines a lightweight balance framework for designing units by tier while still allowing late-game exponential growth.

## Design Goals

- Keep early game readable and fair.
- Let higher tiers feel meaningfully stronger.
- Avoid runaway loops that remove counterplay.
- Make new unit design faster and more consistent.

## Tier Identity

- **Tier 1 (setup):** cheap tempo, board stabilizers, basic synergy starters.
- **Tier 2 (bridge):** upgrades on T1 patterns, first reliable archetype glue.
- **Tier 3 (core):** identity-defining units for each archetype.
- **Tier 4 (spike):** strong enablers and conditional carries.
- **Tier 5 (payoff):** high-impact win-condition pieces.
- **Tier 6 (capstone):** rare, explosive finishers with clear weaknesses.

## Baseline Stat Bands (Units)

Use these as default starting points before ability tuning:

- **T1:** ATK 1-3, HP 3-6, SPD 1-3
- **T2:** ATK 2-4, HP 5-8, SPD 1-3
- **T3:** ATK 3-6, HP 7-11, SPD 2-4
- **T4:** ATK 5-9, HP 10-16, SPD 2-4
- **T5:** ATK 8-14, HP 14-24, SPD 2-5
- **T6:** ATK 12-22, HP 20-36, SPD 3-6

## Ability Budget by Tier

- **T1:** single-purpose, low variance, no hard snowball.
- **T2-T3:** stronger utility or modest scaling triggers.
- **T4+:** major multipliers/payoffs allowed, but require setup.
- If ability power increases, reduce one baseline stat bucket.

## Exponential Growth Model (Allowed, Controlled)

Late tiers may use multiplicative scaling, but not for free:

- Prefer growth behind conditions (kills, rounds survived, synergies active).
- Add soft brakes:
  - trigger limits per combat/turn, or
  - diminishing returns after N stacks.
- Every exponential unit must have at least one practical counter:
  - burst race, control, taunt wall, anti-heal, speed punish, etc.

## Tier 1 Rules (Important)

- No unit should hard-carry entire combats alone.
- Avoid stacking multipliers at T1.
- Keep power mostly in baseline stats + simple effect.
- T1 should create options, not endgame outcomes.

## Quick Unit Review Checklist

Before adding a unit, verify:

- Tier identity is clear.
- Base stats are inside tier band (or justified).
- Ability budget fits tier.
- Counterplay exists.
- No infinite/near-infinite loop emerges with known synergies.

## Implementation Note

Use this as a balancing starting template, not a hard law. If a unit breaks the band, include a short reason in PR notes (what fantasy it serves, what downside compensates it, and expected counters).