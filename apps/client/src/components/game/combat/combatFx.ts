export type CombatSide = "me" | "enemy";

export type CombatFxKey =
  | "attack"
  | "windup"
  | "hit"
  | "recover"
  | "death"
  | "damagePop";

/**
 * Central mapping from semantic combat FX → CSS class names.
 *
 * Keep this file UI-agnostic: it only defines names and small helpers.
 * Actual animations live in `styles/layout/combat.css`.
 */
export const COMBAT_FX_CLASS: Record<CombatFxKey, string> = {
  attack: "pulse-attack",
  windup: "pulse-windup",
  hit: "pulse-hit",
  recover: "pulse-recover",
  death: "dead-fade",
  damagePop: "damage-pop"
};

export function fxClasses(keys: (CombatFxKey | null | undefined)[]): string[] {
  return keys.filter(Boolean).map((k) => COMBAT_FX_CLASS[k as CombatFxKey]);
}

