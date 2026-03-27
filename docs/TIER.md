## T1 Unit Template Pack (10)

Use this as a starter batch for rapid content production. All rows follow T1 constraints and keep snowball low.

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_granite_sentinel` | Tank | `1/6/1` | `TAUNT` | Early frontline anchor, buys time for backline | Burst damage, anti-tank focus |
| `unit_gutter_duelist` | Melee | `3/3/3` | `NONE` | Fast early tempo attacker | Dies quickly to any focus fire |
| `unit_cinder_ranger` | Ranged | `2/3/2` | `NONE` | Safe chip damage, clean generic ranged slot | Vulnerable to fast melee dive |
| `unit_field_medic` | Support | `1/4/2` | `LIFESTEAL` | Light sustain utility without hard carry potential | Heal reduction / burst before sustain matters |
| `unit_bone_recruit` | Melee | `2/4/2` | `DEATH_BURST` | Trade piece, punishes clumped low HP boards | Space positioning, high-HP openers |
| `unit_iron_warder` | Tank | `2/5/1` | `NONE` | Reliable durable body with no scaling complexity | Kited by speed + ranged pressure |
| `unit_blood_raider` | Melee | `3/4/2` | `BLOODLUST` | Simple momentum piece (single fight spike) | Controlled by taunt walls / burst race |
| `unit_mire_hunter` | Ranged | `2/4/2` | `TAUNT` | Off-role utility ranged unit for unusual openers | Loses value if enemy ignores ranged line |
| `unit_dawn_acolyte` | Support | `1/5/2` | `NONE` | Stable support slot, enables flexible comps | Low damage; punished by greedy boards |
| `unit_ashbound_scout` | Ranged | `3/3/3` | `NONE` | High-speed poke, skill-check positioning unit | Very fragile if caught by front pressure |

### Notes for This Batch

- Keep all 10 at `tier: 1` and `shopWeight` in a narrow band (for example `0.9-1.2`).
- If a unit uses `BLOODLUST` or `LIFESTEAL`, keep one base stat bucket lower.
- Avoid stacking multiple T1 units with the same spike pattern in one opening shop.

## Portrait Prompts (One Per Unit)

Prompt skeleton is intentionally aligned with `docs/ART_PROMPTS.md` style (single portrait, transparent, strict no-text output).

### `unit_granite_sentinel.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: granite sentinel construct, carved runic torso, broad shielded silhouette, ancient guardian tank posture.
```

### `unit_gutter_duelist.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: agile alley duelist, worn leather armor, short blade in forward guard, focused aggressive expression.
```

### `unit_cinder_ranger.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: ember archer with ashwood bow, glowing arrow tip, lean ranged stance, warm orange-red accents.
```

### `unit_field_medic.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: battlefield medic with satchel and glowing tonic vial, calm supportive expression, practical light armor.
```

### `unit_bone_recruit.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: undead recruit with chipped bone armor, rusted spear fragments, unstable necrotic glow, expendable fighter vibe.
```

### `unit_iron_warder.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: iron-clad warder in heavy plated helm, tower-shield silhouette, disciplined defensive posture.
```

### `unit_blood_raider.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: feral raider with crimson warpaint, hooked blade, frenzy-forward melee pose, savage momentum energy.
```

### `unit_mire_hunter.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: swamp hunter in moss cloak, longbow and bone charms, wary tactical gaze, muted green palette.
```

### `unit_dawn_acolyte.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: dawn acolyte with simple sun motif robes, small ritual focus, hopeful support-caster demeanor.
```

### `unit_ashbound_scout.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: ashland scout with light hood and compact crossbow, fast alert posture, soot-gray and ember-orange accents.
```

## T2 Unit Template Pack (5)

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_oak_phalanx` | Tank | `3/8/2` | `TAUNT` | Mid-early anchor with better durability than T1 tanks | Magic burst / anti-frontline focus |
| `unit_rift_skirmisher` | Melee | `4/6/3` | `NONE` | Stable tempo upgrade over T1 duelists | Outscaled by stronger utility units |
| `unit_thorn_bolt` | Ranged | `3/6/3` | `DEATH_BURST` | Backline poke with punish-on-death trade pattern | Spacing and high HP boards |
| `unit_lantern_keeper` | Support | `2/7/2` | `LIFESTEAL` | Sustain bridge piece, keeps early boards online | Burst before sustain cycles |
| `unit_warhowl_runner` | Melee | `4/5/3` | `BLOODLUST` | Conditional momentum spike, still answerable | Taunt lock and focus fire |

