# Runebrawl Portrait Production Guide

This guide defines exact portrait specs for consistent unit/hero art production.

## 1) Exact Technical Specs

- **Aspect Ratio:** `4:5`
- **Master Canvas (painted):** `512 x 640`
- **Master Canvas (pixel):** `128 x 160` (later export 2x)
- **Runtime Export:** `256 x 320`
- **Optional Thumbnail Export:** `128 x 160`
- **File Format:** `.webp` (primary), `.png` (fallback)
- **WebP Quality:** `85-90`
- **Background:** transparent or clean dark gradient (no text overlay)

## 2) Safe Area / Composition Rules

- Keep character focal point in the center-top region.
- **Safe area:** leave at least `32px` margin on each side of `512x640` master.
- Face/helmet/primary silhouette should remain readable at `64px` displayed height.
- No logos, no text, no frame labels in the portrait image itself.

## 3) Naming and Paths (required)

- **Units:** `apps/client/src/assets/portraits/units/unit_<unitId>.webp`
- **Heroes:** `apps/client/src/assets/portraits/heroes/hero_<heroId>.webp`

Examples:

- `unit_alley_blade.webp`
- `hero_recruiter_queen.webp`

## 4) Role Color Keys (accent only)

Use only as accents (not full-screen tint):

- **Tank:** `#4F86D9`
- **Melee:** `#D95757`
- **Ranged:** `#5CCB7A`
- **Support:** `#A874E6`

## 5) GIMP Workflow (Painted/Flat)

1. Create file: `512x640`, transparent background.
2. Use layer groups:
   - `bg`
   - `character`
   - `fx`
   - `outline`
3. Keep outlines and value contrast strong.
4. Export:
   - `File -> Export As -> .webp`
   - Quality `85-90`
5. Optional: export additional `128x160` preview file.

## 6) Aseprite Workflow (Pixel)

1. Create file: `128x160`, indexed palette (24-32 colors recommended).
2. Keep 1px silhouette clarity and avoid noisy dithering.
3. Export sprite scaled to `256x320` with **nearest-neighbor**.
4. Keep anti-aliasing off for pixel style.
5. Convert to `.webp` only if your pipeline preserves sharp edges.

## 7) Production Priority Queue

Create these first (highest visual impact):

### Heroes

- `hero_gold_baron.webp`
- `hero_war_chanter.webp`
- `hero_recruiter_queen.webp`
- `hero_iron_guardian.webp`

### Units (Tier 1-2 first)

- `unit_stone_guard.webp`
- `unit_alley_blade.webp`
- `unit_ember_archer.webp`
- `unit_wild_shaman.webp`
- `unit_grave_imp.webp`
- `unit_soul_reaver.webp`

### Units (then Tier 3-4)

- `unit_iron_bulwark.webp`
- `unit_sky_sniper.webp`
- `unit_war_drummer.webp`

## 8) Copy-Paste Prompt Set (Portrait Only)

Use these prompts as-is in image tools (one prompt per portrait).

