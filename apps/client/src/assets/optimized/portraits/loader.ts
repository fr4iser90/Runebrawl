import unitPlaceholder from "./unit-placeholder.svg";
import heroPlaceholder from "./hero-placeholder.svg";

const unitPortraitModules = import.meta.glob("./units/*.{png,webp,jpg,jpeg,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

const heroPortraitModules = import.meta.glob("./heroes/*.{png,webp,jpg,jpeg,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

function normalizeId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function buildLookup(modules: Record<string, string>, prefix: string): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const [path, assetUrl] of Object.entries(modules)) {
    const fileName = path.split("/").pop() ?? "";
    const stem = fileName.replace(/\.[^.]+$/, "");
    const normalized = normalizeId(stem);
    lookup[normalized] = assetUrl;
    if (normalized.startsWith(prefix)) {
      lookup[normalized.slice(prefix.length)] = assetUrl;
    }
  }
  return lookup;
}

const unitLookup = buildLookup(unitPortraitModules, "unit_");
const heroLookup = buildLookup(heroPortraitModules, "hero_");

function resolveUnitPortrait(unitId: string): string | null {
  const normalized = normalizeId(unitId);
  return unitLookup[normalized] ?? unitLookup[`unit_${normalized}`] ?? null;
}

function resolveHeroPortrait(heroId: string): string | null {
  const normalized = normalizeId(heroId);
  return heroLookup[normalized] ?? heroLookup[`hero_${normalized}`] ?? null;
}

export function unitPortraitPath(unitId: string): string {
  return resolveUnitPortrait(unitId) ?? unitPlaceholder;
}

export function heroPortraitPath(heroId: string): string {
  return resolveHeroPortrait(heroId) ?? heroPlaceholder;
}

export function hasUnitPortrait(unitId: string): boolean {
  return !!resolveUnitPortrait(unitId);
}

export function hasHeroPortrait(heroId: string): boolean {
  return !!resolveHeroPortrait(heroId);
}

