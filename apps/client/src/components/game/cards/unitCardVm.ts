import type { AbilityKey, SynergyKey, UnitDefinition, UnitInstance, UnitRole, UnitRace } from "@runebrawl/shared";

export type CardSurface = "shop" | "board" | "bench";

export interface UnitCardVM {
  id: string;
  name: string;
  tier: number;
  cost?: number;
  portraitUnitId: string;
  role: UnitRole;
  race?: UnitRace;
  archetype?: string;
  keywords: string[];
  tags: SynergyKey[];
  stats: {
    atk: number;
    hp: number;
    speed?: number;
    armor?: number;
  };
  progress?: { current: number; target: number };
  surface: CardSurface;
  interactive: {
    canBuy?: boolean;
    canSell?: boolean;
    canDrag?: boolean;
  };
  ability: AbilityKey;
}

export function unitCardFromDefinition(
  unit: UnitDefinition,
  surface: CardSurface,
  opts?: { cost?: number; canBuy?: boolean; canDrag?: boolean }
): UnitCardVM {
  return {
    id: unit.id,
    name: unit.name,
    tier: unit.tier,
    cost: opts?.cost,
    portraitUnitId: unit.id,
    role: unit.role,
    race: unit.race,
    keywords: unit.ability === "NONE" ? [] : [unit.ability],
    tags: unit.tags ?? [],
    stats: {
      atk: unit.attack,
      hp: unit.hp,
      speed: unit.speed
    },
    surface,
    interactive: {
      canBuy: opts?.canBuy,
      canDrag: opts?.canDrag
    },
    ability: unit.ability
  };
}

export function unitCardFromInstance(
  unit: UnitInstance,
  surface: CardSurface,
  opts?: { canSell?: boolean; canDrag?: boolean }
): UnitCardVM {
  return {
    id: unit.instanceId,
    name: unit.name,
    tier: unit.level,
    portraitUnitId: unit.unitId,
    role: unit.role,
    race: unit.race,
    keywords: unit.ability === "NONE" ? [] : [unit.ability],
    tags: unit.tags ?? [],
    stats: {
      atk: unit.attack,
      hp: unit.hp,
      speed: unit.speed
    },
    surface,
    interactive: {
      canSell: opts?.canSell,
      canDrag: opts?.canDrag
    },
    ability: unit.ability
  };
}
