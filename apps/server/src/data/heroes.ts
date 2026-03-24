import type { HeroDefinition } from "@runebrawl/shared";
import heroes from "./heroes.json";
import { SeededRng } from "../engine/rng.js";

export const HERO_POOL: HeroDefinition[] = heroes as HeroDefinition[];

export function findHeroById(heroId: string): HeroDefinition | null {
  return HERO_POOL.find((h) => h.id === heroId) ?? null;
}

export function randomHeroOptions(seed: number, count = 3): HeroDefinition[] {
  const rng = new SeededRng(seed);
  const pool = [...HERO_POOL];
  const result: HeroDefinition[] = [];
  const picks = Math.min(count, pool.length);
  for (let i = 0; i < picks; i += 1) {
    const idx = rng.int(pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
