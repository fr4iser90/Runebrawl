import type {
  AbilityKey,
  HeroDefinition,
  HeroPowerKey,
  HeroPowerType,
  SynergyKey,
  UnitDefinition,
  UnitRace,
  UnitRole
} from "@runebrawl/shared";
import { UNIT_RACES } from "@runebrawl/shared";
import { nanoid } from "nanoid";
import { HERO_POOL, replaceHeroPool } from "../data/heroes.js";
import { replaceUnitPool, UNIT_POOL } from "../data/units.js";

const ALLOWED_ROLES: UnitRole[] = ["Tank", "Melee", "Ranged", "Support"];
const ALLOWED_ABILITIES: AbilityKey[] = ["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"];
const ALLOWED_SYNERGIES: SynergyKey[] = ["BERSERKER"];
const ALLOWED_RACES: readonly UnitRace[] = UNIT_RACES;
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

/** When true, allows units-only or heroes-only packs (public ingest). Publish path stays strict. */
export interface ContentValidationOptions {
  allowPartialCatalog?: boolean;
  /** Tags proposal_race / proposal_mechanics: allow empty units+heroes (semantic community ideas). */
  allowSemanticProposal?: boolean;
}

export interface ContentPublishAuditEntry {
  auditId: string;
  at: number;
  actor: string;
  action: "PUBLISH" | "ROLLBACK";
  source: "MANUAL_DRAFT" | "COMMUNITY_SUBMISSION" | "ROLLBACK";
  submissionId?: string;
  rollbackToAuditId?: string;
  fromVersion: number;
  toVersion: number;
  unitsCount: number;
  heroesCount: number;
}

export interface ContentPublishHistoryRecord {
  audit: ContentPublishAuditEntry;
  snapshot: ContentSnapshot;
}

interface PublishContext {
  actor?: string;
  source?: "MANUAL_DRAFT" | "COMMUNITY_SUBMISSION";
  submissionId?: string;
}

interface StoredPublishSnapshot {
  audit: ContentPublishAuditEntry;
  snapshot: ContentSnapshot;
}

