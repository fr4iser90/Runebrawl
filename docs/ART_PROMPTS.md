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
