import type { UnitInstance } from "@runebrawl/shared";
import { SeededRng } from "./rng.js";

interface CombatUnit extends UnitInstance {
  ownerId: string;
  slotIndex: number;
  alive: boolean;
  nextActionAt: number;
}

export interface CombatResult {
  winner: "A" | "B" | "DRAW";
  survivorsA: number;
  survivorsB: number;
  log: string[];
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

function onDeath(unit: CombatUnit, allies: CombatUnit[], enemies: CombatUnit[], log: string[], rng: SeededRng): void {
  if (unit.ability === "DEATH_BURST") {
    const target = selectTarget(unit, enemies, rng);
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

    if (attacker.alive) {
      attacker.nextActionAt += 100 / Math.max(1, attacker.speed);
    }
  }

  const survivorsA = living(a).length;
  const survivorsB = living(b).length;
  const winner = survivorsA === survivorsB ? "DRAW" : survivorsA > survivorsB ? "A" : "B";

  return { winner, survivorsA, survivorsB, log };
}
