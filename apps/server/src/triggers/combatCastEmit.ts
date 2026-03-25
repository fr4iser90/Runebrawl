import type { AbilityKey } from "@runebrawl/shared";

export type CombatOwnerId = "A" | "B";

export interface AbilityTriggeredPayload {
  sourceOwnerId: CombatOwnerId;
  sourceSlotIndex: number;
  sourceUnitName: string;
  abilityKey: AbilityKey;
  message: string;
}

export function emitCastOnDeath(args: {
  unit: {
    ownerId: CombatOwnerId;
    slotIndex: number;
    unitName: string;
    castOnDeath?: AbilityKey;
  };
  emitAbilityTriggered: (payload: AbilityTriggeredPayload) => void;
}): void {
  const cast = args.unit.castOnDeath;
  if (!cast || cast === "NONE") return;

  args.emitAbilityTriggered({
    sourceOwnerId: args.unit.ownerId,
    sourceSlotIndex: args.unit.slotIndex,
    sourceUnitName: args.unit.unitName,
    abilityKey: cast,
    message: `${args.unit.unitName} casts ${cast} on death.`
  });
}

export function emitCastOnKill(args: {
  attacker: {
    ownerId: CombatOwnerId;
    slotIndex: number;
    unitName: string;
    castOnKill?: AbilityKey;
  };
  defeated: { unitName: string };
  emitAbilityTriggered: (payload: AbilityTriggeredPayload) => void;
}): void {
  const cast = args.attacker.castOnKill;
  if (!cast || cast === "NONE") return;

  args.emitAbilityTriggered({
    sourceOwnerId: args.attacker.ownerId,
    sourceSlotIndex: args.attacker.slotIndex,
    sourceUnitName: args.attacker.unitName,
    abilityKey: cast,
    message: `${args.attacker.unitName} casts ${cast} on kill (${args.defeated.unitName}).`
  });
}
