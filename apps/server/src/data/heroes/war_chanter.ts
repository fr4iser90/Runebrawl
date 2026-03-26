import type { HeroDefinition } from "@runebrawl/shared";

export const warChanter: HeroDefinition = {
  id: "war_chanter",
  name: "War Chanter",
  description: "Active (2 gold): Give a random friendly unit +1/+1. Once each recruitment hall phase.",
  powerType: "ACTIVE",
  powerKey: "WAR_DRUM",
  powerCost: 2,
  offerWeight: 0.95,
  race: "HUMAN"
};