### Global Prompt Prefix (keep in every prompt)

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
```

### Heroes

#### `hero_gold_baron.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: older noble merchant-mage, gold-trimmed coat and pauldrons, coin sigil ornament, confident smirk, warm gold accents.
```

#### `hero_war_chanter.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: tribal battle singer, leather and rune-drum motifs, war paint, open chanting expression, energetic red-orange accents.
```

#### `hero_recruiter_queen.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: regal commander queen, crested helm, tactical calm face, banner insignia jewelry, royal purple accents.
```

#### `hero_iron_guardian.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: armored sentinel hero, heavy steel pauldrons, shield emblem chestplate, stoic expression, cold blue-gray palette.
```

### Units

#### `unit_stone_guard.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: massive stone golem guard, cracked granite body, glowing seam lines, heavy tank silhouette.
```

#### `unit_alley_blade.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: hooded street duelist, short blade raised, agile melee posture, sharp aggressive eyes.
```

#### `unit_ember_archer.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: ember-themed ranger, drawn bow and glowing ember arrow, light armor, focused ranged expression.
```

#### `unit_wild_shaman.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: wild support shaman, totem charms and ritual accessories, spirit glow around hands, calm but intense gaze.
```

#### `unit_grave_imp.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: sinister grave imp, ashen skin, jagged grin, unstable death-burst energy around claws.
```

#### `unit_soul_reaver.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: cursed melee reaper, dark hood, violet soul mist, vampiric lifesteal vibe, controlled ruthless expression.
```

#### `unit_iron_bulwark.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: fortress-like armored soldier, huge shield-forward stance, battered steel plates, defensive mass.
```

#### `unit_sky_sniper.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: sky hunter sniper, precision long-range weapon, wind goggles, sleek fast profile.
```

#### `unit_war_drummer.webp`

```text
Single fantasy character portrait only, chest-up, centered, clean silhouette, high readability at small size.
Style: stylized semi-flat fantasy game illustration.
Lighting from top-left, medium contrast, subtle rim light.
Background: transparent only.
STRICT: no text, no letters, no words, no numbers, no symbols, no watermark, no logo, no card frame, no border, no UI elements.
Output composition: vertical 4:5.
If any text or symbols appear, regenerate without text.
Character: battlefield support drummer, strapped war drum motifs, rally expression, rhythmic combat aura.
```

## 9) QA Checklist (before commit)

- File name matches `unit_<id>` / `hero_<id>`.
- Runtime export is exactly `256x320`.
- Portrait is readable at small size.
- No text inside artwork.
- Check in admin portrait preview: `loaded` (not `missing`).

## 10) Layer Template Blueprint

Use these exact layer/group names so every portrait file is structured the same.

### GIMP Template (Painted)

Top to bottom order:

1. `GUIDE__safe_area` (hidden before export)
2. `FX__front`
3. `CHAR__line`
4. `CHAR__paint`
5. `CHAR__shadow`
6. `CHAR__base`
7. `BG__shape`
8. `BG__gradient`

Recommended setup:

- `GUIDE__safe_area`: rectangle guide for center/safe area only.
- `CHAR__base`: flat silhouette colors.
- `CHAR__shadow`: multiply layer for depth.
- `CHAR__paint`: details/materials/secondary color accents.
- `CHAR__line`: subtle contour cleanup.
- `FX__front`: sparks/soul-glow/embers (very restrained).
- `BG__gradient` + `BG__shape`: simple contrast background only.

Export rule:

- Hide `GUIDE__safe_area`.
- Export final flattened image at `256x320` as `.webp`.

### Aseprite Template (Pixel)

Top to bottom order:

1. `guide_safe_area` (hidden before export)
2. `fx_front`
3. `char_outline`
4. `char_detail`
5. `char_base`
6. `bg_shape`
7. `bg_flat`

Palette recommendation:

- 24-32 colors maximum.
- Keep 3 value steps per material (light/mid/shadow).
- Reserve 2-3 colors for role accents and glow FX.

Export rule:

- Hide `guide_safe_area`.
- Export nearest-neighbor at `256x320`.

### Optional Naming for Source Files

- GIMP source: `src_<id>.xcf`
- Aseprite source: `src_<id>.aseprite`
- Keep source files outside runtime portrait folders (recommended: `art_sources/portraits/`).

## 11) ASCII Frame Blueprint (Card + Hero)

Use this as visual layout guidance while painting/exporting portraits.

### Unit Card Frame (portrait inside UI card)

```text
┌──────────────────────────────────────────────┐
│ UNIT NAME                          [TIER] ◇ │  <- top label strip (UI text layer)
├──────────────────────────────────────────────┤
│ ╔══════════════════════════════════════════╗ │
│ ║                                          ║ │
│ ║            PORTRAIT AREA                 ║ │  <- image slot (4:5)
│ ║        (focus: head/upper body)          ║ │
│ ║                                          ║ │
│ ╚══════════════════════════════════════════╝ │
├──────────────────────────────────────────────┤
│ ROLE CHIP   ABILITY CHIP   TAG CHIP(S)      │  <- metadata row
├──────────────────────────────────────────────┤
│ ATK 4   HP 6   SPD 4                         │  <- stat line
└──────────────────────────────────────────────┘
```

Frame styling intent:

- Corner radius: medium (`10-12px`)
- Outer border: muted metal/arcane tone
- Tier accent:
  - low tier: cool steel
  - mid tier: arcane violet
  - high tier: warm gold/amber

### Hero Selection Frame (featured)

```text
╔══════════════════════════════════════════════╗
║                  HERO NAME                   ║  <- header / title
╠══════════════════════════════════════════════╣
║                                              ║
║              HERO PORTRAIT AREA              ║  <- larger than unit portrait
║           (iconic silhouette + face)         ║
║                                              ║
╠══════════════════════════════════════════════╣
║ POWER TYPE: ACTIVE/PASSIVE                   ║
║ POWER KEY: WAR_DRUM / BONUS_GOLD ...         ║
║ COST: 0/1/2                                  ║
╠══════════════════════════════════════════════╣
║ SHORT DESCRIPTION / FLAVOR                    ║
╚══════════════════════════════════════════════╝
```

Frame styling intent:

- Thicker border than unit cards
- Crown/crest motif feeling at top
- Color family per hero identity (keep readable, not noisy)
- Keep portrait contrast higher than text zones

### Portrait Crop Guide inside Frame

```text
+----------------------------------+
|          top breathing room      |
|        _________                 |
|       /  HEAD  \                 | <- head occupies upper-middle
|      |  FACE    |                |
|      | SHOULDERS|                | <- shoulders/chest visible
|                                  |
|      lower area can fade out     |
+----------------------------------+
```

Rule of thumb:

- Never crop off the main face landmark.
- Weapon FX can enter side margins, but face/silhouette stays centered.

## 12) Background Prompt Pack (Recruitment Halls + Battlegrounds)

Use this section for full-scene backgrounds behind UI. These are not portraits.

### Technical Targets

- **Master export:** `1920x1080` (landscape)
- **Alt export:** `2560x1440` (for downscale quality)
- **Optional mobile crop check:** `1080x1920` center-safe
- **Format:** `.webp` (quality `80-88`) or `.png`
- **No text in image**
- Keep center play area readable behind UI panels.

Suggested runtime paths:

- Recruitment Hall backgrounds: `apps/client/src/assets/backgrounds/recruitment_<theme>.webp`
- Battleground backgrounds: `apps/client/src/assets/backgrounds/battleground_<theme>.webp`

### Global Prompt Prefix (Backgrounds)

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
```

