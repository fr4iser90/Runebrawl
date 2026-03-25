import type { AbilityKey, UnitInstance } from "@runebrawl/shared";
import { SeededRng } from "./rng.js";
import { applyEffect } from "../rules/effectRegistry.js";
import type { GameEvent } from "../rules/events.js";

interface CombatUnit extends UnitInstance {
  ownerId: "A" | "B";
  slotIndex: number;
  alive: boolean;
  nextActionAt: number;
}

export interface CombatStepEvent {
  type: "ATTACK" | "UNIT_DIED" | "ABILITY_TRIGGERED";
  sourceOwnerId?: "A" | "B";
  sourceSlotIndex?: number;
  sourceUnitName?: string;
  targetOwnerId?: "A" | "B";
  targetSlotIndex?: number;
  targetUnitName?: string;
  abilityKey?: AbilityKey;
  message: string;
}

export interface CombatResult {
  winner: "A" | "B" | "DRAW";
  survivorsA: number;
  survivorsB: number;
  log: string[];
  events: CombatStepEvent[];
}

function pushAbilityTriggeredEvent(
  events: CombatStepEvent[],
  payload: Omit<CombatStepEvent, "type"> & { abilityKey: AbilityKey }
): void {
  if (!payload.abilityKey) {
    throw new Error("Combat integrity violation: ABILITY_TRIGGERED event requires abilityKey.");
  }
  events.push({
    type: "ABILITY_TRIGGERED",
    ...payload
  });
}

function assertCombatEventsIntegrity(events: CombatStepEvent[]): void {
  for (const event of events) {
    if (event.type !== "ABILITY_TRIGGERED") continue;
    if (!event.abilityKey) {
      throw new Error("Combat integrity violation: ABILITY_TRIGGERED event missing abilityKey.");
    }
  }
}

function living(units: CombatUnit[]): CombatUnit[] {
  return units.filter((u) => u.alive);
}

function isFrontline(slotIndex: number): boolean {
  return slotIndex < 3;
}

function selectTarget(attacker: CombatUnit, enemy: CombatUnit[], rng: SeededRng): CombatUnit | undefined {
  const aliveEnemies = enemy.filter((u) => u.alive);
  if (aliveEnemies.length === 0) return undefined;

  const taunts = aliveEnemies.filter((u) => u.ability === "TAUNT");
  if (taunts.length > 0) {
    return taunts[rng.int(taunts.length)];
  }

  if (attacker.role === "Melee" || attacker.role === "Tank") {
    const frontline = aliveEnemies.filter((u) => isFrontline(u.slotIndex));
    if (frontline.length > 0) {
      return frontline[rng.int(frontline.length)];
    }
  }

  return aliveEnemies[rng.int(aliveEnemies.length)];
}

function nextActor(all: CombatUnit[], rng: SeededRng): CombatUnit | undefined {
  const alive = all.filter((u) => u.alive);
  if (alive.length === 0) return undefined;
  alive.sort((a, b) => {
    if (a.nextActionAt !== b.nextActionAt) return a.nextActionAt - b.nextActionAt;
    if (a.speed !== b.speed) return b.speed - a.speed;
    if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
    return a.ownerId.localeCompare(b.ownerId);
  });
  const top = alive[0];
  const tied = alive.filter((u) => u.nextActionAt === top.nextActionAt && u.speed === top.speed);
  if (tied.length > 1) return tied[rng.int(tied.length)];
  return top;
}

function onDeath(
  unit: CombatUnit,
  allies: CombatUnit[],
  enemies: CombatUnit[],
  log: string[],
  events: CombatStepEvent[],
  rng: SeededRng
): void {
  if (unit.ability !== "DEATH_BURST") return;
  const target = selectTarget(unit, enemies, rng);
  if (!target) return;
  const beforeLogLen = log.length;
  const event: GameEvent = {
    type: "UNIT_DIED",
    ownerId: unit.ownerId as "A" | "B",
    slotIndex: unit.slotIndex,
    unitName: unit.name
  };
  applyEffect(
    "DEATH_BURST_ON_DEATH",
    event,
    { sourceUnit: unit, targetUnit: target, log },
    { damage: 2 }
  );
  const newLogs = log.slice(beforeLogLen);
  for (const message of newLogs) {
    pushAbilityTriggeredEvent(events, {
      sourceOwnerId: unit.ownerId as "A" | "B",
      sourceSlotIndex: unit.slotIndex,
      sourceUnitName: unit.name,
      targetOwnerId: target.ownerId as "A" | "B",
      targetSlotIndex: target.slotIndex,
      targetUnitName: target.name,
      abilityKey: "DEATH_BURST",
      message
    });
  }
  if (target.hp <= 0 && target.alive) {
    target.alive = false;
    const deathMessage = `${target.name} dies.`;
    log.push(deathMessage);
    events.push({
      type: "UNIT_DIED",
      sourceOwnerId: target.ownerId as "A" | "B",
      sourceSlotIndex: target.slotIndex,
      sourceUnitName: target.name,
      message: deathMessage
    });
    onDeath(target, enemies, allies, log, events, rng);
  }
}

