import type { AbilityKey, HeroDefinition, HeroPowerKey, HeroPowerType, SynergyKey, UnitDefinition, UnitRole } from "@runebrawl/shared";
import { HERO_POOL, replaceHeroPool } from "../data/heroes.js";
import { replaceUnitPool, UNIT_POOL } from "../data/units.js";

const ALLOWED_ROLES: UnitRole[] = ["Tank", "Melee", "Ranged", "Support"];
const ALLOWED_ABILITIES: AbilityKey[] = ["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"];
const ALLOWED_SYNERGIES: SynergyKey[] = ["BERSERKER"];
const ALLOWED_POWER_TYPES: HeroPowerType[] = ["PASSIVE", "ACTIVE"];
const ALLOWED_POWER_KEYS: HeroPowerKey[] = ["BONUS_GOLD", "WAR_DRUM", "RECRUITER", "FORTIFY"];

export interface ContentSnapshot {
  units: UnitDefinition[];
  heroes: HeroDefinition[];
  version: number;
  updatedAt: number;
}

export interface ContentValidationResult {
  ok: boolean;
  errors: string[];
}

interface DraftState {
  units: UnitDefinition[];
  heroes: HeroDefinition[];
  updatedAt: number;
}

function cloneUnits(units: UnitDefinition[]): UnitDefinition[] {
  return units.map((unit) => ({
    ...unit,
    shopWeight: Number.isFinite(unit.shopWeight) && (unit.shopWeight ?? 0) > 0 ? unit.shopWeight : 1,
    tags: unit.tags ? [...unit.tags] : undefined
  }));
}

function cloneHeroes(heroes: HeroDefinition[]): HeroDefinition[] {
  return heroes.map((hero) => ({
    ...hero,
    offerWeight: Number.isFinite(hero.offerWeight) && (hero.offerWeight ?? 0) > 0 ? hero.offerWeight : 1
  }));
}

function hasDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export class ContentBuilderService {
  private version = 1;
  private updatedAt = Date.now();
  private draft: DraftState | null = null;

  getCatalog(): ContentSnapshot {
    return {
      units: cloneUnits(UNIT_POOL),
      heroes: cloneHeroes(HERO_POOL),
      version: this.version,
      updatedAt: this.updatedAt
    };
  }

  getDraft(): { hasDraft: boolean; snapshot: ContentSnapshot } {
    if (!this.draft) {
      return { hasDraft: false, snapshot: this.getCatalog() };
    }
    return {
      hasDraft: true,
      snapshot: {
        units: cloneUnits(this.draft.units),
        heroes: cloneHeroes(this.draft.heroes),
        version: this.version,
        updatedAt: this.draft.updatedAt
      }
    };
  }

  saveDraft(units: UnitDefinition[], heroes: HeroDefinition[]): ContentValidationResult {
    const validation = this.validatePayload(units, heroes);
    if (!validation.ok) return validation;
    this.draft = {
      units: cloneUnits(units),
      heroes: cloneHeroes(heroes),
      updatedAt: Date.now()
    };
    return validation;
  }

  validateDraft(): ContentValidationResult {
    const draft = this.draft ?? { units: UNIT_POOL, heroes: HERO_POOL };
    return this.validatePayload(draft.units, draft.heroes);
  }

  publishDraft(): ContentValidationResult {
    if (!this.draft) {
      return { ok: false, errors: ["No draft to publish."] };
    }
    const validation = this.validatePayload(this.draft.units, this.draft.heroes);
    if (!validation.ok) return validation;

    replaceUnitPool(this.draft.units);
    replaceHeroPool(this.draft.heroes);
    this.version += 1;
    this.updatedAt = Date.now();
    this.draft = null;
    return { ok: true, errors: [] };
  }

  private validatePayload(units: UnitDefinition[], heroes: HeroDefinition[]): ContentValidationResult {
    const errors: string[] = [];

    if (units.length === 0) errors.push("Unit list cannot be empty.");
    if (heroes.length === 0) errors.push("Hero list cannot be empty.");

    const duplicateUnitIds = hasDuplicates(units.map((u) => u.id));
    if (duplicateUnitIds.length > 0) {
      errors.push(`Duplicate unit ids: ${duplicateUnitIds.join(", ")}`);
    }
    const duplicateHeroIds = hasDuplicates(heroes.map((h) => h.id));
    if (duplicateHeroIds.length > 0) {
      errors.push(`Duplicate hero ids: ${duplicateHeroIds.join(", ")}`);
    }

    for (const unit of units) {
      if (!unit.id.trim()) errors.push("Unit id is required.");
      if (!unit.name.trim()) errors.push(`Unit ${unit.id}: name is required.`);
      if (!ALLOWED_ROLES.includes(unit.role)) errors.push(`Unit ${unit.id}: invalid role ${unit.role}.`);
      if (!ALLOWED_ABILITIES.includes(unit.ability)) errors.push(`Unit ${unit.id}: invalid ability ${unit.ability}.`);
      if (!Number.isFinite(unit.tier) || unit.tier < 1 || unit.tier > 6) errors.push(`Unit ${unit.id}: tier must be 1..6.`);
      if (!Number.isFinite(unit.attack) || unit.attack < 0) errors.push(`Unit ${unit.id}: attack must be >= 0.`);
      if (!Number.isFinite(unit.hp) || unit.hp <= 0) errors.push(`Unit ${unit.id}: hp must be > 0.`);
      if (!Number.isFinite(unit.speed) || unit.speed <= 0) errors.push(`Unit ${unit.id}: speed must be > 0.`);
      if (unit.shopWeight !== undefined && (!Number.isFinite(unit.shopWeight) || unit.shopWeight <= 0)) {
        errors.push(`Unit ${unit.id}: shopWeight must be > 0.`);
      }
      for (const tag of unit.tags ?? []) {
        if (!ALLOWED_SYNERGIES.includes(tag)) {
          errors.push(`Unit ${unit.id}: invalid synergy tag ${tag}.`);
        }
      }
    }

    for (const hero of heroes) {
      if (!hero.id.trim()) errors.push("Hero id is required.");
      if (!hero.name.trim()) errors.push(`Hero ${hero.id}: name is required.`);
      if (!hero.description.trim()) errors.push(`Hero ${hero.id}: description is required.`);
      if (!ALLOWED_POWER_TYPES.includes(hero.powerType)) errors.push(`Hero ${hero.id}: invalid powerType ${hero.powerType}.`);
      if (!ALLOWED_POWER_KEYS.includes(hero.powerKey)) errors.push(`Hero ${hero.id}: invalid powerKey ${hero.powerKey}.`);
      if (!Number.isFinite(hero.powerCost) || hero.powerCost < 0) errors.push(`Hero ${hero.id}: powerCost must be >= 0.`);
      if (hero.offerWeight !== undefined && (!Number.isFinite(hero.offerWeight) || hero.offerWeight <= 0)) {
        errors.push(`Hero ${hero.id}: offerWeight must be > 0.`);
      }
      if (hero.powerType === "PASSIVE" && hero.powerCost !== 0) {
        errors.push(`Hero ${hero.id}: passive heroes must have powerCost = 0.`);
      }
    }

    return { ok: errors.length === 0, errors };
  }
}
