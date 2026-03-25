import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const snakeCaseId = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const UNIT_ROLES = new Set(["Tank", "Melee", "Ranged", "Support"]);
const ABILITIES = new Set(["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"]);
const SYNERGIES = new Set(["BERSERKER"]);
const UNIT_RACES = new Set(["HUMAN", "ORC", "ELF", "DWARF", "UNDEAD"]);
const HERO_POWER_TYPES = new Set(["PASSIVE", "ACTIVE"]);
const HERO_POWER_KEYS = new Set(["BONUS_GOLD", "WAR_DRUM", "RECRUITER", "FORTIFY"]);

const errors = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

async function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  try {
    const raw = await readFile(absolutePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    fail(relativePath, `invalid JSON (${String(error?.message ?? error)})`);
    return null;
  }
}

function validateMetadata(metadata, filePath) {
  if (!isObject(metadata)) {
    fail(filePath, "must be an object");
    return;
  }
  const requiredStrings = ["packId", "title", "author", "version", "description", "targetGameVersion"];
  for (const key of requiredStrings) {
    if (typeof metadata[key] !== "string" || metadata[key].trim() === "") {
      fail(filePath, `field "${key}" must be a non-empty string`);
    }
  }
  if (typeof metadata.packId === "string" && !snakeCaseId.test(metadata.packId)) {
    fail(filePath, 'field "packId" must be lowercase snake_case');
  }
  if (!Array.isArray(metadata.tags) || metadata.tags.some((tag) => typeof tag !== "string" || tag.trim() === "")) {
    fail(filePath, 'field "tags" must be an array of non-empty strings');
  }
}

