import type { UnitInstance } from "@runebrawl/shared";
import { SeededRng } from "./rng.js";

interface CombatUnit extends UnitInstance {
  ownerId: string;
  slotIndex: number;
  alive: boolean;
}

export interface CombatResult {
  winner: "A" | "B" | "DRAW";
  survivorsA: number;
  survivorsB: number;
  log: string[];
}

function firstAlive(units: CombatUnit[]): CombatUnit | undefined {
  return units.find((u) => u.alive);
}

function living(units: CombatUnit[]): CombatUnit[] {
  return units.filter((u) => u.alive);
}

function selectTarget(enemy: CombatUnit[], rng: SeededRng): CombatUnit | undefined {
  const taunts = enemy.filter((u) => u.alive && u.ability === "TAUNT");
  if (taunts.length > 0) {
    return taunts[rng.int(taunts.length)];
  }
  const alive = enemy.filter((u) => u.alive);
  if (alive.length === 0) return undefined;
  return alive[rng.int(alive.length)];
}

function onDeath(unit: CombatUnit, allies: CombatUnit[], enemies: CombatUnit[], log: string[], rng: SeededRng): void {
  if (unit.ability === "DEATH_BURST") {
    const target = selectTarget(enemies, rng);
    if (!target) return;
    target.hp -= 2;
    log.push(`${unit.name} death burst hits ${target.name} for 2.`);
    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      log.push(`${target.name} dies.`);
      onDeath(target, enemies, allies, log, rng);
    }
  }
}

function onKill(attacker: CombatUnit, log: string[]): void {
  if (attacker.ability === "BLOODLUST") {
    attacker.attack += 1;
    attacker.hp += 1;
    attacker.maxHp += 1;
    log.push(`${attacker.name} gains Bloodlust (+1/+1).`);
  }
}

export function simulateCombat(
  teamA: UnitInstance[],
  teamB: UnitInstance[],
  seed: number
): CombatResult {
  const rng = new SeededRng(seed);
  const log: string[] = [];

  const a: CombatUnit[] = teamA.map((u, i) => ({ ...u, ownerId: "A", slotIndex: i, alive: true }));
  const b: CombatUnit[] = teamB.map((u, i) => ({ ...u, ownerId: "B", slotIndex: i, alive: true }));

  let turn = 0;
  let maxIterations = 300;

  while (living(a).length > 0 && living(b).length > 0 && maxIterations > 0) {
    maxIterations -= 1;
    const teamTurn = turn % 2 === 0 ? "A" : "B";
    const attackers = teamTurn === "A" ? a : b;
    const defenders = teamTurn === "A" ? b : a;
    const attacker = firstAlive(attackers);
    const defender = selectTarget(defenders, rng);

    if (!attacker || !defender) break;

    log.push(`${attacker.name} attacks ${defender.name}.`);

    defender.hp -= attacker.attack;
    attacker.hp -= defender.attack;

    const defenderDied = defender.hp <= 0 && defender.alive;
    const attackerDied = attacker.hp <= 0 && attacker.alive;

    if (defenderDied) {
      defender.alive = false;
      log.push(`${defender.name} dies.`);
      onKill(attacker, log);
      onDeath(defender, defenders, attackers, log, rng);
    }

    if (attackerDied) {
      attacker.alive = false;
      log.push(`${attacker.name} dies.`);
      onDeath(attacker, attackers, defenders, log, rng);
    }

    turn += 1;
  }

  const survivorsA = living(a).length;
  const survivorsB = living(b).length;
  const winner = survivorsA === survivorsB ? "DRAW" : survivorsA > survivorsB ? "A" : "B";

  return { winner, survivorsA, survivorsB, log };
}