### Recruitment Hall Variants (Faction/Race Themes)

#### `recruitment_human_keep`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: human fortress recruitment hall, stone arches, polished oak tables, banners without symbols, warm torchlight, disciplined military marketplace mood.
```

#### `recruitment_dwarven_forge`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: dwarven forge hall, carved basalt pillars, glowing furnaces, anvils and metal racks, ember particles, orange-red industrial fantasy atmosphere.
```

#### `recruitment_elven_grove`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: elven living-wood recruitment pavilion, curved roots as architecture, soft bioluminescent lantern plants, moonlit teal-green palette, elegant mystical calm.
```

#### `recruitment_undead_crypt_market`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: undead crypt bazaar hall, cracked mausoleum stone, candle clusters, eerie fog ribbons, violet-green necromantic glow, moody but readable contrast.
```

#### `recruitment_orc_warcamp`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: orc warcamp hall, heavy timber scaffolds, hide canopies, iron braziers, rough craft stations, red-amber battle-camp energy.
```

#### `recruitment_arcane_conclave`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: arcane recruitment sanctum, floating crystal arrays, concentric runic floor patterns without symbols, blue-violet magical light shafts, high-fantasy scholarly tone.
```

### Battleground Variants (Combat Scenes)

#### `battleground_ruined_courtyard`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: ruined castle courtyard battleground, broken statues, shattered flagstones, dust haze, neutral gray-blue palette with warm rim light.
```

#### `battleground_frozen_arena`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: frozen combat arena, cracked ice platforms, frost pillars, blowing snow, cold cyan lighting with strong silhouette readability.
```

#### `battleground_volcanic_pit`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: volcanic pit battleground, obsidian plates, lava channels, smoke plumes, orange-red underglow balanced with dark rock forms.
```

#### `battleground_moonlit_forest`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: moonlit forest duel grounds, ancient roots and standing stones, silver-blue mist, soft mystical highlights, calm but tense battlefield mood.
```

