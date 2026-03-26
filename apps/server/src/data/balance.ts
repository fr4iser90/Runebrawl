import balance from "./balance.json" with { type: "json" };

export interface BalanceConfig {
  maxPlayers: number;
  startingHealth: number;
  shopSlots: number;
  shopSlotsByTavernTier?: Record<string, number>;
  benchSlots: number;
  boardSlots: number;
  heroSelectionMs: number;
  tavernPhaseMs: number;
  roundEndMs: number;
  buyCost: number;
  rerollCost: number;
  sellRefund: number;
  maxGold: number;
  baseGoldPerRound: number;
  maxTavernTier: number;
  tavernUpgradeBaseCost: number;
  tavernUpgradeStepCost: number;
  tavernUpgradeDiscountPerRound: number;
  tavernUpgradeMinCost: number;
  mergeCopiesRequired: number;
  unitCopiesByTier: number[];
  tierOddsByTavernTier: Record<string, number[]>;
  quickLobbyTimeoutMs: number;
  privateLobbyTimeoutMs: number;
  quickStartOnTimeoutFillBots: boolean;
}

export const BALANCE = balance as BalanceConfig;

export function shopSlotsForTavernTier(tavernTier: number): number {
  const fallback = Math.max(1, BALANCE.shopSlots);
  const clampedTier = Math.max(1, Math.min(BALANCE.maxTavernTier, Math.round(Number(tavernTier) || 1)));
  const byTier = BALANCE.shopSlotsByTavernTier;
  if (!byTier) return fallback;
  const direct = byTier[String(clampedTier)];
  if (Number.isFinite(direct) && (direct ?? 0) > 0) return Math.floor(direct as number);
  for (let t = clampedTier; t >= 1; t -= 1) {
    const v = byTier[String(t)];
    if (Number.isFinite(v) && (v ?? 0) > 0) return Math.floor(v as number);
  }
  return fallback;
}
