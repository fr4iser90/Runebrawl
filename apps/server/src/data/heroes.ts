import type { HeroDefinition } from "@runebrawl/shared";
import heroes from "./heroes.json";
import { SeededRng } from "../engine/rng.js";

function normalizeHero(hero: HeroDefinition): HeroDefinition {
  return {
    ...hero,
    offerWeight: Number.isFinite(hero.offerWeight) && (hero.offerWeight ?? 0) > 0 ? hero.offerWeight : 1
  };
}

function pickWeightedIndex(pool: HeroDefinition[], rng: SeededRng): number {
  const total = pool.reduce((sum, hero) => sum + (hero.offerWeight ?? 1), 0);
  if (total <= 0) return rng.int(pool.length);
  const roll = rng.next() * total;
  let cursor = 0;
  for (let i = 0; i < pool.length; i += 1) {
    cursor += pool[i].offerWeight ?? 1;
    if (roll <= cursor) return i;
  }
  return Math.max(0, pool.length - 1);
}

export let HERO_POOL: HeroDefinition[] = (heroes as HeroDefinition[]).map(normalizeHero);

export function findHeroById(heroId: string): HeroDefinition | null {
  return HERO_POOL.find((h) => h.id === heroId) ?? null;
}

export function randomHeroOptions(seed: number, count = 3): HeroDefinition[] {
  const rng = new SeededRng(seed);
  const pool = HERO_POOL.map((hero) => ({ ...hero }));
  const result: HeroDefinition[] = [];
  const picks = Math.min(count, pool.length);
  for (let i = 0; i < picks; i += 1) {
    const idx = pickWeightedIndex(pool, rng);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function replaceHeroPool(next: HeroDefinition[]): void {
  HERO_POOL = next.map(normalizeHero);
}
