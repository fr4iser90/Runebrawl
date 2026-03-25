# Runebrawl - Sprint 1 Task Breakdown

This is the concrete implementation backlog for Sprint 1 from `docs/EXECUTION_PLAN.md`.

## Sprint 1 Objective

Improve combat readability and game feel enough that first external testers can clearly understand what is happening in matches.

## Work Order (Top to Bottom)

1. Combat timing profile
2. Combat readability pass
3. Shop/board UX polish
4. Playtest loop and feedback capture
5. Stability/regression checks

## Tickets

### S1-001 Combat Timing Profile

**Goal**  
Introduce deterministic replay timing controls instead of fixed one-size timing.

**Implementation**
- Add client-side replay timing config object in `apps/client/src/components/GameClient.vue`:
  - `windupMs`
  - `hitMs`
  - `deathCleanupMs`
  - `stepGapMs`
- Apply this profile in event playback scheduler.

**Acceptance Criteria**
- Replay timing is configurable in one place.
- Attack sequences no longer feel instant/jumpy.
- No replay event order regressions.

---

### S1-002 Clear Attack Targeting Cues

**Goal**  
Make it obvious who attacks whom.

**Implementation**
- Add stronger visual cues for attacker and defender slot:
  - short attacker pulse
  - short defender hit flash
- Keep highlighting tied to structured combat events (`source/target owner + slot`).

**Acceptance Criteria**
- Testers can identify attacker and defender without reading full log text.
- Works correctly when multiple units share the same name.

---

### S1-003 Damage/Death Readability Polish

**Goal**  
Improve readability of damage and death outcomes.

**Implementation**
- Increase visibility time of floating damage numbers slightly.
- Ensure `UNIT_DIED` fade feels readable but not slow.
- Optional: remove dead unit from replay board after fade duration.

**Acceptance Criteria**
- Damage values are readable at normal pace.
- Death events are visually clear and do not flicker.

---

### S1-004 Unit Hover Card (MVP)

**Goal**  
Provide quick unit context in shop and board.

**Implementation**
- Add lightweight hover panel:
  - unit name
  - role
  - attack/hp/speed
  - ability key + short description
- Reuse shared unit data where possible.

**Acceptance Criteria**
- Hover works on shop cards and occupied board/bench slots.
- No overlap that blocks core actions (buy, drag/drop, sell).

---

### S1-005 Shop Clarity Pass

**Goal**  
Make shop decision quality faster.

**Implementation**
- Improve card readability with visible tier/role markers.
- Keep visual hierarchy clean (name -> stats -> ability).
- Ensure buy/reroll/upgrade actions have instant visual response.

**Acceptance Criteria**
- Testers can quickly scan shop options each turn.
- No confusion between sold out, affordable, and unavailable states.

---

### S1-006 Playtest Checklist + Results Log

**Goal**  
Run the feedback loop with comparable data.

**Implementation**
- Add `docs/PLAYTEST_CHECKLIST.md` with score prompts:
  - combat readability (1-5)
  - shop clarity (1-5)
  - pace (slow/ok/fast)
  - confusion points
- Add simple `docs/PLAYTEST_RESULTS.md` template table.

**Acceptance Criteria**
- At least 30 total matches observed (internal + external).
- At least 2 external testers captured in results.

---

### S1-007 Reconnect During Combat Replay Validation

**Goal**  
Ensure replay state remains understandable across reconnects.

**Implementation**
- Test reconnect at:
  - early combat
  - mid replay
  - right before round end
- Fix any replay state reset artifacts.

**Acceptance Criteria**
- Reconnected player sees a coherent replay and next phase.
- No client crash or stuck replay timers.

---

### S1-008 Sprint 1 Regression Gate

**Goal**  
Do not break the core lifecycle while polishing.

**Implementation**
- Validate full lifecycle:
  - lobby -> hero selection -> tavern -> combat -> round end
- Validate both quick and private lobby starts.
- Run typecheck/build checks.

**Acceptance Criteria**
- `npm run typecheck` passes.
- `npm run build` passes.
- No P0/P1 regressions in phase flow.

## Sprint 1 Exit Criteria

- Median combat readability feedback score >= 3.5/5
- Testers report combat flow as understandable in first session
- No major replay desync bugs open
- Core loop remains stable end-to-end
