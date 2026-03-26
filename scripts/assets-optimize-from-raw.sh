#!/usr/bin/env bash
# Mirror: apps/client/src/assets/raw/**.(png|tif|tiff) → apps/client/src/assets/optimized/**/*.webp
# Run from repo root: npm run assets:optimize
# Requires: cwebp (nix-shell provides libwebp)
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
RAW="$ROOT/apps/client/src/assets/raw"
OUT="$ROOT/apps/client/src/assets/optimized"
WEBP_QUALITY="${WEBP_QUALITY:-85}"

if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp not found. Use: nix-shell" >&2
  exit 1
fi

if [[ ! -d "$RAW" ]]; then
  echo "Missing raw dir: $RAW" >&2
  exit 1
fi

mkdir -p "$OUT"
count=0
while IFS= read -r -d '' src; do
  rel="${src#$RAW/}"
  base="${rel%.*}"
  dst="$OUT/${base}.webp"
  mkdir -p "$(dirname "$dst")"
  if [[ -f "$dst" ]] && [[ "$dst" -nt "$src" ]]; then
    continue
  fi
  echo "cwebp: $rel → optimized/${base}.webp"
  cwebp -quiet -q "$WEBP_QUALITY" "$src" -o "$dst"
  count=$((count + 1))
done < <(find "$RAW" -type f \( -iname '*.png' -o -iname '*.tif' -o -iname '*.tiff' \) -print0)

echo "Done. Converted or refreshed: $count file(s) (skipped up-to-date)."
