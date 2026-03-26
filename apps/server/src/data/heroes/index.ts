import type { HeroDefinition } from "@runebrawl/shared";
import { goldBaron } from "./gold_baron.js";
import { ironGuardian } from "./iron_guardian.js";
import { recruiterQueen } from "./recruiter_queen.js";
import { warChanter } from "./war_chanter.js";

export const HERO_DEFINITIONS: HeroDefinition[] = [goldBaron, warChanter, recruiterQueen, ironGuardian];
