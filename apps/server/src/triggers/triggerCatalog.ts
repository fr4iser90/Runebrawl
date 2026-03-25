/**
 * Central trigger vocabulary: *when* something happens in the engine (time / phase).
 * Unit JSON references optional `castOn*` fields; handlers resolve the cast `AbilityKey` later.
 *
 * Add new names here first, then wire the engine hook once (combat / match / shop).
 */
export const TRIGGER_EVENTS = {
  /** Unit died in combat — evaluate `castOnDeath` */
  COMBAT_UNIT_DIED_CAST: "COMBAT_UNIT_DIED_CAST",
  /** Attacker scored a kill in combat — evaluate `castOnKill` */
  COMBAT_UNIT_KILL_CAST: "COMBAT_UNIT_KILL_CAST"
} as const;

export type CombatTriggerEvent = (typeof TRIGGER_EVENTS)[keyof typeof TRIGGER_EVENTS];
