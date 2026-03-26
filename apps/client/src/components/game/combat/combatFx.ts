export type CombatSide = "me" | "enemy";

export type CombatFxKey =
  | "attack"
  | "windup"
  | "hit"
  | "recover"
  | "death"
  | "damagePop";

/**
 * Legacy pulse class names (generic fallback when no archetype-specific FX applies).
 *
 * **Replay ATTACK styling** is resolved in `combatFxRegistry.ts`.
 * Styles: `combat.css` (melee), `combat/ranged.css` (ranged draw/release), more categories as needed.
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

