import type { HeroDefinition, UnitDefinition, UnitRole } from "@runebrawl/shared";

/** Late tiers for roster checks (aligns with `BALANCE.maxTavernTier` in server balance). */
const LATE_TIER_FLOOR = 5;

/** Combat VFX / attack-style bucket (aligns with client `attackArchetypeFromRole`). */
export type CombatArchetype = "melee" | "ranged" | "magic";

export function combatArchetypeFromRole(role: UnitRole): CombatArchetype {
  if (role === "Melee" || role === "Tank") return "melee";
  if (role === "Ranged") return "ranged";
  return "magic";
}

function effectiveShopWeight(u: UnitDefinition): number {
  const w = u.shopWeight;
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : 1;
}

function inc(map: Record<string, number>, key: string, delta = 1): void {
  map[key] = (map[key] ?? 0) + delta;
}

function incTier(map: Record<number, number>, key: number, delta = 1): void {
  map[key] = (map[key] ?? 0) + delta;
}

export interface RosterAnalysis {
  unitCount: number;
  heroCount: number;
  byRole: Record<string, number>;
  byRace: Record<string, number>;
  byTier: Record<number, number>;
  byAbility: Record<string, number>;
  byCombatArchetype: Record<CombatArchetype, number>;
  byTag: Record<string, number>;
  byMagicSpell: Record<string, number>;
  unitsMissingRace: number;
  shopWeight: { min: number; max: number; avg: number } | null;
  heroesByRace: Record<string, number>;
  heroesMissingRace: number;
  heroesByPowerType: Record<string, number>;
  heroesByPowerKey: Record<string, number>;
  /** Units per tier bucket per role (for late-game coverage checks). */
  byRoleByTier: Record<string, Record<number, number>>;
  /** Highest unit tier present in the catalog. */
  maxUnitTier: number;
  /** Sum of effective shop weights per combat attack style; `sharePct` = % of total weight. */
  shopCombatArchetype: Record<
    CombatArchetype,
    { weightSum: number; unitCount: number; sharePct: number }
  > | null;
  /** i18n keys under `admin.roster.warning.*` */
  warningKeys: {
    key: string;
    count?: number;
    tier?: number;
    race?: string;
    role?: string;
    tag?: string;
    archetype?: string;
    pct?: number;
    lateTier?: number;
  }[];
}

