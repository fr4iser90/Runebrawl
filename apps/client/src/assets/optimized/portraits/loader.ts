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

const unitBackplateModules = import.meta.glob("./backplates/units/*.{png,webp,jpg,jpeg,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

const heroBackplateModules = import.meta.glob("./backplates/heroes/*.{png,webp,jpg,jpeg,svg}", {
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
const unitBackplateLookup = buildLookup(unitBackplateModules, "portrait_bg_unit_");
const heroBackplateLookup = buildLookup(heroBackplateModules, "portrait_bg_hero_");

const DEFAULT_UNIT_BACKPLATE_KEY = "neutral_void";
const DEFAULT_HERO_BACKPLATE_KEY = "command_aegis";

const HERO_BACKPLATE_BY_ID: Record<string, string> = {
  hero_recruiter_queen: "arcane_summit",
  recruiter_queen: "arcane_summit",
  hero_iron_guardian: "command_aegis",
  iron_guardian: "command_aegis",
  hero_gold_baron: "command_aegis",
  gold_baron: "command_aegis",
  hero_war_chanter: "command_aegis",
  war_chanter: "command_aegis"
};

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

export function unitPortraitBackplatePath(unitId: string): string | null {
  const normalized = normalizeId(unitId);
  return (
    unitBackplateLookup[normalized] ??
    unitBackplateLookup[`portrait_bg_unit_${normalized}`] ??
    unitBackplateLookup[DEFAULT_UNIT_BACKPLATE_KEY] ??
    unitBackplateLookup[`portrait_bg_unit_${DEFAULT_UNIT_BACKPLATE_KEY}`] ??
    null
  );
}

export function heroPortraitBackplatePath(heroId: string): string | null {
  const normalized = normalizeId(heroId);
  const mapped = HERO_BACKPLATE_BY_ID[normalized];
  return (
    heroBackplateLookup[normalized] ??
    heroBackplateLookup[`portrait_bg_hero_${normalized}`] ??
    (mapped
      ? heroBackplateLookup[mapped] ?? heroBackplateLookup[`portrait_bg_hero_${mapped}`]
      : null) ??
    heroBackplateLookup[DEFAULT_HERO_BACKPLATE_KEY] ??
    heroBackplateLookup[`portrait_bg_hero_${DEFAULT_HERO_BACKPLATE_KEY}`] ??
    null
  );
}