function cloneSnapshot(snapshot: ContentSnapshot): ContentSnapshot {
  return {
    units: cloneUnits(snapshot.units),
    heroes: cloneHeroes(snapshot.heroes),
    version: snapshot.version,
    updatedAt: snapshot.updatedAt
  };
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
    tags: unit.tags ? [...unit.tags] : undefined,
    race: unit.race
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
  private publishHistory: StoredPublishSnapshot[] = [];

  constructor() {
    const initialSnapshot: ContentSnapshot = {
      units: cloneUnits(UNIT_POOL),
      heroes: cloneHeroes(HERO_POOL),
      version: this.version,
      updatedAt: this.updatedAt
    };
    this.publishHistory.push({
      audit: {
        auditId: "bootstrap",
        at: this.updatedAt,
        actor: "system",
        action: "PUBLISH",
        source: "MANUAL_DRAFT",
        fromVersion: 0,
        toVersion: this.version,
        unitsCount: initialSnapshot.units.length,
        heroesCount: initialSnapshot.heroes.length
      },
      snapshot: initialSnapshot
    });
  }

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
    return this.validateContent(draft.units, draft.heroes);
  }

  publishDraft(context: PublishContext = {}): ContentValidationResult {
    if (!this.draft) {
      return { ok: false, errors: ["No draft to publish."] };
    }
    const validation = this.validateContent(this.draft.units, this.draft.heroes);
    if (!validation.ok) return validation;

    const now = Date.now();
    const nextVersion = this.version + 1;
    const publishedSnapshot: ContentSnapshot = {
      units: cloneUnits(this.draft.units),
      heroes: cloneHeroes(this.draft.heroes),
      version: nextVersion,
      updatedAt: now
    };

    replaceUnitPool(publishedSnapshot.units);
    replaceHeroPool(publishedSnapshot.heroes);
    this.version = nextVersion;
    this.updatedAt = now;
    this.draft = null;
    this.recordPublishEntry({
      auditId: nanoid(12),
      at: now,
      actor: context.actor ?? "admin",
      action: "PUBLISH",
      source: context.source ?? "MANUAL_DRAFT",
      submissionId: context.submissionId,
      fromVersion: this.version - 1,
      toVersion: this.version,
      unitsCount: publishedSnapshot.units.length,
      heroesCount: publishedSnapshot.heroes.length
    }, publishedSnapshot);
    return { ok: true, errors: [] };
  }

  validateContent(
    units: UnitDefinition[],
    heroes: HeroDefinition[],
    options?: ContentValidationOptions
  ): ContentValidationResult {
    return this.validatePayload(units, heroes, options);
  }

  getPublishHistory(limit = 50): ContentPublishAuditEntry[] {
    const bounded = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.publishHistory
      .slice(-bounded)
      .map((entry) => ({ ...entry.audit }))
      .reverse();
  }

  getPublishHistoryRecords(limit = 50): ContentPublishHistoryRecord[] {
    const bounded = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.publishHistory
      .slice(-bounded)
      .map((entry) => ({
        audit: { ...entry.audit },
        snapshot: cloneSnapshot(entry.snapshot)
      }));
  }

  hydratePublishHistory(records: ContentPublishHistoryRecord[]): void {
    if (!records.length) return;
    const sorted = [...records].sort((a, b) => a.audit.at - b.audit.at);
    this.publishHistory = sorted.map((record) => ({
      audit: { ...record.audit },
      snapshot: cloneSnapshot(record.snapshot)
    }));
    const latest = sorted[sorted.length - 1];
    this.version = latest.snapshot.version;
    this.updatedAt = latest.snapshot.updatedAt;
    replaceUnitPool(latest.snapshot.units);
    replaceHeroPool(latest.snapshot.heroes);
    this.draft = null;
  }

  rollbackToAudit(auditId: string, actor = "admin"): ContentValidationResult {
    const target = this.publishHistory.find((entry) => entry.audit.auditId === auditId);
    if (!target) {
      return { ok: false, errors: ["Audit entry not found."] };
    }
    const validation = this.validateContent(target.snapshot.units, target.snapshot.heroes);
    if (!validation.ok) return validation;

    const now = Date.now();
    const nextVersion = this.version + 1;
    const rolledSnapshot: ContentSnapshot = {
      units: cloneUnits(target.snapshot.units),
      heroes: cloneHeroes(target.snapshot.heroes),
      version: nextVersion,
      updatedAt: now
    };

    replaceUnitPool(rolledSnapshot.units);
    replaceHeroPool(rolledSnapshot.heroes);
    this.version = nextVersion;
    this.updatedAt = now;
    this.draft = null;
    this.recordPublishEntry({
      auditId: nanoid(12),
      at: now,
      actor,
      action: "ROLLBACK",
      source: "ROLLBACK",
      rollbackToAuditId: auditId,
      fromVersion: this.version - 1,
      toVersion: this.version,
      unitsCount: rolledSnapshot.units.length,
      heroesCount: rolledSnapshot.heroes.length
    }, rolledSnapshot);

    return { ok: true, errors: [] };
  }

  private recordPublishEntry(audit: ContentPublishAuditEntry, snapshot: ContentSnapshot): void {
    this.publishHistory.push({
      audit,
      snapshot: cloneSnapshot(snapshot)
    });
    const maxHistory = 200;
    if (this.publishHistory.length > maxHistory) {
      this.publishHistory.splice(0, this.publishHistory.length - maxHistory);
    }
  }

  private validatePayload(
    units: UnitDefinition[],
    heroes: HeroDefinition[],
    options?: ContentValidationOptions
  ): ContentValidationResult {
    const errors: string[] = [];
    const relaxed = options?.allowPartialCatalog === true;

    if (!relaxed) {
      if (units.length === 0) errors.push("Unit list cannot be empty.");
      if (heroes.length === 0) errors.push("Hero list cannot be empty.");
    } else if (units.length === 0 && heroes.length === 0) {
      if (options?.allowSemanticProposal !== true) {
        errors.push("Pack must include at least one unit or one hero.");
      }
    }

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
      if (unit.castOnDeath !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnDeath)) {
        errors.push(`Unit ${unit.id}: invalid castOnDeath ${unit.castOnDeath}.`);
      }
      if (unit.castOnKill !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnKill)) {
        errors.push(`Unit ${unit.id}: invalid castOnKill ${unit.castOnKill}.`);
      }
      if (unit.castOnCrit !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnCrit)) {
        errors.push(`Unit ${unit.id}: invalid castOnCrit ${unit.castOnCrit}.`);
      }
      if (unit.castOnFirstStrike !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnFirstStrike)) {
        errors.push(`Unit ${unit.id}: invalid castOnFirstStrike ${unit.castOnFirstStrike}.`);
      }
      if (unit.castOnBattlefieldAdded !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnBattlefieldAdded)) {
        errors.push(`Unit ${unit.id}: invalid castOnBattlefieldAdded ${unit.castOnBattlefieldAdded}.`);
      }
      if (unit.castOnRecruitmentRefresh !== undefined && !ALLOWED_ABILITIES.includes(unit.castOnRecruitmentRefresh)) {
        errors.push(`Unit ${unit.id}: invalid castOnRecruitmentRefresh ${unit.castOnRecruitmentRefresh}.`);
      }
      if (!Number.isFinite(unit.tier) || unit.tier < 1 || unit.tier > 6) errors.push(`Unit ${unit.id}: tier must be 1..6.`);
      if (!Number.isFinite(unit.attack) || unit.attack < 0) errors.push(`Unit ${unit.id}: attack must be >= 0.`);
      if (!Number.isFinite(unit.hp) || unit.hp <= 0) errors.push(`Unit ${unit.id}: hp must be > 0.`);
      if (!Number.isFinite(unit.speed) || unit.speed <= 0) errors.push(`Unit ${unit.id}: speed must be > 0.`);
      if (unit.shopWeight !== undefined && (!Number.isFinite(unit.shopWeight) || unit.shopWeight <= 0)) {
        errors.push(`Unit ${unit.id}: shopWeight must be > 0.`);
      }
      if (unit.race !== undefined && !ALLOWED_RACES.includes(unit.race)) {
        errors.push(`Unit ${unit.id}: invalid race ${String(unit.race)}.`);
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
