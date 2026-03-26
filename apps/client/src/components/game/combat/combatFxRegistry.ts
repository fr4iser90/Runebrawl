/**
 * Combat FX “engine” layer: maps replay state + unit role → CSS classes and overlay ids.
 *
 * - Add new **archetypes** (ranged, magic, …) and **ability** hooks here.
 * - Keep **motion-heavy** visuals in Vue components under `combat/fx/` later; this file
 *   only returns **class strings** and **overlay ids** the UI can switch on.
 * - Styles stay grouped by category (`melee.css`, `ranged.css`, …) and are imported from `main.ts`.
 */

import type { CombatReplayEvent, MagicSpellVisualId, UnitInstance, UnitRole } from "@runebrawl/shared";

/** Must stay in sync with `GameClient` replay step phases */
export type ReplayFxAnimationPhase =
  | "IDLE"
  | "WINDUP"
  | "HIT"
  | "RECOVER"
  | "ABILITY"
  | "DEATH"
  | "CLEANUP"
  | "RESULT";

export type CombatFxAttackArchetype = "melee" | "ranged" | "magic";

/** Overlays mounted on the attacker slot (`CombatView`). Ranged/magic use Teleport projectiles, not card overlays. */
export type CombatFxOverlayId = "melee_sword";

/** World-space flight segment (client / viewport pixels). */
export interface RangedProjectileFlight {
  from: { side: "me" | "enemy"; slot: number };
  to: { side: "me" | "enemy"; slot: number };
}

export type { MagicSpellVisualId } from "@runebrawl/shared";

export interface MagicProjectileFlight {
  from: { side: "me" | "enemy"; slot: number };
  to: { side: "me" | "enemy"; slot: number };
  spell: MagicSpellVisualId;
}

/** Magic basic-attack projectile: `UnitInstance.magicSpell` from data, else `arcane_missile`. */
export function resolveMagicSpellProjectileId(unit: UnitInstance | null): MagicSpellVisualId {
  if (!unit) return "arcane_missile";
  return unit.magicSpell ?? "arcane_missile";
}

export interface ReplayAttackFxInput {
  phase: ReplayFxAnimationPhase;
  event: CombatReplayEvent | null;
  unit: UnitInstance | null;
  side: "me" | "enemy";
  slotIndex: number;
  /** From duel meta: which owner (A/B) this side maps to; null = no active duel context */
  expectedOwnerForSide: "A" | "B" | null;
}

/** Melee/tank/ranged get role-specific attack FX; Support and any future roles use the magic channel + bolt projectile. */
export function attackArchetypeFromRole(role: UnitRole | undefined): CombatFxAttackArchetype {
  if (role === "Melee" || role === "Tank") return "melee";
  if (role === "Ranged") return "ranged";
  return "magic";
}

function isAttackerSlot(input: ReplayAttackFxInput): boolean {
  const e = input.event;
  if (!e || e.type !== "ATTACK" || input.expectedOwnerForSide === null || !input.unit) return false;
  return (
    e.sourceOwnerId === input.expectedOwnerForSide &&
    e.sourceSlotIndex === input.slotIndex &&
    e.sourceUnitName === input.unit.name
  );
}

function isDefenderSlot(input: ReplayAttackFxInput): boolean {
  const e = input.event;
  if (!e || e.type !== "ATTACK" || input.expectedOwnerForSide === null || !input.unit) return false;
  return (
    e.targetOwnerId === input.expectedOwnerForSide &&
    e.targetSlotIndex === input.slotIndex &&
    e.targetUnitName === input.unit.name
  );
}

/**
 * CSS classes on the **slot** (pulses + archetype `fx-*` groups).
 */
