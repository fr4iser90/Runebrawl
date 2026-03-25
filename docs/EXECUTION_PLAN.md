# Runebrawl - Execution Plan (Next 2 Sprints)

This plan focuses on stabilizing gameplay quality and player experience before adding major new feature surface.

## Strategy

Prioritize:
1. Core gameplay feedback loop
2. Combat readability and game feel
3. Fast balancing iteration tools
4. Better bots for reliable testing

Defer:
- Spectator mode
- Replay persistence to DB
- Hero system v2 expansion depth

## Sprint 1 (Focus: Readability + Feedback Loop)

Duration target: 1-2 weeks

### Goal

Make combat and shop flow clearly understandable and feel responsive for first external playtests.

### Work Items

1. Playtest instrumentation and checklist
- Add a short tester checklist in repo docs:
  - Combat readability (1-5)
  - Shop clarity (1-5)
  - Match pace (too slow / good / too fast)
  - Most confusing moment (free text)
- Run 20+ internal matches and 10+ external matches with at least 2 testers.

2. Combat Readability v3
- Add event timing profile in client replay:
  - windup delay
  - hit moment
  - death cleanup delay
- Improve target readability:
  - clear attacker -> target emphasis per step
  - preserve short-lived damage numbers long enough to parse
- Add optional ranged projectile pass for ranged roles only (simple line/arc is enough for MVP).

3. Shop/board UX polish
- Add stronger buy/reroll/upgrade action feedback (visual + optional sound hooks).
- Improve unit hover card with concise stats/ability.
- Improve shop card readability (tier, role, value density).

4. Bug and pacing pass
- Remove dead-time spikes between phases where possible.
- Ensure reconnect during combat replay stays stable.

### Sprint 1 Definition of Done

- At least 30 observed matches recorded with feedback notes.
- Median combat readability score >= 3.5/5.
- No major replay desync between combat event order and client visual order.
- No P0/P1 regressions in lobby -> hero -> tavern -> combat lifecycle.

## Sprint 2 (Focus: Balance Tooling + Bot Quality)

Duration target: 1-2 weeks

### Goal

Enable fast tuning and reliable solo validation loops without waiting for full multiplayer sessions.

### Work Items

1. Lightweight balance telemetry
- Emit per-match stats (in memory/admin endpoint first):
  - unit pickrate
  - top-4 presence rate
  - unit contribution proxy (damage/death participation if available)
- Add quick admin table or JSON endpoint for these stats.

2. Tuning workflow improvements
- Add "fast balance iteration" workflow:
  - one command to restart server/client quickly after JSON edits
  - clear docs for tuning pass cadence
- Add validation guardrails for balance JSON shape and value ranges.

3. Bot improvements
- Upgrade bot buy heuristics:
  - prefer board upgrades and pair completion
  - avoid wasting gold in full bench states
- Upgrade bot positioning heuristics:
  - frontline preference for tank/melee
  - backline preference for ranged/support
- Use hero powers more intentionally (cost-aware and board-aware).

4. Quality gates
- Add a small automated match simulation test set for regression:
  - combat event ordering
  - no-crash multi-round bot-only matches
  - hero selection timeout fallback

### Sprint 2 Definition of Done

- Balance telemetry endpoint available and used in at least one tuning pass.
- Bot-vs-bot matches complete reliably across multiple rounds without obvious idle behavior.
- At least one documented balance iteration cycle completed from metrics -> config change -> re-test.
- Regressions covered by automated simulation checks.

## Exit Criteria Before Feature Expansion

Only move to Replay DB and Spectator after these are true:
- Combat readability target is met by external testers.
- Match flow is consistently understandable in first session.
- Balance iteration cycle can be completed in under 30 minutes.
- Bots are good enough for realistic solo validation.

## Candidate Backlog After These 2 Sprints

1. Replay persistence in PostgreSQL
2. Spectator mode using existing event stream
3. Hero system v2 (targeted powers and deeper hero identity)
4. Richer VFX/audio pack
