import type { AbilityKey, SynergyKey, UnitInstance } from "@runebrawl/shared";
import { SeededRng } from "./rng.js";
import { applyEffect } from "../rules/effectRegistry.js";
import type { GameEvent } from "../rules/events.js";
import { TRIGGER_EVENTS, dispatchCombatTrigger } from "../triggers/triggerDispatcher.js";

interface CombatUnit extends UnitInstance {
  ownerId: "A" | "B";
  slotIndex: number;
  alive: boolean;
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
  synergyKey?: SynergyKey;
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
  payload: Omit<CombatStepEvent, "type"> & { abilityKey?: AbilityKey; synergyKey?: SynergyKey }
): void {
  if (!payload.abilityKey && !payload.synergyKey) {
    throw new Error("Combat integrity violation: ABILITY_TRIGGERED event requires abilityKey or synergyKey.");
  }
  events.push({
    type: "ABILITY_TRIGGERED",
    ...payload
  });
}

function assertCombatEventsIntegrity(events: CombatStepEvent[]): void {
  for (const event of events) {
    if (event.type !== "ABILITY_TRIGGERED") continue;
    if (!event.abilityKey && !event.synergyKey) {
      throw new Error("Combat integrity violation: ABILITY_TRIGGERED event missing trigger key.");
    }
  }
}

function hasSynergy(units: CombatUnit[], key: SynergyKey, threshold: number): boolean {
  const count = units.filter((u) => u.alive && u.tags?.includes(key)).length;
  return count >= threshold;
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

function attackerForTurn(team: CombatUnit[], slotIndex: number): CombatUnit | undefined {
  const unit = team.find((u) => u.slotIndex === slotIndex);
  if (!unit || !unit.alive) return undefined;
  return unit;
}

function onDeath(
  unit: CombatUnit,
  allies: CombatUnit[],
  enemies: CombatUnit[],
  log: string[],
  events: CombatStepEvent[],
  rng: SeededRng
): void {
  if (unit.ability === "DEATH_BURST") {
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

  // Trigger casting (event only for now).
  dispatchCombatTrigger({
    type: TRIGGER_EVENTS.COMBAT_UNIT_DIED_CAST,
    unit: {
      ownerId: unit.ownerId as "A" | "B",
      slotIndex: unit.slotIndex,
      unitName: unit.name,
      castOnDeath: unit.castOnDeath
    },
    emitAbilityTriggered: (payload) => {
      pushAbilityTriggeredEvent(events, {
        sourceOwnerId: payload.sourceOwnerId,
        sourceSlotIndex: payload.sourceSlotIndex,
        sourceUnitName: payload.sourceUnitName,
        abilityKey: payload.abilityKey,
        message: payload.message
      });
    }
  });
}

function onKill(attacker: CombatUnit, defeated: CombatUnit, log: string[], events: CombatStepEvent[]): void {
  // Trigger casting (event only for now).
  dispatchCombatTrigger({
    type: TRIGGER_EVENTS.COMBAT_UNIT_KILL_CAST,
    attacker: {
      ownerId: attacker.ownerId as "A" | "B",
      slotIndex: attacker.slotIndex,
      unitName: attacker.name,
      castOnKill: attacker.castOnKill
    },
    defeated: { unitName: defeated.name },
    emitAbilityTriggered: (payload) => {
      pushAbilityTriggeredEvent(events, {
        sourceOwnerId: payload.sourceOwnerId,
        sourceSlotIndex: payload.sourceSlotIndex,
        sourceUnitName: payload.sourceUnitName,
        abilityKey: payload.abilityKey,
        message: payload.message
      });
    }
  });

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
  events: CombatStepEvent[],
  activeSynergies: { A: Set<SynergyKey>; B: Set<SynergyKey> }
): void {
  switch (attacker.ability) {
    case "LIFESTEAL":
      {
        const before = log.length;
        applyEffect("LIFESTEAL_ON_HIT", hitEvent, { sourceUnit: attacker, log }, { ratio: 0.5 });
        const newLogs = log.slice(before);
        for (const message of newLogs) {
          pushAbilityTriggeredEvent(events, {
            sourceOwnerId: attacker.ownerId,
            sourceSlotIndex: attacker.slotIndex,
            sourceUnitName: attacker.name,
            targetOwnerId: defender.ownerId,
            targetSlotIndex: defender.slotIndex,
            targetUnitName: defender.name,
            abilityKey: "LIFESTEAL",
            message
          });
        }
      }
      break;
    default:
      break;
  }

  if (attacker.tags?.includes("BERSERKER") && activeSynergies[attacker.ownerId].has("BERSERKER")) {
    const before = log.length;
    applyEffect("BERSERKER_ON_HIT_BUFF", hitEvent, { sourceUnit: attacker, log }, { amount: 2 });
    const newLogs = log.slice(before);
    for (const message of newLogs) {
      pushAbilityTriggeredEvent(events, {
        sourceOwnerId: attacker.ownerId,
        sourceSlotIndex: attacker.slotIndex,
        sourceUnitName: attacker.name,
        targetOwnerId: defender.ownerId,
        targetSlotIndex: defender.slotIndex,
        targetUnitName: defender.name,
        synergyKey: "BERSERKER",
        message
      });
    }
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
    alive: true
  }));
  const b: CombatUnit[] = teamB.map((u, i) => ({
    ...u,
    ownerId: "B",
    slotIndex: i,
    alive: true
  }));
  const activeSynergies = {
    A: new Set<SynergyKey>(),
    B: new Set<SynergyKey>()
  };
  if (hasSynergy(a, "BERSERKER", 3)) activeSynergies.A.add("BERSERKER");
  if (hasSynergy(b, "BERSERKER", 3)) activeSynergies.B.add("BERSERKER");

  let maxCycles = 300;

  while (living(a).length > 0 && living(b).length > 0 && maxCycles > 0) {
    maxCycles -= 1;
    const maxSlots = Math.max(a.length, b.length);
    let actedThisCycle = false;

    for (let slot = 0; slot < maxSlots; slot += 1) {
      for (const side of ["A", "B"] as const) {
        const attackers = side === "A" ? a : b;
        const defenders = side === "A" ? b : a;
        if (living(attackers).length === 0 || living(defenders).length === 0) break;

        const attacker = attackerForTurn(attackers, slot);
        if (!attacker) continue;

        const defender = selectTarget(attacker, defenders, rng);
        if (!defender) continue;
        actedThisCycle = true;

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
        applyOnHitEffects(attacker, defender, hitEvent, log, events, activeSynergies);

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
          onKill(defender, attacker, log, events);
          onDeath(attacker, attackers, defenders, log, events, rng);
        }
      }
    }

    // Safety: if nobody could act, prevent an infinite loop.
    if (!actedThisCycle) break;
  }

  const survivorsA = living(a).length;
  const survivorsB = living(b).length;
  const winner = survivorsA === survivorsB ? "DRAW" : survivorsA > survivorsB ? "A" : "B";
  assertCombatEventsIntegrity(events);

  return { winner, survivorsA, survivorsB, log, events };
}
