export type CombatOwnerId = "A" | "B";

export type GameEvent =
  | {
      type: "ROUND_START";
      round: number;
      playerId: string;
    }
  | {
      type: "ATTACK_HIT";
      sourceOwnerId: CombatOwnerId;
      sourceSlotIndex: number;
      sourceUnitName: string;
      targetOwnerId: CombatOwnerId;
      targetSlotIndex: number;
      targetUnitName: string;
      damageToTarget: number;
      damageToSource: number;
    }
  | {
      type: "UNIT_DIED";
      ownerId: CombatOwnerId;
      slotIndex: number;
      unitName: string;
      killerOwnerId?: CombatOwnerId;
      killerSlotIndex?: number;
      killerUnitName?: string;
    };
