import type { UnitDefinition } from "@runebrawl/shared";
import { alleyBlade } from "./alley_blade.js";
import { emberArcher } from "./ember_archer.js";
import { graveImp } from "./grave_imp.js";
import { ironBulwark } from "./iron_bulwark.js";
import { skySniper } from "./sky_sniper.js";
import { soulReaver } from "./soul_reaver.js";
import { stoneGuard } from "./stone_guard.js";
import { warDrummer } from "./war_drummer.js";
import { wildShaman } from "./wild_shaman.js";

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  stoneGuard,
  alleyBlade,
  emberArcher,
  wildShaman,
  graveImp,
  soulReaver,
  ironBulwark,
  skySniper,
  warDrummer
];