### Notes for This Batch

- Keep `shopWeight` around `0.8-1.1` so T2 appears often enough as a bridge tier.
- T2 should reward synergy setup, not replace T3 identity units.

## T2 Portrait Prompts

### `unit_oak_phalanx.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: oak-armored phalanx guardian, bark-plated shoulders, rooted defensive pose, rugged tank silhouette.
```

### `unit_rift_skirmisher.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: agile rift skirmisher with split-blade weapon, motion-ready stance, energetic melee profile.
```

### `unit_thorn_bolt.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: thorn-bolt ranger, vine-wrapped bow, spiked quiver, wary ranged hunter expression.
```

### `unit_lantern_keeper.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: lantern-bearing support mystic, warm glow vial, calm posture, battlefield healer vibe.
```

### `unit_warhowl_runner.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: scarred warhowl raider, open-jaw battle cry, predator speed silhouette, feral momentum energy.
```

## T3 Unit Template Pack (5)

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_bastion_veteran` | Tank | `4/11/2` | `TAUNT` | First true midgame wall, enables slower comps | Anti-tank burst, armor-break concepts |
| `unit_ember_duelist` | Melee | `6/8/3` | `BLOODLUST` | Momentum melee carry seed (not final carry) | Denied by CC/taunt and focused fire |
| `unit_arc_javelin` | Ranged | `5/7/4` | `NONE` | Speed-forward ranged DPS baseline | Falls off without synergy scaling |
| `unit_grave_channeler` | Support | `3/9/2` | `DEATH_BURST` | Utility pressure and anti-swarm punish | High-HP boards and spacing discipline |
| `unit_moon_warden` | Support | `3/10/3` | `LIFESTEAL` | Midgame sustain backbone for balanced boards | Heal cut / burst race |

### Notes for This Batch

- T3 should define comp identity, not only stats.
- One strong axis per unit (speed, sustain, burst, frontline), not all at once.

## T3 Portrait Prompts

### `unit_bastion_veteran.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: veteran bastion defender, battle-worn plate armor, broad shielded frame, disciplined tank bearing.
```

### `unit_ember_duelist.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: ember-forged duelist with heated twin blades, aggressive forward posture, high-risk melee energy.
```

### `unit_arc_javelin.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: arc-javelin thrower, crackling spear tip, swift ranged striker pose, bright electric accents.
```

### `unit_grave_channeler.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: grave channeler in ritual wraps, necrotic rune glow, composed support-caster expression.
```

### `unit_moon_warden.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: moonlit warden with crescent sigil mantle, serene vigilant gaze, support guardian silhouette.
```

## T4 Unit Template Pack (5)

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_fortress_colossus` | Tank | `6/16/2` | `TAUNT` | Heavy spike frontline, protects scaling backline | Dedicated anti-tank packages |
| `unit_rift_executioner` | Melee | `9/12/3` | `BLOODLUST` | Mid-late carry enabler with kill-chain pressure | Hard focus and taunt stalls |
| `unit_storm_longshot` | Ranged | `8/10/4` | `NONE` | High-value ranged pressure spike | Fragile if dived or speed-checked |
| `unit_crypt_bomber` | Support | `6/11/2` | `DEATH_BURST` | Punishes clumped boards at higher tier stakes | Spread formation, sustain-heavy fronts |
| `unit_sanctum_keeper` | Support | `5/14/3` | `LIFESTEAL` | Durable sustain pivot in attrition fights | Anti-heal and burst windows |

### Notes for This Batch

- T4 is where noticeable power spikes start.
- Keep one explicit weakness visible in each card design.

## T4 Portrait Prompts