function onKill(attacker: CombatUnit, defeated: CombatUnit, log: string[], events: CombatStepEvent[]): void {
  if (attacker.ability !== "BLOODLUST") return;
  const beforeLogLen = log.length;
  const event: GameEvent = {
    type: "UNIT_DIED",
    ownerId: defeated.ownerId as "A" | "B",
    slotIndex: defeated.slotIndex,
    unitName: defeated.name,
    killerOwnerId: attacker.ownerId as "A" | "B",
    killerSlotIndex: attacker.slotIndex,
    killerUnitName: attacker.name
  };
  applyEffect("BLOODLUST_ON_KILL", event, { attacker, log });
  const newLogs = log.slice(beforeLogLen);
  for (const message of newLogs) {
    pushAbilityTriggeredEvent(events, {
      sourceOwnerId: attacker.ownerId as "A" | "B",
      sourceSlotIndex: attacker.slotIndex,
      sourceUnitName: attacker.name,
      abilityKey: "BLOODLUST",
      message
    });
  }
}

function applyOnHitEffects(
  attacker: CombatUnit,
  defender: CombatUnit,
  hitEvent: GameEvent,
  log: string[],
  events: CombatStepEvent[]
): void {
  const beforeLogLen = log.length;
  switch (attacker.ability) {
    case "LIFESTEAL":
      applyEffect("LIFESTEAL_ON_HIT", hitEvent, { sourceUnit: attacker, log }, { ratio: 0.5 });
      break;
    default:
      break;
  }
  const newLogs = log.slice(beforeLogLen);
  for (const message of newLogs) {
    pushAbilityTriggeredEvent(events, {
      sourceOwnerId: attacker.ownerId,
      sourceSlotIndex: attacker.slotIndex,
      sourceUnitName: attacker.name,
      targetOwnerId: defender.ownerId,
      targetSlotIndex: defender.slotIndex,
      targetUnitName: defender.name,
      abilityKey: attacker.ability,
      message
    });
  }
}

export function simulateCombat(
  teamA: UnitInstance[],
  teamB: UnitInstance[],
  seed: number
): CombatResult {
  const rng = new SeededRng(seed);
  const log: string[] = [];
  const events: CombatStepEvent[] = [];

  const a: CombatUnit[] = teamA.map((u, i) => ({
    ...u,
    ownerId: "A",
    slotIndex: i,
    alive: true,
    nextActionAt: 100 / Math.max(1, u.speed)
  }));
  const b: CombatUnit[] = teamB.map((u, i) => ({
    ...u,
    ownerId: "B",
    slotIndex: i,
    alive: true,
    nextActionAt: 100 / Math.max(1, u.speed)
  }));

  let maxIterations = 300;

  while (living(a).length > 0 && living(b).length > 0 && maxIterations > 0) {
    maxIterations -= 1;
    const attacker = nextActor([...a, ...b], rng);
    if (!attacker) break;
    if (!attacker.alive) continue;

    const attackers = attacker.ownerId === "A" ? a : b;
    const defenders = attacker.ownerId === "A" ? b : a;
    const defender = selectTarget(attacker, defenders, rng);
    if (!defender) break;

    const attackMessage = `${attacker.name} attacks ${defender.name}.`;
    log.push(attackMessage);
    events.push({
      type: "ATTACK",
      sourceOwnerId: attacker.ownerId as "A" | "B",
      sourceSlotIndex: attacker.slotIndex,
      sourceUnitName: attacker.name,
      targetOwnerId: defender.ownerId as "A" | "B",
      targetSlotIndex: defender.slotIndex,
      targetUnitName: defender.name,
      message: attackMessage
    });
    const hitEvent: GameEvent = {
      type: "ATTACK_HIT",
      sourceOwnerId: attacker.ownerId,
      sourceSlotIndex: attacker.slotIndex,
      sourceUnitName: attacker.name,
      targetOwnerId: defender.ownerId,
      targetSlotIndex: defender.slotIndex,
      targetUnitName: defender.name,
      damageToTarget: attacker.attack,
      damageToSource: defender.attack
    };
    applyEffect("RESOLVE_ATTACK_HIT", hitEvent, {
      sourceUnit: attacker,
      targetUnit: defender
    });
    applyOnHitEffects(attacker, defender, hitEvent, log, events);

    const defenderDied = defender.hp <= 0 && defender.alive;
    const attackerDied = attacker.hp <= 0 && attacker.alive;

    if (defenderDied) {
      defender.alive = false;
      const defenderDeathMessage = `${defender.name} dies.`;
      log.push(defenderDeathMessage);
      events.push({
        type: "UNIT_DIED",
        sourceOwnerId: defender.ownerId as "A" | "B",
        sourceSlotIndex: defender.slotIndex,
        sourceUnitName: defender.name,
        message: defenderDeathMessage
      });
      onKill(attacker, defender, log, events);
      onDeath(defender, defenders, attackers, log, events, rng);
    }

    if (attackerDied) {
      attacker.alive = false;
      const attackerDeathMessage = `${attacker.name} dies.`;
      log.push(attackerDeathMessage);
      events.push({
        type: "UNIT_DIED",
        sourceOwnerId: attacker.ownerId as "A" | "B",
        sourceSlotIndex: attacker.slotIndex,
        sourceUnitName: attacker.name,
        message: attackerDeathMessage
      });
      onDeath(attacker, attackers, defenders, log, events, rng);
    }

    if (attacker.alive) {
      attacker.nextActionAt += 100 / Math.max(1, attacker.speed);
    }
  }

  const survivorsA = living(a).length;
  const survivorsB = living(b).length;
  const winner = survivorsA === survivorsB ? "DRAW" : survivorsA > survivorsB ? "A" : "B";
  assertCombatEventsIntegrity(events);

  return { winner, survivorsA, survivorsB, log, events };
}
