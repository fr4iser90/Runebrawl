import type { HeroDefinition } from "@runebrawl/shared";

export const goldBaron: HeroDefinition = {
  id: "gold_baron",
  name: "Gold Baron",
  description: "Passive: Gain +1 gold at the start of each recruitment hall phase.",
  powerType: "PASSIVE",
  powerKey: "BONUS_GOLD",
  powerCost: 0,
  offerWeight: 1
};