function validateUnits(units, filePath, packName, takenUnitIds) {
  if (!Array.isArray(units)) {
    fail(filePath, "must be an array");
    return;
  }
  const localIds = new Set();
  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i];
    const row = `${filePath}[${i}]`;
    if (!isObject(unit)) {
      fail(row, "must be an object");
      continue;
    }

    const required = ["id", "name", "role", "tier", "attack", "hp", "speed", "ability"];
    for (const key of required) {
      if (!(key in unit)) fail(row, `missing required field "${key}"`);
    }

    if (typeof unit.id !== "string" || !snakeCaseId.test(unit.id)) {
      fail(row, 'field "id" must be lowercase snake_case');
    } else {
      if (localIds.has(unit.id)) fail(row, `duplicate unit id "${unit.id}" in pack`);
      if (takenUnitIds.has(unit.id)) fail(row, `unit id "${unit.id}" collides with existing core/community id`);
      localIds.add(unit.id);
      takenUnitIds.add(unit.id);
    }

    if (typeof unit.name !== "string" || unit.name.trim() === "") {
      fail(row, 'field "name" must be a non-empty string');
    }
    if (!UNIT_ROLES.has(unit.role)) {
      fail(row, `field "role" must be one of: ${Array.from(UNIT_ROLES).join(", ")}`);
    }
    if (!Number.isInteger(unit.tier) || unit.tier < 1 || unit.tier > 6) {
      fail(row, 'field "tier" must be an integer between 1 and 6');
    }
    if (!Number.isInteger(unit.attack) || unit.attack < 0) {
      fail(row, 'field "attack" must be an integer >= 0');
    }
    if (!Number.isInteger(unit.hp) || unit.hp < 1) {
      fail(row, 'field "hp" must be an integer >= 1');
    }
    if (!Number.isInteger(unit.speed) || unit.speed < 1) {
      fail(row, 'field "speed" must be an integer >= 1');
    }
    if (!ABILITIES.has(unit.ability)) {
      fail(row, `field "ability" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnDeath" in unit && (!unit.castOnDeath || !ABILITIES.has(unit.castOnDeath))) {
      fail(row, `field "castOnDeath" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnKill" in unit && (!unit.castOnKill || !ABILITIES.has(unit.castOnKill))) {
      fail(row, `field "castOnKill" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnCrit" in unit && (!unit.castOnCrit || !ABILITIES.has(unit.castOnCrit))) {
      fail(row, `field "castOnCrit" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnFirstStrike" in unit && (!unit.castOnFirstStrike || !ABILITIES.has(unit.castOnFirstStrike))) {
      fail(row, `field "castOnFirstStrike" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnBattlefieldAdded" in unit && (!unit.castOnBattlefieldAdded || !ABILITIES.has(unit.castOnBattlefieldAdded))) {
      fail(row, `field "castOnBattlefieldAdded" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("castOnRecruitmentRefresh" in unit && (!unit.castOnRecruitmentRefresh || !ABILITIES.has(unit.castOnRecruitmentRefresh))) {
      fail(row, `field "castOnRecruitmentRefresh" must be one of: ${Array.from(ABILITIES).join(", ")}`);
    }
    if ("shopWeight" in unit && !isPositiveNumber(unit.shopWeight)) {
      fail(row, 'field "shopWeight" must be a number > 0');
    }
    if ("race" in unit && unit.race !== undefined && unit.race !== null) {
      if (typeof unit.race !== "string" || !UNIT_RACES.has(unit.race)) {
        fail(row, `field "race" must be one of: ${Array.from(UNIT_RACES).join(", ")}`);
      }
    }
    if ("tags" in unit) {
      if (!Array.isArray(unit.tags) || unit.tags.some((tag) => !SYNERGIES.has(tag))) {
        fail(row, `field "tags" must be an array with values in: ${Array.from(SYNERGIES).join(", ")}`);
      }
    }
  }

  if (units.length === 0) {
    fail(filePath, `pack "${packName}" should include at least one unit or one hero`);
  }
}

function validateHeroes(heroes, filePath, packName, takenHeroIds) {
  if (!Array.isArray(heroes)) {
    fail(filePath, "must be an array");
    return;
  }
  const localIds = new Set();
  for (let i = 0; i < heroes.length; i += 1) {
    const hero = heroes[i];
    const row = `${filePath}[${i}]`;
    if (!isObject(hero)) {
      fail(row, "must be an object");
      continue;
    }

    const required = ["id", "name", "description", "powerType", "powerKey", "powerCost"];
    for (const key of required) {
      if (!(key in hero)) fail(row, `missing required field "${key}"`);
    }

    if (typeof hero.id !== "string" || !snakeCaseId.test(hero.id)) {
      fail(row, 'field "id" must be lowercase snake_case');
    } else {
      if (localIds.has(hero.id)) fail(row, `duplicate hero id "${hero.id}" in pack`);
      if (takenHeroIds.has(hero.id)) fail(row, `hero id "${hero.id}" collides with existing core/community id`);
      localIds.add(hero.id);
      takenHeroIds.add(hero.id);
    }

    if (typeof hero.name !== "string" || hero.name.trim() === "") {
      fail(row, 'field "name" must be a non-empty string');
    }
    if (typeof hero.description !== "string" || hero.description.trim() === "") {
      fail(row, 'field "description" must be a non-empty string');
    }
    if (!HERO_POWER_TYPES.has(hero.powerType)) {
      fail(row, `field "powerType" must be one of: ${Array.from(HERO_POWER_TYPES).join(", ")}`);
    }
    if (!HERO_POWER_KEYS.has(hero.powerKey)) {
      fail(row, `field "powerKey" must be one of: ${Array.from(HERO_POWER_KEYS).join(", ")}`);
    }
    if (!Number.isInteger(hero.powerCost) || hero.powerCost < 0) {
      fail(row, 'field "powerCost" must be an integer >= 0');
    }
    if ("offerWeight" in hero && !isPositiveNumber(hero.offerWeight)) {
      fail(row, 'field "offerWeight" must be a number > 0');
    }
  }

  if (heroes.length === 0) {
    fail(filePath, `pack "${packName}" should include at least one hero or one unit`);
  }
}

async function listSubmissionPacks(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  try {
    const entries = await readdir(absoluteDir);
    const packDirs = [];
    for (const entry of entries) {
      const entryPath = path.join(absoluteDir, entry);
      const info = await stat(entryPath);
      if (info.isDirectory()) {
        packDirs.push(path.join(relativeDir, entry));
      }
    }
    return packDirs.sort();
  } catch {
    return [];
  }
}

async function loadCoreIds() {
  const coreUnits = await readJson("apps/server/src/data/units.json");
  const coreHeroes = await readJson("apps/server/src/data/heroes.json");
  const unitIds = new Set();
  const heroIds = new Set();

  if (Array.isArray(coreUnits)) {
    for (const unit of coreUnits) {
      if (isObject(unit) && typeof unit.id === "string") unitIds.add(unit.id);
    }
  }
  if (Array.isArray(coreHeroes)) {
    for (const hero of coreHeroes) {
      if (isObject(hero) && typeof hero.id === "string") heroIds.add(hero.id);
    }
  }
  return { unitIds, heroIds };
}

async function validatePack(packDir, takenUnitIds, takenHeroIds, seenPackIds) {
  const metadataPath = `${packDir}/metadata.json`;
  const unitsPath = `${packDir}/units.json`;
  const heroesPath = `${packDir}/heroes.json`;

  const metadata = await readJson(metadataPath);
  const units = await readJson(unitsPath);
  const heroes = await readJson(heroesPath);

  if (metadata !== null) {
    validateMetadata(metadata, metadataPath);
    if (typeof metadata.packId === "string") {
      if (seenPackIds.has(metadata.packId)) {
        fail(metadataPath, `duplicate packId "${metadata.packId}" across packs`);
      }
      seenPackIds.add(metadata.packId);
    }
  }
  if (units !== null) validateUnits(units, unitsPath, path.basename(packDir), takenUnitIds);
  if (heroes !== null) validateHeroes(heroes, heroesPath, path.basename(packDir), takenHeroIds);
}

async function main() {
  const { unitIds, heroIds } = await loadCoreIds();
  const seenPackIds = new Set();
  const submissionPacks = await listSubmissionPacks("community/submissions");
  const packs = ["community/content-pack-template", ...submissionPacks];

  for (const packDir of packs) {
    await validatePack(packDir, unitIds, heroIds, seenPackIds);
  }

  if (errors.length > 0) {
    console.error("Community content validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Community content validation passed (${packs.length} pack(s) checked).`);
}

main().catch((error) => {
  console.error("Validator crashed:", error);
  process.exit(1);
});
