import type { HeroDefinition } from "@runebrawl/shared";

export const ironGuardian: HeroDefinition = {
  id: "iron_guardian",
  name: "Iron Guardian",
  description: "Active (1 gold): Give a random friendly unit +2 max HP. Once each recruitment hall phase.",
  powerType: "ACTIVE",
  powerKey: "FORTIFY",
  powerCost: 1,
  offerWeight: 1,
  race: "DWARF"
};