### `unit_fortress_colossus.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: fortress colossus with layered stone-iron plating, monumental tank silhouette, immovable guardian stance.
```

### `unit_rift_executioner.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: rift executioner with heavy cleaver, void-scarred armor seams, predatory melee finisher posture.
```

### `unit_storm_longshot.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: storm longshot marksman, elongated bow silhouette, charged lightning arrow, sharp ranged focus.
```

### `unit_crypt_bomber.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: crypt bomber alchemist, volatile skull-flask payload, eerie grin, explosive support specialist vibe.
```

### `unit_sanctum_keeper.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: sanctum keeper in layered ceremonial armor, radiant ward aura, stoic sustain guardian presence.
```

## T5 Unit Template Pack (5)

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_iron_titan` | Tank | `10/24/3` | `TAUNT` | Endgame anchor with massive soak value | True damage / anti-tank burst |
| `unit_blood_harbinger` | Melee | `14/18/4` | `BLOODLUST` | High-ceiling carry payoff with kill momentum | Focus deny, taunt walls, CC |
| `unit_aurora_sniper` | Ranged | `13/15/5` | `NONE` | High DPS ranged finisher line | Dive and speed denial |
| `unit_plague_orbiter` | Support | `9/17/3` | `DEATH_BURST` | Punish clustered boards in late rounds | Position spread and sustain tanks |
| `unit_soul_shepherd` | Support | `8/20/4` | `LIFESTEAL` | Large sustain payoff with frontline synergy | Anti-heal plus focused burst |

### Notes for This Batch

- T5 should feel like payoff, not guaranteed victory.
- If a T5 unit dominates every comp, reduce speed first.

## T5 Portrait Prompts

### `unit_iron_titan.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: colossal iron titan, layered fortress armor, glowing core seams, overwhelming tank silhouette.
```

### `unit_blood_harbinger.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: blood harbinger with ritual blade and crimson aura, relentless melee executioner presence.
```

### `unit_aurora_sniper.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: aurora sniper with crystal longbow, precise cold stare, elite late-game ranged assassin look.
```

### `unit_plague_orbiter.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: plague orbiter with floating toxic globes, ominous alchemist armor, sinister support bomber profile.
```

### `unit_soul_shepherd.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: soul shepherd with spectral lantern staff, calm commanding posture, heavy sustain-support aura.
```

## T6 Unit Template Pack (5)

| ID | Role | Stat Target (ATK/HP/SPD) | Ability | Ability Intent | Counterplay |
| --- | --- | --- | --- | --- | --- |
| `unit_worldbreak_colossus` | Tank | `16/36/4` | `TAUNT` | Capstone frontline, extreme board-shaping presence | Dedicated anti-tank package and tempo race |
| `unit_apex_reaver` | Melee | `22/26/5` | `BLOODLUST` | Peak snowball finisher if left unchecked | Hard CC, taunt lock, burst deny |
| `unit_zenith_longbow` | Ranged | `20/24/6` | `NONE` | Pure top-tier ranged DPS benchmark | Fast dive and front-collapse pressure |
| `unit_umbra_cataclyst` | Support | `15/28/4` | `DEATH_BURST` | Endgame anti-clump detonation threat | Position spread and large HP pools |
| `unit_eternal_vicar` | Support | `14/30/5` | `LIFESTEAL` | High-end sustain capstone with scaling comps | Anti-heal windows and focused burst |

### Notes for This Batch

- T6 may create explosive outcomes, but still needs practical counterplay.
- If a T6 unit has both top speed and top durability, reduce one axis.

## T6 Portrait Prompts

### `unit_worldbreak_colossus.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: worldbreak colossus, mountain-scale armor plates, glowing tectonic cracks, ultimate tank silhouette.
```

### `unit_apex_reaver.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: apex reaver with oversized void-edged weapon, relentless execution stance, apex melee predator profile.
```

### `unit_zenith_longbow.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: zenith longbow master with celestial bow arc, razor focus expression, unmatched ranged finisher aura.
```

### `unit_umbra_cataclyst.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: umbra cataclyst mage with orbiting dark sigils, apocalyptic spellcaster posture, late-game support threat.
```

### `unit_eternal_vicar.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: eternal vicar in luminous sanctified robes, authoritative calm gaze, immortal sustain-support silhouette.
```
