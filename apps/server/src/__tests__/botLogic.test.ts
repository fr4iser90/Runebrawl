import { describe, expect, it } from "vitest";
import type { HeroDefinition, UnitDefinition, UnitInstance } from "@runebrawl/shared";
import {
  autoPlaceBoard,
  nextBotDifficulty,
  selectShopIndex,
  shouldReroll,
  shouldUseHeroPower
} from "../ai/botLogic.js";

function makeDef(overrides: Partial<UnitDefinition>): UnitDefinition {
  return {
    id: "u",
    name: "U",
    role: "Melee",
    tier: 1,
    attack: 2,
    hp: 2,
    ability: "NONE",
    ...overrides
  };
}

function makeInst(overrides: Partial<UnitInstance>): UnitInstance {
  return {
    instanceId: "i",
    unitId: "u",
    name: "U",
    role: "Melee",
    level: 1,
    attack: 2,
    hp: 2,
    maxHp: 2,
    ability: "NONE",
    ...overrides
  };
}

describe("botLogic", () => {
  it("rotates difficulties in expected pattern", () => {
    let cursor = 0;
    const picks: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const next = nextBotDifficulty(cursor);
      picks.push(next.difficulty);
      cursor = next.nextCursor;
    }
    expect(picks).toEqual(["EASY", "NORMAL", "HARD", "NORMAL", "EASY"]);
  });

  it("prefers duplicate unit in normal/hard selection", () => {
    const duplicateDef = makeDef({ id: "dup", name: "Dup" });
    const otherDef = makeDef({ id: "other", name: "Other" });
    const idx = selectShopIndex(
      {
        shop: [otherDef, duplicateDef, null],
        board: [makeInst({ unitId: "dup", instanceId: "x1" }), null, null, null, null, null],
        bench: [null, null, null, null, null, null]
      },
      "HARD",
      () => 0.2
    );
    expect(idx).toBe(1);
  });

  it("uses hero power more aggressively on hard", () => {
    const hero: HeroDefinition = {
      id: "war_chanter",
      name: "War Chanter",
      description: "",
      powerType: "ACTIVE",
      powerKey: "WAR_DRUM",
      powerCost: 2
    };
    const canUse = shouldUseHeroPower(
      {
        hero,
        heroPowerUsedThisTurn: false,
        gold: 5,
        board: [makeInst({ instanceId: "a1" }), null, null, null, null, null],
        bench: [null, null, null, null, null, null]
      },
      "HARD",
      true,
      () => 0.0
    );
    expect(canUse).toBe(true);
  });

  it("auto placement prioritizes frontline tanks on non-easy", () => {
    const tank = makeInst({ instanceId: "t", role: "Tank", hp: 10, attack: 2, name: "Tanky" });
    const ranged = makeInst({ instanceId: "r", role: "Ranged", hp: 3, attack: 6, name: "Archer" });
    const player = {
      board: Array.from({ length: 6 }, () => null) as (UnitInstance | null)[],
      bench: [ranged, tank, null, null, null, null] as (UnitInstance | null)[]
    };
    autoPlaceBoard(player, 6, 6, "NORMAL");
    expect(player.board[0]?.role).toBe("Tank");
  });

  it("reroll decision respects no-buyable condition", () => {
    const canReroll = shouldReroll(
      {
        gold: 3,
        shop: [null, null, null]
      },
      "NORMAL",
      1,
      () => 0.9
    );
    expect(canReroll).toBe(true);
  });
});
