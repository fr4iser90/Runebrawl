# Runebrawl View Architecture

This document tracks the current client screen architecture and the target screen flow.

## Current Implementation Status

- Done: `MenuScreen`
- Done: `LobbyView`
- Done: `HeroSelectionView`
- Done: `RecruitmentHallView`
- Done: `BoardBenchView` (non-combat board/bench only)
- Done: `CombatView`
- Done: `RoundResultOverlay`
- Done: `MatchEndView`
- Done: `SettingsModal` (global)

## Active Routing in `GameClient`

Current phase/state routing is:

- `LOBBY` -> `LobbyView`
- `HERO_SELECTION` -> `HeroSelectionView`
- `FINISHED` -> `MatchEndView`
- `COMBAT` or replay during `ROUND_END` -> `CombatView` (+ `PlayersSidebar`)
- other phases (`TAVERN`, `POSITIONING`, etc.) -> `RecruitmentHallView` + `BoardBenchView` + `PlayersSidebar`
- `ROUND_END` additionally shows `RoundResultOverlay`

## Scene Layer System

The top-level scene wrapper is implemented with:

- `game-scene` container
- `scene-backdrop` (phase-themed backgrounds)
- `scene-vignette` (readability layer)
- `scene-content` (all interactive UI)

Phase-specific visual variants currently exist for:

- `scene-lobby`
- `scene-hero_selection`
- `scene-combat`
- `scene-round_end`
- `scene-finished`

## Screen Blueprints (Reference)

### 1) App Start / Main Menu

```text
+----------------------------------------------------------------------------------+
| RUNEBRAWL                                             [Language: DE/EN] [⚙]      |
| "Auto-Battler FFA (8 Players)"                                               v0.x |
+----------------------------------------------------------------------------------+
|                                                                                  |
|  +-----------------------------------+   +------------------------------------+  |
|  | QUICK MATCH                       |   | PRIVATE MATCH                      |  |
|  | Region: [EU v]                    |   | Create Lobby [Button]              |  |
|  | Mode:   [Ranked/Unranked v]       |   | Join via Code: [______] [Join]     |  |
|  | [ Start Queue ]                   |   | Open Lobbies + join                |  |
|  +-----------------------------------+   +------------------------------------+  |
|  [Reconnect Last Match]                                                          |
+----------------------------------------------------------------------------------+
```

### 2) Lobby View

```text
+----------------------------------------------------------------------------------+
| LOBBY: CODE                                Players: X/Y                          |
+----------------------------------------------------------------------------------+
| Players list + status                      Lobby controls                        |
| READY / NOT READY                          Toggle ready                          |
| HUMAN / BOT badges                         Add bot / Kick / Force start          |
+----------------------------------------------------------------------------------+
```

### 3) Hero Selection View

```text
+----------------------------------------------------------------------------------+
| HERO SELECTION                            Round 1 prep                           |
+----------------------------------------------------------------------------------+
| [1] Hero Card   [2] Hero Card   [3] Hero Card                                   |
| Portrait + description + Select button                                           |
| Shortcuts: 1/2/3 (+ Enter fallback)                                             |
+----------------------------------------------------------------------------------+
```

### 4) Recruitment Hall / Buy Phase

```text
+----------------------------------------------------------------------------------+
| RECRUITMENT HALL         Gold / HP / Tier / XP / Hero                            |
+----------------------------------------------------------------------------------+
| SHOP cards                              ACTIONS                                   |
| Buy buttons + stats + ability/tags      Reroll / Upgrade / Lock / Ready          |
|                                          Hero power                               |
| Shortcuts: Q/W/E, Enter/R                                                   |
+----------------------------------------------------------------------------------+
| BOARD + BENCH drag/drop + sell                                                   |
+----------------------------------------------------------------------------------+
```

### 5) Combat View

```text
+----------------------------------------------------------------------------------+
| COMBAT: You vs Opponent / Ghost                                                  |
+----------------------------------------------------------------------------------+
| Enemy board                               Your board                             |
| Target line + hit/death/damage replay events                                     |
| Replay event line + players sidebar                                               |
+----------------------------------------------------------------------------------+
```

### 6) Round Result Overlay

```text
+----------------------------------------------------------------------------------+
| ROUND RESULT                                                                      |
| Victory / Defeat / Draw / No Duel                                                 |
| Localized summary from DUEL_RESULT events                                         |
+----------------------------------------------------------------------------------+
```

### 7) Match End View

```text
+----------------------------------------------------------------------------------+
| MATCH FINISHED                                                                    |
+----------------------------------------------------------------------------------+
| Placement list                                                                    |
| Highlight for current player                                                      |
| [Play Again] [Back to Menu]                                                       |
+----------------------------------------------------------------------------------+
```

## Keyboard UX (Implemented)

- Hero selection: `1`, `2`, `3`, `Enter`
- Recruitment Hall: `Q` (reroll), `W` (upgrade), `E` (lock), `Enter`/`R` (ready)
- Visible hotkey badges on key CTAs
- `focus-visible` styles for keyboard navigation

## Next Recommended UI Steps

- Add a dedicated `MenuView` wrapper to finalize naming consistency (optional; current `MenuScreen` works).
- Extract a dedicated `PlayersView` if we want phase-specific sidebars later.
- Add `RoundTransitionView` between `ROUND_END` -> next buy phase (optional polish).
- Add phase transition animations (crossfade/slide) tied to `scene-*`.
- Replace gradient backdrops with authored art backgrounds per phase.