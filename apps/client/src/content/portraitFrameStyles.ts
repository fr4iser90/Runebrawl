/** Cosmetic portrait / shop-card frame variants for preview UIs (Suggest wizard, Admin). Not yet wired to live shop. */

export const PORTRAIT_FRAME_IDS = ["shop_tier", "minimal", "ornate", "rim"] as const;
export type PortraitFrameId = (typeof PORTRAIT_FRAME_IDS)[number];

export const DEFAULT_PORTRAIT_FRAME_ID: PortraitFrameId = "shop_tier";

export function isPortraitFrameId(value: string): value is PortraitFrameId {
  return (PORTRAIT_FRAME_IDS as readonly string[]).includes(value);
}

export function coercePortraitFrameId(value: unknown): PortraitFrameId {
  return typeof value === "string" && isPortraitFrameId(value) ? value : DEFAULT_PORTRAIT_FRAME_ID;
}
