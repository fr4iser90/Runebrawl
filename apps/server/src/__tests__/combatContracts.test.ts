import { describe, expect, it } from "vitest";
import type { UnitInstance } from "@runebrawl/shared";
import { simulateCombat } from "../engine/combat.js";

function unit(overrides: Partial<UnitInstance>): UnitInstance {
  return {
    instanceId: "u1",
    unitId: "u1",
    name: "Unit",
    role: "Melee",
    level: 1,
    attack: 3,
    hp: 5,
    maxHp: 5,
    speed: 3,
    ability: "NONE",
    ...overrides
  };
}

describe("combat contracts", () => {
  it("emits synergyKey for Berserker trigger when 3+ active", () => {
    const teamA: UnitInstance[] = [
      unit({ instanceId: "a1", unitId: "ba", name: "Bers-1", tags: ["BERSERKER"], attack: 4, speed: 5 }),
      unit({ instanceId: "a2", unitId: "bb", name: "Bers-2", tags: ["BERSERKER"], attack: 3, speed: 4 }),
      unit({ instanceId: "a3", unitId: "bc", name: "Bers-3", tags: ["BERSERKER"], attack: 3, speed: 4 })
    ];
    const teamB: UnitInstance[] = [unit({ instanceId: "b1", unitId: "x1", name: "Target", role: "Tank", hp: 12, maxHp: 12 })];
    const result = simulateCombat(teamA, teamB, 1337);
    const synergyTriggered = result.events.some((e) => e.type === "ABILITY_TRIGGERED" && e.synergyKey === "BERSERKER");
    expect(synergyTriggered).toBe(true);
  });

  it("ensures ABILITY_TRIGGERED events carry trigger keys", () => {
    const teamA: UnitInstance[] = [unit({ instanceId: "a1", name: "Leech", ability: "LIFESTEAL", attack: 5 })];
    const teamB: UnitInstance[] = [unit({ instanceId: "b1", name: "Dummy", hp: 9, maxHp: 9 })];
    const result = simulateCombat(teamA, teamB, 4242);
    const broken = result.events.some((e) => e.type === "ABILITY_TRIGGERED" && !e.abilityKey && !e.synergyKey);
    expect(broken).toBe(false);
  });
});
