import type { HeroDefinition, UnitDefinition, UnitInstance } from "@runebrawl/shared";

export type BotDifficulty = "EASY" | "NORMAL" | "HARD";

export function nextBotDifficulty(cursor: number): { difficulty: BotDifficulty; nextCursor: number } {
  const pattern: BotDifficulty[] = ["EASY", "NORMAL", "HARD", "NORMAL"];
  const difficulty = pattern[cursor % pattern.length];
  return { difficulty, nextCursor: cursor + 1 };
}

export function shouldReroll(
  player: { gold: number; shop: (UnitDefinition | null)[] },
  difficulty: BotDifficulty,
  rerollCost: number,
  rand01: () => number
): boolean {
  if (player.gold < rerollCost) return false;
  const hasBuyable = player.shop.some((u) => !!u);
  if (hasBuyable) return false;
  if (difficulty === "EASY") return rand01() > 0.55;
  if (difficulty === "HARD") return player.gold > rerollCost + 1;
  return rand01() > 0.35;
}

export function shouldUpgradeTavern(
  player: { gold: number; tavernTier: number },
  round: number,
  buyCost: number,
  maxTavernTier: number,
  tavernUpgradeCost: number
): boolean {
  const roundGate = round >= player.tavernTier + 1;
  return roundGate && player.gold >= tavernUpgradeCost + buyCost && player.tavernTier < maxTavernTier;
}

export function shouldUseHeroPower(
  player: {
    hero: HeroDefinition | null;
    heroPowerUsedThisTurn: boolean;
    gold: number;
    board: (UnitInstance | null)[];
    bench: (UnitInstance | null)[];
  },
  difficulty: BotDifficulty,
  hasBenchSpace: boolean,
  rand01: () => number
): boolean {
  if (!player.hero || player.hero.powerType !== "ACTIVE") return false;
  if (player.heroPowerUsedThisTurn) return false;
  if (player.gold < player.hero.powerCost) return false;
  const friendlyUnits = [...player.board, ...player.bench].filter((u) => !!u).length;
  if ((player.hero.powerKey === "WAR_DRUM" || player.hero.powerKey === "FORTIFY") && friendlyUnits === 0) return false;
  if (player.hero.powerKey === "RECRUITER" && !hasBenchSpace) return false;
  if (difficulty === "EASY") return rand01() > 0.7;
  if (difficulty === "HARD") return true;
  return rand01() > 0.45;
}

export function selectShopIndex(
  player: {
    shop: (UnitDefinition | null)[];
    board: (UnitInstance | null)[];
    bench: (UnitInstance | null)[];
  },
  difficulty: BotDifficulty,
  rand01: () => number
): number {
  const choices = player.shop.map((unit, idx) => ({ unit, idx })).filter((x): x is { unit: UnitDefinition; idx: number } => !!x.unit);
  if (choices.length === 0) return -1;
  if (difficulty === "EASY") {
    if (rand01() > 0.5) return choices[0].idx;
    return choices[Math.floor(rand01() * choices.length)].idx;
  }

  const boardAndBench = [...player.board, ...player.bench].filter((u): u is UnitInstance => !!u);
  const unitCountById = new Map<string, number>();
  let berserkerCount = 0;
  for (const u of boardAndBench) {
    unitCountById.set(u.unitId, (unitCountById.get(u.unitId) ?? 0) + 1);
    if (u.tags?.includes("BERSERKER")) berserkerCount += 1;
  }
  const frontlineNeed = player.board.slice(0, 3).filter((u) => !u).length;
  const scored = choices.map(({ unit, idx }) => {
    let score = unit.attack + unit.hp * 0.6 + unit.tier * 0.25;
    const copies = unitCountById.get(unit.id) ?? 0;
    if (copies > 0) score += 2.5 + copies;
    if (frontlineNeed > 0 && (unit.role === "Tank" || unit.role === "Melee")) score += 1.3;
    if (unit.tags?.includes("BERSERKER")) {
      score += berserkerCount >= 2 ? 2.8 : 0.7;
    }
    if (unit.ability === "LIFESTEAL" || unit.ability === "BLOODLUST") score += 0.8;
    if (difficulty === "HARD") score += unit.tier * 0.2;
    return { idx, score };
  });
  scored.sort((a, b) => b.score - a.score);
  if (difficulty === "NORMAL" && scored.length > 1 && rand01() > 0.7) {
    return scored[1].idx;
  }
  return scored[0].idx;
}

export function autoPlaceBoard(
  player: { board: (UnitInstance | null)[]; bench: (UnitInstance | null)[] },
  boardSlots: number,
  benchSlots: number,
  difficulty: BotDifficulty
): void {
  if (difficulty === "EASY") {
    for (let i = 0; i < player.board.length; i += 1) {
      if (player.board[i] !== null) continue;
      const benchIndex = player.bench.findIndex((u) => u !== null);
      if (benchIndex < 0) return;
      player.board[i] = player.bench[benchIndex];
      player.bench[benchIndex] = null;
    }
    return;
  }

  const allUnits = [...player.board, ...player.bench].filter((u): u is UnitInstance => !!u);
  if (allUnits.length === 0) return;
  player.board = Array.from({ length: boardSlots }, () => null);
  player.bench = Array.from({ length: benchSlots }, () => null);
  const frontline = allUnits
    .filter((u) => u.role === "Tank" || u.role === "Melee")
    .sort((a, b) => b.hp + b.attack - (a.hp + a.attack));
  const backline = allUnits
    .filter((u) => u.role === "Ranged" || u.role === "Support")
    .sort((a, b) => b.attack - a.attack);
  const ordered = [...frontline, ...backline];
  for (let i = 0; i < Math.min(player.board.length, ordered.length); i += 1) {
    player.board[i] = ordered[i];
  }
  for (let i = player.board.length; i < ordered.length; i += 1) {
    const benchIdx = player.bench.findIndex((u) => u === null);
    if (benchIdx < 0) break;
    player.bench[benchIdx] = ordered[i];
  }
}
