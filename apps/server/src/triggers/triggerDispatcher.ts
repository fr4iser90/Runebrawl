import { emitCastOnDeath, emitCastOnKill, type AbilityTriggeredPayload, type CombatOwnerId } from "./combatCastEmit.js";
import { TRIGGER_EVENTS, type CombatTriggerEvent } from "./triggerCatalog.js";
import type { AbilityKey } from "@runebrawl/shared";

export type { AbilityTriggeredPayload, CombatOwnerId, CombatTriggerEvent };
export { TRIGGER_EVENTS };

export type CombatTriggerDispatch =
  | {
      type: typeof TRIGGER_EVENTS.COMBAT_UNIT_DIED_CAST;
      unit: {
        ownerId: CombatOwnerId;
        slotIndex: number;
        unitName: string;
        castOnDeath?: AbilityKey;
      };
      emitAbilityTriggered: (payload: AbilityTriggeredPayload) => void;
    }
  | {
      type: typeof TRIGGER_EVENTS.COMBAT_UNIT_KILL_CAST;
      attacker: {
        ownerId: CombatOwnerId;
        slotIndex: number;
        unitName: string;
        castOnKill?: AbilityKey;
      };
      defeated: { unitName: string };
      emitAbilityTriggered: (payload: AbilityTriggeredPayload) => void;
    };

/**
 * Single entry for combat-scoped triggers. Pass a discriminated payload (`type` = catalog event).
 */
export function dispatchCombatTrigger(payload: CombatTriggerDispatch): void {
  if (payload.type === TRIGGER_EVENTS.COMBAT_UNIT_DIED_CAST) {
    emitCastOnDeath({
      unit: payload.unit,
      emitAbilityTriggered: payload.emitAbilityTriggered
    });
    return;
  }
  emitCastOnKill({
    attacker: payload.attacker,
    defeated: payload.defeated,
    emitAbilityTriggered: payload.emitAbilityTriggered
  });
}
