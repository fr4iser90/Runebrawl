1) Art-Pipeline festlegen (einmalig)
Style wählen: entweder pixel (Aseprite) oder painted-flat (GIMP) — nicht mischen.
Licht-Richtung: immer z. B. links oben.
Silhouette first: Unit muss in klein (64px) sofort erkennbar sein.
Farbcodes pro Rolle: Tank blau, Melee rot, Ranged grün, Support violett (nur Akzent, nicht Vollfarbe).
2) Portrait-Format (empfohlen)
Für konsistente Slots:

Master-Format (alle Portraits): 512x640 (4:5)
Safe Area: innen ca. 448x576 (Ränder frei lassen)
Export für Spiel: 256x320 (.webp + optional .png)
Thumbnail: 128x160 (für kleine UI-Liste)
Wenn du Pixel-Art willst (Aseprite):

Zeichne in 128x160
Export 2x auf 256x320 mit nearest-neighbor (kein blur)
3) Dateinamen + Ordner
Leg es so an:

apps/client/src/assets/optimized/portraits/units/unit_<unitId>.webp
apps/client/src/assets/optimized/portraits/heroes/hero_<heroId>.webp
Fallback:
.../units/unit_placeholder.webp
.../heroes/hero_placeholder.webp
Beispiel:

unit_alley_blade.webp
hero_warchief.webp
4) Produktions-Checkliste pro Portrait
Vor Export immer kurz prüfen:

Kopf/Fokus im oberen 60%
Kontrast gegen dunklen Hintergrund passt
Bei 64px noch lesbar
Kein Text im Bild
Transparenter Hintergrund (wenn möglich)
5) GIMP Workflow (painted)
Datei: 512x640, transparent
Gruppen:
bg shape
character
fx
outline
Export:
File > Export As > .webp
Qualität ~85–90
Für kleine Version: auf 256x320 runterskalieren (Lanczos ist okay für painted)
6) Aseprite Workflow (pixel)
Datei: 128x160, indexed palette (z. B. 24–32 Farben)
1px outline, klare Flächen, wenig Dithering
Export 2x:
Sprite export 256x320
Scaling: nearest
Danach optional .webp konvertieren (oder PNG lassen)