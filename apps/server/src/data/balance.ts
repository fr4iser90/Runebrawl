import balance from "./balance.json" with { type: "json" };

export interface BalanceConfig {
  maxPlayers: number;
  startingHealth: number;
  shopSlots: number;
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
  mergeCopiesRequired: number;
  unitCopiesByTier: number[];
  tierOddsByTavernTier: Record<string, number[]>;
  quickLobbyTimeoutMs: number;
  privateLobbyTimeoutMs: number;
  quickStartOnTimeoutFillBots: boolean;
}

export const BALANCE = balance as BalanceConfig;