#### `battleground_storm_coast`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: coastal cliff battleground under storm sky, wet stone, crashing waves in distance, wind-swept debris, dramatic blue-gray lightning ambience.
```

#### `battleground_void_platform`

```text
Fantasy game environment background only, no characters, no UI, no text.
Wide composition, readable negative space in center for interface overlays.
Style: stylized semi-flat fantasy illustration, clean shapes, medium detail, not photorealistic.
Lighting cinematic but controlled, strong depth layers (foreground / midground / background).
STRICT: no letters, no words, no logos, no watermark, no symbols, no frame, no HUD.
Output: 16:9 landscape.
Scene: floating void platform arena, fractured stone islands, cosmic nebula depth, arcane beams, high contrast purple-cyan magical battlefield.
```

## 13) Runtime Theme Mapping (Ready-to-Implement)

This mapping aligns art asset names with the current client phase CSS hooks.

### Canonical manifest (code)

- **Package:** `packages/game-content/`
- **Manifest JSON:** `packages/game-content/src/manifest.json`
- **Types + helpers:** `packages/game-content/src/index.ts` (`getGameContentManifest`, `getThemeOrDefault`)
- **Server endpoint (read-only):** `GET /content/manifest` (same JSON; Traefik: `https://<host>/api/content/manifest` when routed with `/api` prefix)
- **Client import:** `apps/client/src/content/gameContent.ts`

### A) Current Live Mapping (existing files)

| Phase / UI Context | CSS Class / Hook | Current Background File |
| --- | --- | --- |
| Tavern / Positioning default | `.scene-backdrop` base | `recruitment-bg.svg` |
| Hero Selection | `.scene-hero_selection .scene-backdrop` | `hero-selection-bg.svg` |
| Lobby | `.scene-lobby .scene-backdrop` | `lobby-bg.svg` |
| Combat + Round End | `.scene-combat .scene-backdrop`, `.scene-round_end .scene-backdrop` | `combat-bg.svg` |
| Finished screen | `.scene-finished .scene-backdrop` | `finished-bg.svg` |
| Decorative top ornament | `.scene-ornament-top` | `ornament-top.svg` |
| Decorative bottom ornament | `.scene-ornament-bottom` | `ornament-bottom.svg` |

### B) Target Naming for New Theme Packs

Use this scheme for future backgrounds so swapping themes is easy:

- Recruitment Hall: `recruitment_<theme>.webp`
- Hero Select: `hero_select_<theme>.webp`
- Lobby: `lobby_<theme>.webp`
- Combat/Round End: `battleground_<theme>.webp`
- Finished: `finished_<theme>.webp`

Examples:

- `recruitment_human_keep.webp`
- `recruitment_dwarven_forge.webp`
- `recruitment_elven_grove.webp`
- `battleground_frozen_arena.webp`
- `battleground_volcanic_pit.webp`

### C) Theme Set Matrix (Faction/Race Flavor)

| Theme Key | Recruitment Hall Prompt | Battleground Prompt | Suggested Palette Direction |
| --- | --- | --- | --- |
| `human_keep` | `recruitment_human_keep` | `battleground_ruined_courtyard` | steel blue, warm torch amber |
| `dwarven_forge` | `recruitment_dwarven_forge` | `battleground_volcanic_pit` | ember orange, basalt black |
| `elven_grove` | `recruitment_elven_grove` | `battleground_moonlit_forest` | teal green, moon silver |
| `undead_crypt` | `recruitment_undead_crypt_market` | `battleground_void_platform` | violet, sickly green |
| `orc_warcamp` | `recruitment_orc_warcamp` | `battleground_storm_coast` | iron gray, dusty red |
| `arcane_conclave` | `recruitment_arcane_conclave` | `battleground_void_platform` | indigo, cyan magic glow |

### D) Minimal CSS Swap Template

When you add new files, swap background URLs by phase class:

```css
/* Example: dwarven forge theme */
.scene-backdrop {
  background-image: url("./assets/backgrounds/recruitment_dwarven_forge.webp");
}

.scene-hero_selection .scene-backdrop {
  background-image: url("./assets/backgrounds/hero_select_dwarven_forge.webp");
}

.scene-lobby .scene-backdrop {
  background-image: url("./assets/backgrounds/lobby_dwarven_forge.webp");
}

.scene-combat .scene-backdrop,
.scene-round_end .scene-backdrop {
  background-image: url("./assets/backgrounds/battleground_volcanic_pit.webp");
}
```

### E) Asset QA for Background Packs

- Keep center area low-noise (UI readability first).
- Avoid bright highlights directly under action buttons.
- Check both desktop (`16:9`) and mobile center crop (`9:16`) before commit.
- No readable text/glyphs in environment props.
