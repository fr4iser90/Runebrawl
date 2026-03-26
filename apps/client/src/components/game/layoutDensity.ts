export type DensityLevel = "roomy" | "balanced" | "dense" | "stacked";

interface DensityRule {
  stackedMin: number;
  denseMin: number;
  roomyMax?: number;
}

const SHOP_DENSITY_RULE: DensityRule = {
  stackedMin: 11,
  denseMin: 5
};

const BENCH_DENSITY_RULE: DensityRule = {
  stackedMin: 18,
  denseMin: 10
};

function levelFromCount(count: number, rule: DensityRule): DensityLevel {
  if (count >= rule.stackedMin) return "stacked";
  if (count >= rule.denseMin) return "dense";
  if (typeof rule.roomyMax === "number" && count <= rule.roomyMax) return "roomy";
  return "balanced";
}

export function shopDensityClass(count: number): string {
  const level = levelFromCount(count, SHOP_DENSITY_RULE);
  return `tavern-density-${level}`;
}

export function benchDensityClass(count: number): string {
  const level = levelFromCount(count, BENCH_DENSITY_RULE);
  return `bench-density-${level}`;
}
