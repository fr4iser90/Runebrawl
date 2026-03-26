import type { HeroDefinition } from "@runebrawl/shared";

export const recruiterQueen: HeroDefinition = {
  id: "recruiter_queen",
  name: "Recruiter Queen",
  description: "Active (2 gold): Add a random unit to your bench. Once each recruitment hall phase.",
  powerType: "ACTIVE",
  powerKey: "RECRUITER",
  powerCost: 2,
  offerWeight: 1.05,
  race: "HUMAN"
};
