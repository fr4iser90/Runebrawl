import type { UnitDefinition } from "@runebrawl/shared";
import { UNIT_DEFINITIONS } from "./units/index.js";

function normalizeUnit(unit: UnitDefinition): UnitDefinition {
  return {
    ...unit,
    shopWeight: Number.isFinite(unit.shopWeight) && (unit.shopWeight ?? 0) > 0 ? unit.shopWeight : 1
  };
}

export let UNIT_POOL: UnitDefinition[] = UNIT_DEFINITIONS.map(normalizeUnit);

export function unitsForTier(tier: number): UnitDefinition[] {
  return UNIT_POOL.filter((u) => u.tier <= tier);
}

export function replaceUnitPool(next: UnitDefinition[]): void {
  UNIT_POOL = next.map((unit) =>
    normalizeUnit({
      ...unit,
      tags: unit.tags ? [...unit.tags] : undefined
    })
  );
}
