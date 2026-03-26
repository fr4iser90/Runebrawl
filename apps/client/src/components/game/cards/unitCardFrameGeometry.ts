/**
 * Geometry for `PortraitFrameSvg` **ornate** + **unitShopCard** (viewBox `0 0 100 172`).
 * Keep in sync with `components/shared/PortraitFrameSvg.vue` — corner studs `<circle cx cy r>`.
 *
 * The live SVG uses `preserveAspectRatio="none"`; the same box maps to `.unit-card-chrome`
 * (inset 0). Use `studCenterStyle` + `studBadgeBoxStyle` so HTML badges align with stud centers.
 */

export const UNIT_SHOP_CARD_VIEWBOX = {
  width: 100,
  height: 172
} as const;

export type OrnateStudCorner = "tl" | "tr" | "br" | "bl";

export interface OrnateStudCircle {
  corner: OrnateStudCorner;
  /** viewBox X */
  cx: number;
  /** viewBox Y */
  cy: number;
  /** radius in viewBox units (same space as width 100) */
  r: number;
}

/** Decorative gold studs on the ornate full card frame (`unitShopCard` scope). */
export const ORNATE_UNIT_SHOP_CARD_STUDS: readonly OrnateStudCircle[] = [
  { corner: "tl", cx: 5.5, cy: 5, r: 2.3 },
  { corner: "tr", cx: 94.5, cy: 5, r: 2.3 },
  { corner: "br", cx: 94.5, cy: 167, r: 2.3 },
  { corner: "bl", cx: 5.5, cy: 167, r: 2.3 }
] as const;

export function studCenterStyle(cx: number, cy: number): Record<string, string> {
  const leftPct = (cx / UNIT_SHOP_CARD_VIEWBOX.width) * 100;
  const topPct = (cy / UNIT_SHOP_CARD_VIEWBOX.height) * 100;
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    transform: "translate(-50%, -50%)"
  };
}

/**
 * HTML badges are larger than the SVG stud circles so values stay readable; centers still match
 * `studCenterStyle` (same cx/cy as PortraitFrameSvg).
 */
export const STUD_BADGE_DISPLAY_SCALE = 2.35;

/**
 * Ellipse matching the SVG stroke circle under non-uniform stretch (width maps to 100, height to 172),
 * optionally scaled up for display (`STUD_BADGE_DISPLAY_SCALE`).
 */
export function studBadgeBoxStyle(r: number, scale: number = STUD_BADGE_DISPLAY_SCALE): Record<string, string> {
  const rVis = r * scale;
  const wPct = ((2 * rVis) / UNIT_SHOP_CARD_VIEWBOX.width) * 100;
  const hPct = ((2 * rVis) / UNIT_SHOP_CARD_VIEWBOX.height) * 100;
  return {
    width: `${wPct}%`,
    height: `${hPct}%`,
    maxWidth: `${wPct}%`,
    maxHeight: `${hPct}%`,
    minWidth: "1.35rem",
    minHeight: "1.1rem"
  };
}

export function studByCorner(corner: OrnateStudCorner): OrnateStudCircle {
  const s = ORNATE_UNIT_SHOP_CARD_STUDS.find((x) => x.corner === corner);
  if (!s) throw new Error(`Unknown stud corner: ${corner}`);
  return s;
}

/** Bottom edge, centered between BL/BR studs — ability icon (same Y as corner studs). */
export const ORNATE_BOTTOM_CENTER_ABILITY = {
  cx: 50,
  cy: 167,
  r: 2.35
} as const;