export function analyzeContentRoster(units: UnitDefinition[], heroes: HeroDefinition[]): RosterAnalysis {
  const byRole: Record<string, number> = {};
  const byRace: Record<string, number> = {};
  const byTier: Record<number, number> = {};
  const byAbility: Record<string, number> = {};
  const byCombatArchetype: Record<CombatArchetype, number> = { melee: 0, ranged: 0, magic: 0 };
  const byTag: Record<string, number> = {};
  const byMagicSpell: Record<string, number> = {};
  let unitsMissingRace = 0;
  const heroesByRace: Record<string, number> = {};
  const heroesByPowerType: Record<string, number> = {};
  const heroesByPowerKey: Record<string, number> = {};
  let heroesMissingRace = 0;

  const weights: number[] = [];
  const byRoleByTier: Record<string, Record<number, number>> = {};
  let maxUnitTier = 0;
  const shopCaSums: Record<CombatArchetype, number> = { melee: 0, ranged: 0, magic: 0 };

  for (const u of units) {
    inc(byRole, u.role);
    if (u.race) inc(byRace, u.race);
    else unitsMissingRace += 1;
    incTier(byTier, u.tier);
    maxUnitTier = Math.max(maxUnitTier, u.tier);
    if (!byRoleByTier[u.role]) byRoleByTier[u.role] = {};
    incTier(byRoleByTier[u.role], u.tier);
    inc(byAbility, u.ability);
    const ca = combatArchetypeFromRole(u.role);
    byCombatArchetype[ca] += 1;
    shopCaSums[ca] += effectiveShopWeight(u);
    for (const tag of u.tags ?? []) {
      inc(byTag, tag);
    }
    if (u.magicSpell) inc(byMagicSpell, u.magicSpell);
    if (typeof u.shopWeight === "number" && Number.isFinite(u.shopWeight)) weights.push(u.shopWeight);
  }

  for (const h of heroes) {
    if (h.race) inc(heroesByRace, h.race);
    else heroesMissingRace += 1;
    inc(heroesByPowerType, h.powerType);
    inc(heroesByPowerKey, h.powerKey);
  }

  let shopWeight: RosterAnalysis["shopWeight"] = null;
  if (weights.length > 0) {
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    shopWeight = { min, max, avg };
  }

  const warningKeys: RosterAnalysis["warningKeys"] = [];

  let shopCombatArchetype: RosterAnalysis["shopCombatArchetype"] = null;
  if (units.length > 0) {
    const wTotal = shopCaSums.melee + shopCaSums.ranged + shopCaSums.magic;
    const pct = (x: number) => (wTotal > 0 ? Math.round((x / wTotal) * 1000) / 10 : 0);
    shopCombatArchetype = {
      melee: { weightSum: shopCaSums.melee, unitCount: byCombatArchetype.melee, sharePct: pct(shopCaSums.melee) },
      ranged: {
        weightSum: shopCaSums.ranged,
        unitCount: byCombatArchetype.ranged,
        sharePct: pct(shopCaSums.ranged)
      },
      magic: { weightSum: shopCaSums.magic, unitCount: byCombatArchetype.magic, sharePct: pct(shopCaSums.magic) }
    };
  }

  for (const [tag, n] of Object.entries(byTag)) {
    if (n <= 2) {
      warningKeys.push({ key: "tagThinCoverage", tag, count: n });
    }
  }

  if (units.length >= 4) {
    for (const a of ["melee", "ranged", "magic"] as CombatArchetype[]) {
      if (byCombatArchetype[a] === 1) {
        warningKeys.push({ key: "thinCombatStyle", archetype: a });
      }
    }
  }

  if (maxUnitTier >= LATE_TIER_FLOOR && units.length >= 5) {
    for (const role of Object.keys(byRole)) {
      const n = byRole[role] ?? 0;
      if (n < 3) continue;
      const tierMap = byRoleByTier[role] ?? {};
      let high = 0;
      for (const [t, c] of Object.entries(tierMap)) {
        const ti = Number(t);
        if (ti >= LATE_TIER_FLOOR) high += c;
      }
      if (high === 0) {
        warningKeys.push({ key: "roleMissingLateTier", role, lateTier: LATE_TIER_FLOOR });
      }
    }
  }

  if (units.length >= 4 && shopCombatArchetype) {
    const wTotal =
      shopCombatArchetype.melee.weightSum +
      shopCombatArchetype.ranged.weightSum +
      shopCombatArchetype.magic.weightSum;
    if (wTotal > 0) {
      for (const a of ["melee", "ranged", "magic"] as CombatArchetype[]) {
        const row = shopCombatArchetype[a];
        if (row.unitCount < 2) continue;
        const share = row.weightSum / wTotal;
        const uniform = row.unitCount / units.length;
        if (uniform > 0 && share < uniform * 0.55) {
          warningKeys.push({
            key: "combatArchetypeShopUnder",
            archetype: a,
            pct: Math.round(share * 100)
          });
        }
      }
    }
  }

  for (const [race, n] of Object.entries(byRace)) {
    if (n === 1) {
      warningKeys.push({ key: "singleUnitRace", race, count: n });
    }
  }

  const roleVals = Object.values(byRole);
  if (roleVals.length >= 2) {
    const maxR = Math.max(...roleVals);
    const minR = Math.min(...roleVals);
    if (minR > 0 && maxR / minR >= 4) {
      warningKeys.push({ key: "roleSkew", count: Math.round((maxR / minR) * 10) / 10 });
    }
  }

  if (unitsMissingRace > 0) {
    warningKeys.push({ key: "unitsNoRace", count: unitsMissingRace });
  }
  if (heroesMissingRace > 0) {
    warningKeys.push({ key: "heroesNoRace", count: heroesMissingRace });
  }

  const ca = byCombatArchetype;
  if (units.length >= 6) {
    const m = Math.max(ca.melee, ca.ranged, ca.magic);
    const mi = Math.min(ca.melee, ca.ranged, ca.magic);
    if (mi > 0 && m / mi >= 3) {
      warningKeys.push({ key: "combatArchetypeSkew" });
    }
  }

  return {
    unitCount: units.length,
    heroCount: heroes.length,
    byRole,
    byRace,
    byTier,
    byAbility,
    byCombatArchetype,
    byTag,
    byMagicSpell,
    unitsMissingRace,
    shopWeight,
    heroesByRace,
    heroesMissingRace,
    heroesByPowerType,
    heroesByPowerKey,
    byRoleByTier,
    maxUnitTier,
    shopCombatArchetype,
    warningKeys
  };
}

export function sortedEntries(map: Record<string, number>): { key: string; count: number }[] {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function sortedTierEntries(map: Record<number, number>): { tier: number; count: number }[] {
  return Object.entries(map)
    .map(([k, count]) => ({ tier: Number(k), count }))
    .sort((a, b) => a.tier - b.tier);
}

/** Matrix rows for admin UI: fixed `roles` order, tiers 1..`columnCount`. */
export function roleTierMatrixRows(
  byRoleByTier: Record<string, Record<number, number>>,
  roles: readonly string[],
  columnCount: number
): { role: string; cells: number[] }[] {
  const n = Math.max(1, Math.min(12, columnCount));
  return roles.map((role) => ({
    role,
    cells: Array.from({ length: n }, (_, i) => byRoleByTier[role]?.[i + 1] ?? 0)
  }));
}