export function resolveReplayAttackSlotClasses(input: ReplayAttackFxInput): string {
  if (!input.unit || !input.event || input.event.type !== "ATTACK" || input.expectedOwnerForSide === null) {
    return "";
  }
  const phase = input.phase;
  if (phase !== "WINDUP" && phase !== "HIT" && phase !== "RECOVER") return "";

  const arche = attackArchetypeFromRole(input.unit.role);
  const attacker = isAttackerSlot(input);
  const defender = isDefenderSlot(input);

  if (attacker && arche === "melee") {
    const dir = input.side === "me" ? "fx-melee-from-me" : "fx-melee-from-enemy";
    if (phase === "WINDUP") return `fx-melee-windup ${dir}`;
    if (phase === "HIT") return `fx-melee-hit ${dir}`;
    if (phase === "RECOVER") return `fx-melee-recover ${dir}`;
  }

  if (attacker && arche === "ranged") {
    const dir = input.side === "me" ? "fx-ranged-from-me" : "fx-ranged-from-enemy";
    if (phase === "WINDUP") return `fx-ranged-draw ${dir}`;
    if (phase === "HIT") return `fx-ranged-release ${dir}`;
    if (phase === "RECOVER") return `fx-ranged-recover ${dir}`;
  }

  if (attacker && arche === "magic") {
    const dir = input.side === "me" ? "fx-magic-from-me" : "fx-magic-from-enemy";
    if (phase === "WINDUP") return `fx-magic-windup ${dir}`;
    if (phase === "HIT") return `fx-magic-hit ${dir}`;
    if (phase === "RECOVER") return `fx-magic-recover ${dir}`;
  }

  if (phase === "WINDUP" && attacker) return "pulse-windup";
  if (phase === "HIT" && attacker) return "pulse-attack";
  if (phase === "HIT" && defender) return "pulse-hit";
  if (phase === "RECOVER" && attacker) return "pulse-recover";
  return "";
}

/**
 * Card-mounted overlay during HIT (melee sword only). Ranged/magic: world projectiles in GameClient.
 */
export function resolveReplayAttackOverlayId(
  input: ReplayAttackFxInput,
  options: { reducedMotion: boolean }
): CombatFxOverlayId | null {
  if (options.reducedMotion) return null;
  if (!input.event || input.event.type !== "ATTACK" || input.expectedOwnerForSide === null) return null;
  if (input.phase !== "HIT") return null;
  if (!isAttackerSlot(input)) return null;
  const arche = attackArchetypeFromRole(input.unit?.role);
  if (arche === "melee") return "melee_sword";
  return null;
}

export interface ReplayAbilityFxInput {
  phase: ReplayFxAnimationPhase;
  event: CombatReplayEvent | null;
  unit: UnitInstance | null;
  side: "me" | "enemy";
  slotIndex: number;
  expectedOwnerForSide: "A" | "B" | null;
}

export interface ReplayDeathFxInput {
  phase: ReplayFxAnimationPhase;
  event: CombatReplayEvent | null;
  unit: UnitInstance | null;
  side: "me" | "enemy";
  slotIndex: number;
  expectedOwnerForSide: "A" | "B" | null;
}

function isAbilitySourceSlot(input: ReplayAbilityFxInput): boolean {
  const e = input.event;
  if (!e || e.type !== "ABILITY_TRIGGERED" || input.expectedOwnerForSide === null || !input.unit) return false;
  if (e.sourceOwnerId === undefined || e.sourceSlotIndex === undefined) return false;
  return (
    e.sourceOwnerId === input.expectedOwnerForSide &&
    e.sourceSlotIndex === input.slotIndex &&
    e.sourceUnitName === input.unit.name
  );
}

function isDeathSourceSlot(input: ReplayDeathFxInput): boolean {
  const e = input.event;
  if (!e || e.type !== "UNIT_DIED" || input.expectedOwnerForSide === null || !input.unit) return false;
  if (e.sourceOwnerId === undefined || e.sourceSlotIndex === undefined) return false;
  return (
    e.sourceOwnerId === input.expectedOwnerForSide &&
    e.sourceSlotIndex === input.slotIndex &&
    e.sourceUnitName === input.unit.name
  );
}

/**
 * Slot classes when `ABILITY_TRIGGERED` is playing (phase `ABILITY`).
 */
export function resolveReplayAbilitySlotClasses(input: ReplayAbilityFxInput): string {
  if (!input.unit || !input.event || input.event.type !== "ABILITY_TRIGGERED" || input.expectedOwnerForSide === null) {
    return "";
  }
  if (input.phase !== "ABILITY") return "";
  if (!isAbilitySourceSlot(input)) return "";
  const dir = input.side === "me" ? "fx-ability-from-me" : "fx-ability-from-enemy";
  return `fx-ability-proc ${dir}`;
}

/**
 * Slot classes for the dying unit during `UNIT_DIED` replay (`DEATH` / `CLEANUP`).
 */
export function resolveReplayDeathSlotClasses(input: ReplayDeathFxInput): string {
  if (!input.unit || !input.event || input.event.type !== "UNIT_DIED" || input.expectedOwnerForSide === null) {
    return "";
  }
  if (input.phase !== "DEATH" && input.phase !== "CLEANUP") return "";
  if (!isDeathSourceSlot(input)) return "";
  if (input.phase === "DEATH") return "fx-death-knell";
  return "fx-death-cleanup";
}
