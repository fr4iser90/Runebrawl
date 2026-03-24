import type { UnitDefinition } from "@runebrawl/shared";
import units from "./units.json";

export const UNIT_POOL: UnitDefinition[] = units as UnitDefinition[];

export function unitsForTier(tier: number): UnitDefinition[] {
  return UNIT_POOL.filter((u) => u.tier <= tier);
}
