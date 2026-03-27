# Runebrawl: HS-Flow Refactor Plan

## Ziel
Runebrawl soll sich im Flow und in der visuellen Lesbarkeit deutlich mehr wie Hearthstone Battlegrounds anfuehlen, ohne sofort die komplette Engine auf WebGL/Three.js umzubauen.

Wichtige Produktentscheidung:
- **Bank bleibt als System erhalten** (interner Name kann `bench` bleiben).
- **Flow und Rendering werden HS-naeher**: Karten-/Objektfokus statt starre Slot-UI.

---

## Nordstern (Target Experience)
- Minions werden als **Objekte in Reihen** wahrgenommen, nicht als "Slot 1..N Boxen".
- Shop-Interaktion ist **kartenzentriert** (Drag aus Tavern).
- Board-Reihenfolge und Positionierung wirken "lebendig", nicht rasterhart.
- Leere Positionen sind nicht dominant sichtbar; nur relevante Drop-Hints bei Drag.
- Combat bleibt klar lesbar (wer handelt, wer stirbt, Ergebnis nach Replay-Ende).

---

## Phase 0 - Stabilisierung (bereits teilweise erledigt)
- Turn-based Combat aktiv.
- Tempo-Leiste entfernt.
- Replay-Lock aktiv: kein fruehes Umschalten auf Recruitment vor Replay-Ende.
- Tier vs Evolutionsstufe getrennt.

Offen vor Phase 1:
- UI-Labels und Tooltips pruefen, damit keine widerspruechlichen Hinweise bleiben.

---

## Phase 1 - Interaction Flow (HS-gefuehlte Bedienung)
1. **Shop -> Drag-buy bleibt verpflichtend**
   - Kein one-click Kauf.
   - Klarer Hint im UI ("drag from tavern").
2. **Bank/Hand -> Board spielen**
   - Drag von Bank auf Board.
   - Optional: Klick auf Bank-Karte spielt auf naechstes sinnvolles Board-Ziel.
3. **Board-Reorder**
   - Drag innerhalb Board veraendert Reihenfolge.
4. **Drop-Feedback**
   - Nur waehrend Drag sichtbare Ziel-Hints.

Abnahmekriterien:
- Kein Nutzer braucht Slot-Nummern, um einen Minion korrekt zu spielen.
- Buy/Play/Reorder funktionieren nur mit Karteninteraktion.

---

## Phase 2 - Rendering-Refactor (weg vom Slot-Look)
1. **BoardBenchView umbauen**
   - Primär `v-for` ueber echte Unit-Objekte pro Zone.
   - Positionen aus Layout-Funktion statt fixer Zellraster.
2. **Layout Engine einfuehren**
   - `layoutZone(count, zoneRect)` liefert x/y/scale/rotation/zIndex.
   - Board mit leichter Bogenform.
3. **Leere Slots entfernen**
   - Keine persistenten leeren Rahmen.
   - Nur temporaere Drop-Silhouetten bei Drag.

Abnahmekriterien:
- Bei leerem Board keine leeren Platzhalterkarten.
- Karten rutschen bei Move/Play sauber in neue Position.

---

## Phase 3 - Visual Polish (ohne Three.js)
1. Board-Depth via CSS perspective.
2. Layered Lighting:
   - card shadow
   - rim highlights
   - soft ambient vignette
3. Motion polish:
   - Enter/exit/move transitions mit konsistentem easing.
4. Shop-Hover-Preview angleichen an In-game-Kartenstil.

Abnahmekriterien:
- "2.5D Card Table" Eindruck auch ohne 3D Engine.
- Keine hektischen oder unlesbaren Animationen.

---

## Phase 4 - Daten- und Input-Entkopplung
1. Drag-State ueber `instanceId` statt slot-index-zentriert.
2. UI-Command-Mapping:
   - Objektinteraktionen -> serverseitige indexbasierten Commands.
3. Merge/Evo-Handling robust gegen Reorder und gleichzeitige Updates.

Abnahmekriterien:
- Kein "falscher Minion bewegt" bei schnellen Inputs.
- Reorder + Merge stabil in einem Turn.

---

## Phase 5 - Optional: Three.js gezielt
Nur wenn Phase 1-4 stabil sind.

Empfohlener Scope:
- Spell-/Impact-VFX Layer
- board-level post processing
- leichte Kamera-Parallaxe

Nicht als erster Schritt:
- komplette Card UI in WebGL
- vollstaendige Scene-Migration

---

## Benoetigte Assets

### A) Pflicht (fuer HS-Flow Look ohne Engine-Wechsel)
- **Board Surface**
  - Tisch/Felt Diffuse (`2048x2048` oder `4096x4096`)
  - leichte Detail-Normalmap optional
- **Zone Overlays**
  - Board-Zone glow
  - Bank/Hand-Zone glow
  - Drop-target silhouette (neutral/valid/invalid)
- **Card FX**
  - Shadow textures (soft + contact)
  - Rim-light overlays (cool/warm variants)
  - Hover highlight mask
- **Frame Variants**
  - Standard frame
  - Evo frame accents (E2/E3 highlight rings oder studs)
- **UI Icons**
  - Drag hint icon
  - reorder hint icon
  - lock/freeze polish icon variants

### B) Sehr empfohlen (fuer Premium-Gefuehl)
- **Ambient FX**
  - dust motes / ember particles sprite sheet
  - soft god-ray overlay
- **Impact FX**
  - slash, hit spark, magic burst atlas
- **State cues**
  - buff (+) / debuff (-) floating icon sprites
  - shield/taunt pulse overlays

### C) Optional spaeter (Three.js / 3D)
- 3D board mesh (low poly + baked textures)
- camera rig presets
- particle textures in HDR-friendly pipeline

---

## Asset-Spezifikation (praktisch)
- Format: `webp` oder `png` (UI), `webm` nur fuer cine overlays.
- Farbprofil: sRGB.
- Transparenz: premultiplied alpha vermeiden (sauberes compositing).
- Namensschema:
  - `board_surface_base.webp`
  - `zone_board_glow.webp`
  - `zone_bank_glow.webp`
  - `drop_hint_valid.webp`
  - `card_rim_gold.webp`
  - `fx_hit_spark_01.webp`

---

## Priorisierte Umsetzungsreihenfolge
1. Phase 1 Interaction
2. Phase 2 Rendering
3. Phase 3 Visual Polish
4. Asset-Pack B
5. Erst dann Entscheidung ueber Three.js

---

## Definition of Done (Refactor)
- Shop nur drag-buy.
- Board/BANK Bedienung ohne Slot-Denken moeglich.
- Leere Slot-Rahmen nicht mehr dauerhaft sichtbar.
- Reorder und Play/Move ohne Inkonsistenzen.
- Combat-Replay und Result timing weiterhin korrekt.

