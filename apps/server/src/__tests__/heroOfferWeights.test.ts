import { afterEach, describe, expect, it } from "vitest";
import type { HeroDefinition } from "@runebrawl/shared";
import { HERO_POOL, randomHeroOptions, replaceHeroPool } from "../data/heroes.js";

const originalHeroPool: HeroDefinition[] = HERO_POOL.map((hero) => ({ ...hero }));

function hero(overrides: Partial<HeroDefinition>): HeroDefinition {
  return {
    id: "h",
    name: "Hero",
    description: "desc",
    powerType: "ACTIVE",
    powerKey: "WAR_DRUM",
    powerCost: 1,
    offerWeight: 1,
    ...overrides
  };
}

afterEach(() => {
  replaceHeroPool(originalHeroPool);
});

describe("hero offer weighting", () => {
  it("does not duplicate heroes within one offer set", () => {
    replaceHeroPool([
      hero({ id: "a", name: "A" }),
      hero({ id: "b", name: "B" }),
      hero({ id: "c", name: "C" }),
      hero({ id: "d", name: "D" })
    ]);

    const options = randomHeroOptions(12345, 3);
    const ids = options.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers high-weight heroes across many first picks", () => {
    replaceHeroPool([
      hero({ id: "heavy", name: "Heavy", offerWeight: 100 }),
      hero({ id: "light-a", name: "LightA", offerWeight: 1 }),
      hero({ id: "light-b", name: "LightB", offerWeight: 1 })
    ]);

    let heavyFirstPicks = 0;
    const samples = 500;
    for (let seed = 1; seed <= samples; seed += 1) {
      const first = randomHeroOptions(seed, 1)[0];
      if (first.id === "heavy") heavyFirstPicks += 1;
    }

    // Weighted target is ~98%; keep threshold lower to avoid flaky tests.
    expect(heavyFirstPicks).toBeGreaterThan(430);
  });

  it("normalizes invalid weights to default value 1", () => {
    replaceHeroPool([
      hero({ id: "zero", name: "Zero", offerWeight: 0 }),
      hero({ id: "neg", name: "Neg", offerWeight: -5 }),
      hero({ id: "normal", name: "Normal", offerWeight: 1 })
    ]);

    const zero = HERO_POOL.find((h) => h.id === "zero");
    const neg = HERO_POOL.find((h) => h.id === "neg");
    const normal = HERO_POOL.find((h) => h.id === "normal");

    expect(zero?.offerWeight).toBe(1);
    expect(neg?.offerWeight).toBe(1);
    expect(normal?.offerWeight).toBe(1);
  });
});

