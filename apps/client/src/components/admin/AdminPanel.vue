<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  MAGIC_SPELL_VISUAL_IDS,
  UNIT_RACES,
  type GamePhase,
  type HeroDefinition,
  type UnitDefinition,
  type UnitRace
} from "@runebrawl/shared";
import {
  analyzeContentRoster,
  roleTierMatrixRows,
  sortedEntries,
  sortedTierEntries,
  type RosterAnalysis
} from "../../admin/contentRosterAnalysis";
import { useAdminApi } from "../../composables/useAdminApi";
import {
  hasHeroPortrait,
  hasUnitPortrait,
  heroPortraitBackplatePath,
  heroPortraitPath,
  unitPortraitBackplatePath,
  unitPortraitPath
} from "../../assets/optimized/portraits/loader";
import {
  PORTRAIT_FRAME_IDS,
  type PortraitFrameId,
  coercePortraitFrameId,
  DEFAULT_PORTRAIT_FRAME_ID
} from "../../content/portraitFrameStyles";
import PortraitFrameSvg from "../shared/PortraitFrameSvg.vue";
import { useI18n } from "../../i18n/useI18n";

const ADMIN_PORTRAIT_FRAME_KEY = "runebrawl.admin.portraitPreviewFrame";

const showAdmin = ref(true);
const username = ref("admin");
const password = ref("");
const authError = ref("");
const builderStatus = ref("");
const builderError = ref("");
const unitsDraftJson = ref("[]");
const heroesDraftJson = ref("[]");
const builderEditorMode = ref<"json" | "form">("form");
const formUnits = ref<UnitDefinition[]>([]);
const formHeroes = ref<HeroDefinition[]>([]);
const selectedUnitId = ref("");
const selectedHeroId = ref("");
const ratingLookupPlayerId = ref("");
const ratingLookupStatus = ref("");
const selectedCommunitySubmissionId = ref("");
const communitySubmissionStatus = ref("");
const rollbackStatus = ref("");
const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || `http://${location.hostname}:3001`;
const { t } = useI18n();

const UNIT_ROLES: UnitDefinition["role"][] = ["Tank", "Melee", "Ranged", "Support"];
const ROSTER_SHOP_CA_KEYS = ["melee", "ranged", "magic"] as const;
const ABILITY_KEYS: UnitDefinition["ability"][] = ["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"];
const SYNERGY_KEYS: string[] = ["BERSERKER"];
const HERO_POWER_TYPES: HeroDefinition["powerType"][] = ["PASSIVE", "ACTIVE"];
const HERO_POWER_KEYS: HeroDefinition["powerKey"][] = ["BONUS_GOLD", "WAR_DRUM", "RECRUITER", "FORTIFY"];

const {
  isAuthenticated,
  adminMetrics,
  adminLobbies,
  adminLobbyDetail,
  adminContentCatalog,
  adminContentDraft,
  adminContentHasDraft,
  adminContentValidation,
  adminContentPublishHistory,
  adminCommunitySubmissions,
  adminCommunitySubmissionDetail,
  adminUnitPool,
  adminRatingLeaderboard,
  adminRatingPlayer,
  adminEventFeed,
  adminLastErrorCode,
  adminLastErrorMessage,
  adminFilters,
  checkAuth,
  login,
  logout,
  refreshAdmin,
  loadAdminLobbies,
  loadAdminRatingLeaderboard,
  loadAdminRatingPlayer,
  loadAdminContentDraft,
  loadAdminContentPublishHistory,
  loadAdminUnitPool,
  loadAdminCommunitySubmissions,
  loadAdminCommunitySubmissionDetail,
  importAdminCommunitySubmissionToDraft,
  approvePublishAdminCommunitySubmission,
  rollbackAdminContentToAudit,
  saveAdminContentDraft,
  validateAdminContentDraft,
  publishAdminContentDraft,
  inspectAdminLobby,
  startAdminStream,
  stopAdminStream,
  startPolling,
  stopPolling
} = useAdminApi(apiBaseUrl);

const ADMIN_ERROR_KEYS: Record<string, string> = {
  ADMIN_UNAUTHORIZED: "admin.error.ADMIN_UNAUTHORIZED",
  ADMIN_INVALID_CREDENTIALS: "admin.error.ADMIN_INVALID_CREDENTIALS",
  ADMIN_MATCH_NOT_FOUND: "admin.error.ADMIN_MATCH_NOT_FOUND",
  ADMIN_RATING_NOT_FOUND: "admin.error.ADMIN_RATING_NOT_FOUND",
  ADMIN_CONTENT_SUBMISSION_NOT_FOUND: "admin.error.ADMIN_CONTENT_SUBMISSION_NOT_FOUND",
  ADMIN_CONTENT_AUDIT_NOT_FOUND: "admin.error.ADMIN_CONTENT_AUDIT_NOT_FOUND"
};

const topUnitBuys = computed(() => {
  const entries = Object.entries(adminMetrics.value?.unitBuys ?? {});
  return entries.sort((a, b) => b[1] - a[1]).slice(0, 8);
});

const topSynergyTriggers = computed(() => {
  const entries = Object.entries(adminMetrics.value?.synergyTriggers ?? {});
  return entries.sort((a, b) => b[1] - a[1]).slice(0, 8);
});

const topStartReasons = computed(() => {
  const entries = Object.entries(adminMetrics.value?.startReasons ?? {});
  return entries.sort((a, b) => b[1] - a[1]);
});

const rosterAnalysis = computed((): RosterAnalysis | null => {
  const c = adminContentCatalog.value;
  if (!c) return null;
  return analyzeContentRoster(c.units ?? [], c.heroes ?? []);
});

const rosterTierColumnIndices = computed(() => {
  const r = rosterAnalysis.value;
  const n = r ? Math.max(6, r.maxUnitTier) : 6;
  return Array.from({ length: n }, (_, i) => i + 1);
});

const rosterRoleTierMatrix = computed(() => {
  const r = rosterAnalysis.value;
  if (!r) return [];
  return roleTierMatrixRows(r.byRoleByTier, UNIT_ROLES, rosterTierColumnIndices.value.length);
});

function combatArchetypeLabel(key: string): string {
  if (key === "melee") return t("admin.roster.combat.melee");
  if (key === "ranged") return t("admin.roster.combat.ranged");
  if (key === "magic") return t("admin.roster.combat.magic");
  return key;
}

function formatRosterWarning(w: RosterAnalysis["warningKeys"][number]): string {
  const params: Record<string, string | number> = {};
  if (w.count !== undefined) params.count = w.count;
  if (w.tier !== undefined) params.tier = w.tier;
  if (w.race !== undefined) params.race = w.race;
  if (w.role !== undefined) params.role = w.role;
  if (w.tag !== undefined) params.tag = w.tag;
  if (w.lateTier !== undefined) params.lateTier = w.lateTier;
  if (w.pct !== undefined) params.pct = w.pct;
  if (w.archetype !== undefined) params.archetype = combatArchetypeLabel(w.archetype);
  return t(`admin.roster.warning.${w.key}`, params);
}

function formatShopWeightStats(shop: NonNullable<RosterAnalysis["shopWeight"]>): string {
  return t("admin.roster.shopWeightStats", {
    min: shop.min.toFixed(2),
    max: shop.max.toFixed(2),
    avg: shop.avg.toFixed(2)
  });
}

const adminPortraitPreviewFrame = ref<PortraitFrameId>(DEFAULT_PORTRAIT_FRAME_ID);
const ADMIN_PREVIEW_PHASES: GamePhase[] = ["LOBBY", "HERO_SELECTION", "TAVERN", "POSITIONING", "COMBAT", "ROUND_END", "FINISHED"];
const adminPreviewPhase = ref<GamePhase>("TAVERN");
const adminPreviewEmbed = ref(false);
const adminPreviewReloadToken = ref(0);
const adminPreviewAutoCycle = ref(false);
const adminPreviewCycleMs = ref(3000);
let adminPreviewCycleTimer: ReturnType<typeof setInterval> | null = null;
const ADMIN_PREVIEW_CYCLE: GamePhase[] = ["TAVERN", "POSITIONING", "COMBAT", "ROUND_END"];

const portraitUnitPreview = computed(() =>
  (adminContentCatalog.value?.units ?? []).map((unit) => ({
    id: unit.id,
    name: unit.name,
    tier: unit.tier,
    role: unit.role,
    bgSrc: unitPortraitBackplatePath(unit.id),
    src: unitPortraitPath(unit.id),
    exists: hasUnitPortrait(unit.id)
  }))
);

const portraitHeroPreview = computed(() =>
  (adminContentCatalog.value?.heroes ?? []).map((hero) => ({
    id: hero.id,
    name: hero.name,
    bgSrc: heroPortraitBackplatePath(hero.id),
    src: heroPortraitPath(hero.id),
    exists: hasHeroPortrait(hero.id)
  }))
);

type AdminTierPreviewClass = "tier-low" | "tier-mid" | "tier-high";

function adminPreviewTierClass(tier: number): AdminTierPreviewClass {
  const n = Math.round(Number(tier)) || 1;
  if (n <= 2) return "tier-low";
  if (n <= 4) return "tier-mid";
  return "tier-high";
}

const adminMockPreviewUrl = computed(() => {
  const u = new URL(window.location.origin);
  u.pathname = "/";
  u.searchParams.set("rb_mock", "1");
  u.searchParams.set("rb_phase", adminPreviewPhase.value);
  u.hash = "";
  return u.toString();
});

function openAdminMockPreview(): void {
  window.open(adminMockPreviewUrl.value, "_blank", "noopener,noreferrer");
}

function reloadAdminMockPreview(): void {
  adminPreviewReloadToken.value += 1;
}

function nextAdminPreviewPhase(): void {
  const idx = ADMIN_PREVIEW_PHASES.indexOf(adminPreviewPhase.value);
  const nextIdx = idx >= 0 ? (idx + 1) % ADMIN_PREVIEW_PHASES.length : 0;
  adminPreviewPhase.value = ADMIN_PREVIEW_PHASES[nextIdx] ?? "TAVERN";
}

function prevAdminPreviewPhase(): void {
  const idx = ADMIN_PREVIEW_PHASES.indexOf(adminPreviewPhase.value);
  const prevIdx = idx >= 0 ? (idx - 1 + ADMIN_PREVIEW_PHASES.length) % ADMIN_PREVIEW_PHASES.length : 0;
  adminPreviewPhase.value = ADMIN_PREVIEW_PHASES[prevIdx] ?? "TAVERN";
}

function stepAdminPreviewCycle(): void {
  const idx = ADMIN_PREVIEW_CYCLE.indexOf(adminPreviewPhase.value);
  const nextIdx = idx >= 0 ? (idx + 1) % ADMIN_PREVIEW_CYCLE.length : 0;
  adminPreviewPhase.value = ADMIN_PREVIEW_CYCLE[nextIdx] ?? "TAVERN";
}

function stopAdminPreviewCycle(): void {
  if (adminPreviewCycleTimer) {
    clearInterval(adminPreviewCycleTimer);
    adminPreviewCycleTimer = null;
  }
}

function startAdminPreviewCycle(): void {
  stopAdminPreviewCycle();
  adminPreviewCycleTimer = setInterval(stepAdminPreviewCycle, Math.max(1200, adminPreviewCycleMs.value));
}

const SYNERGY_LABELS: Record<string, string> = {
  BERSERKER: t("synergy.BERSERKER.label")
};

function formatSynergyLabel(key: string): string {
  return key === "BERSERKER" ? t("synergy.BERSERKER.label") : SYNERGY_LABELS[key] ?? key;
}

function formatPhaseLabel(phase: string): string {
  return t(`phase.${phase}`);
}

function formatStartReasonLabel(key: string): string {
  return t(`admin.reason.${key}`);
}

function formatAdminError(code: string | null, fallback: string): string {
  if (code && ADMIN_ERROR_KEYS[code]) {
    return t(ADMIN_ERROR_KEYS[code]);
  }
  return fallback;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function formatBuilderUpdatedAt(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatBuilderAuditAction(action: string): string {
  return t(`admin.builder.audit.action.${action}`);
}

function formatBuilderAuditSource(source: string): string {
  return t(`admin.builder.audit.source.${source}`);
}

function formatPoolPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function syncDraftEditors(): void {
  if (!adminContentDraft.value) return;
  unitsDraftJson.value = JSON.stringify(adminContentDraft.value.units, null, 2);
  heroesDraftJson.value = JSON.stringify(adminContentDraft.value.heroes, null, 2);
  syncFormFromJson();
}

function parseDraftJson(): { units: UnitDefinition[]; heroes: HeroDefinition[]; error?: string } {
  try {
    const units = JSON.parse(unitsDraftJson.value) as UnitDefinition[];
    const heroes = JSON.parse(heroesDraftJson.value) as HeroDefinition[];
    if (!Array.isArray(units) || !Array.isArray(heroes)) {
      return { units: [], heroes: [], error: t("admin.builder.error.jsonArrays") };
    }
    return { units, heroes };
  } catch {
    return { units: [], heroes: [], error: t("admin.builder.error.invalidJson") };
  }
}

function syncFormFromJson(): void {
  const parsed = parseDraftJson();
  if (parsed.error) {
    builderError.value = parsed.error;
    return;
  }
  formUnits.value = parsed.units.map((u) => ({ ...u, tags: u.tags ? [...u.tags] : undefined }));
  formHeroes.value = parsed.heroes.map((h) => ({ ...h }));
  selectedUnitId.value = formUnits.value[0]?.id ?? "";
  selectedHeroId.value = formHeroes.value[0]?.id ?? "";
}

function syncJsonFromForm(): void {
  unitsDraftJson.value = JSON.stringify(formUnits.value, null, 2);
  heroesDraftJson.value = JSON.stringify(formHeroes.value, null, 2);
}

const selectedUnit = computed(() => formUnits.value.find((u) => u.id === selectedUnitId.value) ?? null);
const selectedHero = computed(() => formHeroes.value.find((h) => h.id === selectedHeroId.value) ?? null);
const duplicateUnitIds = computed(() => {
  const counts = new Map<string, number>();
  for (const unit of formUnits.value) {
    counts.set(unit.id, (counts.get(unit.id) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
});
const duplicateHeroIds = computed(() => {
  const counts = new Map<string, number>();
  for (const hero of formHeroes.value) {
    counts.set(hero.id, (counts.get(hero.id) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
});

const selectedUnitTagsText = computed({
  get(): string {
    return (selectedUnit.value?.tags ?? []).join(", ");
  },
  set(next: string) {
    if (!selectedUnit.value) return;
    const tags = next
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    selectedUnit.value.tags = tags.length > 0 ? (tags as UnitDefinition["tags"]) : undefined;
  }
});

const selectedUnitErrors = computed(() => {
  if (!selectedUnit.value) return [];
  const errors: string[] = [];
  const unit = selectedUnit.value;
  if (!unit.id.trim()) errors.push(t("admin.builder.validation.unit.idRequired"));
  if (duplicateUnitIds.value.has(unit.id)) errors.push(t("admin.builder.validation.unit.idDuplicate", { id: unit.id }));
  if (!unit.name.trim()) errors.push(t("admin.builder.validation.unit.nameRequired"));
  if (!UNIT_ROLES.includes(unit.role)) errors.push(t("admin.builder.validation.unit.invalidRole", { role: unit.role }));
  if (!ABILITY_KEYS.includes(unit.ability)) errors.push(t("admin.builder.validation.unit.invalidAbility", { ability: unit.ability }));
  if (!Number.isFinite(unit.tier) || unit.tier < 1 || unit.tier > 6) errors.push(t("admin.builder.validation.unit.tierRange"));
  if (!Number.isFinite(unit.attack) || unit.attack < 0) errors.push(t("admin.builder.validation.unit.attackRange"));
  if (!Number.isFinite(unit.hp) || unit.hp <= 0) errors.push(t("admin.builder.validation.unit.hpRange"));
  if (!Number.isFinite(unit.shopWeight) || (unit.shopWeight ?? 0) <= 0) errors.push(t("admin.builder.validation.unit.shopWeightRange"));
  for (const tag of unit.tags ?? []) {
    if (!SYNERGY_KEYS.includes(tag)) errors.push(t("admin.builder.validation.unit.invalidTag", { tag }));
  }
  if (unit.magicSpell && !(MAGIC_SPELL_VISUAL_IDS as readonly string[]).includes(unit.magicSpell)) {
    errors.push(t("admin.builder.validation.unit.invalidMagicSpell", { spell: String(unit.magicSpell) }));
  }
  if (unit.race && !(UNIT_RACES as readonly string[]).includes(unit.race)) {
    errors.push(t("admin.builder.validation.unit.invalidRace", { race: String(unit.race) }));
  }
  return errors;
});

const selectedHeroErrors = computed(() => {
  if (!selectedHero.value) return [];
  const errors: string[] = [];
  const hero = selectedHero.value;
  if (!hero.id.trim()) errors.push(t("admin.builder.validation.hero.idRequired"));
  if (duplicateHeroIds.value.has(hero.id)) errors.push(t("admin.builder.validation.hero.idDuplicate", { id: hero.id }));
  if (!hero.name.trim()) errors.push(t("admin.builder.validation.hero.nameRequired"));
  if (!hero.description.trim()) errors.push(t("admin.builder.validation.hero.descriptionRequired"));
  if (!HERO_POWER_TYPES.includes(hero.powerType)) errors.push(t("admin.builder.validation.hero.invalidPowerType", { powerType: hero.powerType }));
  if (!HERO_POWER_KEYS.includes(hero.powerKey)) errors.push(t("admin.builder.validation.hero.invalidPowerKey", { powerKey: hero.powerKey }));
  if (!Number.isFinite(hero.powerCost) || hero.powerCost < 0) errors.push(t("admin.builder.validation.hero.powerCostRange"));
  if (!Number.isFinite(hero.offerWeight) || (hero.offerWeight ?? 0) <= 0) errors.push(t("admin.builder.validation.hero.offerWeightRange"));
  if (hero.powerType === "PASSIVE" && hero.powerCost !== 0) errors.push(t("admin.builder.validation.hero.passiveCostZero"));
  if (hero.race && !(UNIT_RACES as readonly string[]).includes(hero.race)) {
    errors.push(t("admin.builder.validation.hero.invalidRace", { race: String(hero.race) }));
  }
  return errors;
});

const hasFormValidationErrors = computed(() => selectedUnitErrors.value.length > 0 || selectedHeroErrors.value.length > 0);

function unitFieldInvalid(
  field: "id" | "name" | "tier" | "attack" | "hp" | "shopWeight" | "role" | "ability" | "tags" | "race"
): boolean {
  if (!selectedUnit.value) return false;
  const unit = selectedUnit.value;
  switch (field) {
    case "id":
      return !unit.id.trim() || duplicateUnitIds.value.has(unit.id);
    case "name":
      return !unit.name.trim();
    case "tier":
      return !Number.isFinite(unit.tier) || unit.tier < 1 || unit.tier > 6;
    case "attack":
      return !Number.isFinite(unit.attack) || unit.attack < 0;
    case "hp":
      return !Number.isFinite(unit.hp) || unit.hp <= 0;
    case "shopWeight":
      return !Number.isFinite(unit.shopWeight) || (unit.shopWeight ?? 0) <= 0;
    case "role":
      return !UNIT_ROLES.includes(unit.role);
    case "ability":
      return !ABILITY_KEYS.includes(unit.ability);
    case "tags":
      return (unit.tags ?? []).some((tag) => !SYNERGY_KEYS.includes(tag));
    case "race":
      return !!(unit.race && !(UNIT_RACES as readonly string[]).includes(unit.race));
  }
}

function heroFieldInvalid(
  field: "id" | "name" | "description" | "powerType" | "powerKey" | "powerCost" | "offerWeight" | "race"
): boolean {
  if (!selectedHero.value) return false;
  const hero = selectedHero.value;
  switch (field) {
    case "id":
      return !hero.id.trim() || duplicateHeroIds.value.has(hero.id);
    case "name":
      return !hero.name.trim();
    case "description":
      return !hero.description.trim();
    case "powerType":
      return !HERO_POWER_TYPES.includes(hero.powerType);
    case "powerKey":
      return !HERO_POWER_KEYS.includes(hero.powerKey);
    case "powerCost":
      return !Number.isFinite(hero.powerCost) || hero.powerCost < 0 || (hero.powerType === "PASSIVE" && hero.powerCost !== 0);
    case "offerWeight":
      return !Number.isFinite(hero.offerWeight) || (hero.offerWeight ?? 0) <= 0;
    case "race":
      return !!(hero.race && !(UNIT_RACES as readonly string[]).includes(hero.race));
  }
}

function onUnitRaceChange(e: Event): void {
  if (!selectedUnit.value) return;
  const v = (e.target as HTMLSelectElement).value;
  selectedUnit.value.race = v === "" ? undefined : (v as UnitRace);
}

function onHeroRaceChange(e: Event): void {
  if (!selectedHero.value) return;
  const v = (e.target as HTMLSelectElement).value;
  selectedHero.value.race = v === "" ? undefined : (v as UnitRace);
}

const builderDiffSummary = computed(() => {
  if (!adminContentCatalog.value) return [];
  const parsed = parseDraftJson();
  if (parsed.error) return [parsed.error];

  const lines: string[] = [];
  const catalogUnits = new Map(adminContentCatalog.value.units.map((u) => [u.id, JSON.stringify(u)]));
  const draftUnits = new Map(parsed.units.map((u) => [u.id, JSON.stringify(u)]));
  const catalogHeroes = new Map(adminContentCatalog.value.heroes.map((h) => [h.id, JSON.stringify(h)]));
  const draftHeroes = new Map(parsed.heroes.map((h) => [h.id, JSON.stringify(h)]));

  const unitAdded = [...draftUnits.keys()].filter((id) => !catalogUnits.has(id));
  const unitRemoved = [...catalogUnits.keys()].filter((id) => !draftUnits.has(id));
  const unitChanged = [...draftUnits.keys()].filter((id) => catalogUnits.has(id) && catalogUnits.get(id) !== draftUnits.get(id));

  const heroAdded = [...draftHeroes.keys()].filter((id) => !catalogHeroes.has(id));
  const heroRemoved = [...catalogHeroes.keys()].filter((id) => !draftHeroes.has(id));
  const heroChanged = [...draftHeroes.keys()].filter((id) => catalogHeroes.has(id) && catalogHeroes.get(id) !== draftHeroes.get(id));

  lines.push(t("admin.builder.diff.unitsSummary", { added: unitAdded.length, removed: unitRemoved.length, changed: unitChanged.length }));
  lines.push(t("admin.builder.diff.heroesSummary", { added: heroAdded.length, removed: heroRemoved.length, changed: heroChanged.length }));
  if (unitAdded.length > 0) lines.push(t("admin.builder.diff.unitAdded", { ids: unitAdded.join(", ") }));
  if (unitRemoved.length > 0) lines.push(t("admin.builder.diff.unitRemoved", { ids: unitRemoved.join(", ") }));
  if (heroAdded.length > 0) lines.push(t("admin.builder.diff.heroAdded", { ids: heroAdded.join(", ") }));
  if (heroRemoved.length > 0) lines.push(t("admin.builder.diff.heroRemoved", { ids: heroRemoved.join(", ") }));
  return lines;
});

function addUnitFormRow(): void {
  const nextId = `new_unit_${formUnits.value.length + 1}`;
  formUnits.value.push({
    id: nextId,
    name: t("admin.builder.defaults.newUnitName"),
    role: "Melee",
    tier: 1,
    attack: 1,
    hp: 1,
    ability: "NONE",
    shopWeight: 1
  });
  selectedUnitId.value = nextId;
  syncJsonFromForm();
}

function removeSelectedUnit(): void {
  if (!selectedUnit.value) return;
  const idx = formUnits.value.findIndex((u) => u.id === selectedUnit.value?.id);
  if (idx < 0) return;
  formUnits.value.splice(idx, 1);
  selectedUnitId.value = formUnits.value[0]?.id ?? "";
  syncJsonFromForm();
}

function addHeroFormRow(): void {
  const nextId = `new_hero_${formHeroes.value.length + 1}`;
  formHeroes.value.push({
    id: nextId,
    name: t("admin.builder.defaults.newHeroName"),
    description: t("admin.builder.defaults.newHeroDescription"),
    powerType: "ACTIVE",
    powerKey: "WAR_DRUM",
    powerCost: 1,
    offerWeight: 1
  });
  selectedHeroId.value = nextId;
  syncJsonFromForm();
}

function removeSelectedHero(): void {
  if (!selectedHero.value) return;
  const idx = formHeroes.value.findIndex((h) => h.id === selectedHero.value?.id);
  if (idx < 0) return;
  formHeroes.value.splice(idx, 1);
  selectedHeroId.value = formHeroes.value[0]?.id ?? "";
  syncJsonFromForm();
}

async function loadBuilderDraft(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  await loadAdminContentDraft();
  syncDraftEditors();
}

async function saveBuilderDraft(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  if (builderEditorMode.value === "form" && hasFormValidationErrors.value) {
    builderError.value = t("admin.builder.error.fixBeforeSave");
    return;
  }
  let units: UnitDefinition[];
  let heroes: HeroDefinition[];
  if (builderEditorMode.value === "form") {
    syncJsonFromForm();
  }
  try {
    units = JSON.parse(unitsDraftJson.value) as UnitDefinition[];
    heroes = JSON.parse(heroesDraftJson.value) as HeroDefinition[];
  } catch {
    builderError.value = t("admin.builder.error.invalidJson");
    return;
  }
  const result = await saveAdminContentDraft(units, heroes);
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  builderStatus.value = t("admin.builder.status.saved");
}

async function validateBuilderDraft(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  if (builderEditorMode.value === "form") {
    syncJsonFromForm();
  }
  const result = await validateAdminContentDraft();
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  builderStatus.value = t("admin.builder.status.validationPassed");
}

async function publishBuilderDraft(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  if (builderEditorMode.value === "form" && hasFormValidationErrors.value) {
    builderError.value = t("admin.builder.error.fixBeforePublish");
    return;
  }
  if (builderEditorMode.value === "form") {
    syncJsonFromForm();
  }
  if (!window.confirm(`${t("admin.builder.confirmPublish")}\n${builderDiffSummary.value.join("\n")}`)) {
    return;
  }
  const result = await publishAdminContentDraft();
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  builderStatus.value = t("admin.builder.status.published");
  await loadBuilderDraft();
}

async function refreshCommunitySubmissions(): Promise<void> {
  communitySubmissionStatus.value = "";
  await loadAdminCommunitySubmissions();
}

async function previewCommunitySubmission(): Promise<void> {
  communitySubmissionStatus.value = "";
  const trimmed = selectedCommunitySubmissionId.value.trim();
  if (!trimmed) {
    communitySubmissionStatus.value = t("admin.builder.community.selectFirst");
    return;
  }
  const detail = await loadAdminCommunitySubmissionDetail(trimmed);
  if (!detail) {
    communitySubmissionStatus.value = formatAdminError(adminLastErrorCode.value, adminLastErrorMessage.value || t("admin.builder.community.previewFailed"));
    return;
  }
  communitySubmissionStatus.value = t("admin.builder.community.previewLoaded", { id: detail.submissionId });
}

async function importCommunitySubmissionToDraft(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  communitySubmissionStatus.value = "";
  const trimmed = selectedCommunitySubmissionId.value.trim();
  if (!trimmed) {
    communitySubmissionStatus.value = t("admin.builder.community.selectFirst");
    return;
  }
  const result = await importAdminCommunitySubmissionToDraft(trimmed);
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  await loadBuilderDraft();
  communitySubmissionStatus.value = t("admin.builder.community.imported", { id: trimmed });
}

async function approveAndPublishCommunitySubmission(): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  rollbackStatus.value = "";
  communitySubmissionStatus.value = "";
  const trimmed = selectedCommunitySubmissionId.value.trim();
  if (!trimmed) {
    communitySubmissionStatus.value = t("admin.builder.community.selectFirst");
    return;
  }
  if (!window.confirm(t("admin.builder.community.confirmApprovePublish", { id: trimmed }))) {
    return;
  }
  const result = await approvePublishAdminCommunitySubmission(trimmed);
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  await loadBuilderDraft();
  builderStatus.value = t("admin.builder.community.approvedPublished", { id: trimmed });
}

async function rollbackToAudit(auditId: string): Promise<void> {
  builderStatus.value = "";
  builderError.value = "";
  rollbackStatus.value = "";
  if (!window.confirm(t("admin.builder.audit.confirmRollback", { auditId }))) {
    return;
  }
  const result = await rollbackAdminContentToAudit(auditId);
  if (!result.ok) {
    builderError.value = result.errors.join(" | ");
    return;
  }
  await Promise.all([loadBuilderDraft(), loadAdminContentPublishHistory(30)]);
  rollbackStatus.value = t("admin.builder.audit.rollbackSuccess", { auditId });
}

async function doLogin(): Promise<void> {
  authError.value = "";
  const result = await login(username.value, password.value);
  if (!result.ok) {
    authError.value = formatAdminError(result.errorCode ?? null, t("admin.loginFailed"));
    return;
  }
  password.value = "";
  startPolling(5000);
  await refreshAdmin();
  await loadBuilderDraft();
  await loadAdminContentPublishHistory(30);
}

async function doLogout(): Promise<void> {
  await logout();
  stopPolling();
}

async function refreshRatingLeaderboard(): Promise<void> {
  ratingLookupStatus.value = "";
  await loadAdminRatingLeaderboard(20);
}

async function lookupRatingPlayer(): Promise<void> {
  ratingLookupStatus.value = "";
  const trimmed = ratingLookupPlayerId.value.trim();
  if (!trimmed) {
    ratingLookupStatus.value = t("admin.ratings.enterPlayerId");
    return;
  }
  const rating = await loadAdminRatingPlayer(trimmed);
  if (!rating) {
    ratingLookupStatus.value = formatAdminError(adminLastErrorCode.value, adminLastErrorMessage.value || t("admin.ratings.notFound"));
    return;
  }
  ratingLookupStatus.value = t("admin.ratings.loaded", { playerId: rating.playerId });
}

watch(adminPortraitPreviewFrame, (v) => {
  try {
    localStorage.setItem(ADMIN_PORTRAIT_FRAME_KEY, v);
  } catch {
    /* ignore */
  }
});

watch(
  () => [adminPreviewAutoCycle.value, adminPreviewCycleMs.value],
  () => {
    if (adminPreviewAutoCycle.value) {
      startAdminPreviewCycle();
    } else {
      stopAdminPreviewCycle();
    }
  }
);

watch(adminPreviewPhase, () => {
  reloadAdminMockPreview();
});

onMounted(() => {
  try {
    const stored = localStorage.getItem(ADMIN_PORTRAIT_FRAME_KEY);
    if (stored) adminPortraitPreviewFrame.value = coercePortraitFrameId(stored);
  } catch {
    /* ignore */
  }
  void checkAuth().then(() => {
    if (isAuthenticated.value) {
      void refreshAdmin();
      startPolling(5000);
      void loadBuilderDraft();
    }
  });
});

watch(
  () => [selectedUnit.value, selectedHero.value],
  () => {
    if (builderEditorMode.value === "form") {
      syncJsonFromForm();
    }
  },
  { deep: true }
);

watch(
  () => adminCommunitySubmissions.value,
  (next) => {
    if (!next.length) {
      selectedCommunitySubmissionId.value = "";
      return;
    }
    if (!selectedCommunitySubmissionId.value) {
      selectedCommunitySubmissionId.value = next[0].submissionId;
    }
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  stopAdminPreviewCycle();
  stopPolling();
  stopAdminStream();
});
</script>

<template>
  <section class="admin-panel">
    <div class="admin-header">
      <h2>{{ t("admin.title") }}</h2>
      <div class="actions">
        <button v-if="isAuthenticated" @click="doLogout">{{ t("admin.logout") }}</button>
        <button @click="showAdmin = !showAdmin">{{ showAdmin ? t("admin.hide") : t("admin.show") }}</button>
        <button @click="refreshAdmin">{{ t("admin.refresh") }}</button>
      </div>
    </div>

    <div v-if="showAdmin && !isAuthenticated" class="admin-card">
      <h3>{{ t("admin.loginTitle") }}</h3>
      <div class="join-card">
        <input v-model="username" :placeholder="t('admin.username')" />
        <input v-model="password" type="password" :placeholder="t('admin.password')" />
        <button @click="doLogin">{{ t("admin.login") }}</button>
      </div>
      <p v-if="authError" class="error">{{ authError }}</p>
      <p v-else-if="adminLastErrorCode || adminLastErrorMessage" class="error">
        {{ formatAdminError(adminLastErrorCode, adminLastErrorMessage) }}
      </p>
      <p class="slot-title">{{ t("admin.envHint") }}</p>
    </div>

    <div v-if="showAdmin && isAuthenticated" class="admin-grid">
      <p v-if="adminLastErrorCode || adminLastErrorMessage" class="error">
        {{ formatAdminError(adminLastErrorCode, adminLastErrorMessage) }}
      </p>
      <div class="admin-card">
        <h3>{{ t("admin.builder.title") }}</h3>
        <p class="slot-title" v-if="adminContentCatalog">
          {{ t("admin.builder.runtimeVersion", { version: adminContentCatalog.version, updatedAt: formatBuilderUpdatedAt(adminContentCatalog.updatedAt) }) }}
        </p>
        <p class="slot-title" v-if="adminContentDraft">
          {{ t("admin.builder.draftSource") }}: {{ adminContentHasDraft ? t("admin.builder.customDraft") : t("admin.builder.runtimeSnapshot") }} |
          {{ t("admin.builder.unitsCount", { count: adminContentDraft.units.length }) }} |
          {{ t("admin.builder.heroesCount", { count: adminContentDraft.heroes.length }) }}
        </p>
        <div class="actions">
          <button @click="loadBuilderDraft">{{ t("admin.builder.loadDraft") }}</button>
          <button @click="syncFormFromJson">{{ t("admin.builder.syncFormFromJson") }}</button>
          <button @click="syncJsonFromForm">{{ t("admin.builder.applyFormToJson") }}</button>
          <button @click="saveBuilderDraft">{{ t("admin.builder.saveDraft") }}</button>
          <button @click="validateBuilderDraft">{{ t("admin.builder.validateDraft") }}</button>
          <button @click="publishBuilderDraft">{{ t("admin.builder.publishDraft") }}</button>
          <select v-model="builderEditorMode">
            <option value="form">{{ t("admin.builder.formEditor") }}</option>
            <option value="json">{{ t("admin.builder.jsonEditor") }}</option>
          </select>
        </div>
        <div class="log">
          <div><strong>{{ t("admin.builder.community.title") }}</strong></div>
          <div class="actions">
            <button @click="refreshCommunitySubmissions">{{ t("admin.builder.community.refresh") }}</button>
            <select v-model="selectedCommunitySubmissionId">
              <option value="">{{ t("admin.builder.community.select") }}</option>
              <option v-for="submission in adminCommunitySubmissions" :key="`submission-${submission.submissionId}`" :value="submission.submissionId">
                {{ submission.submissionId }} ({{ submission.unitsCount }}U/{{ submission.heroesCount }}H) {{ submission.validation.ok ? "OK" : "ERR" }}
              </option>
            </select>
            <button @click="previewCommunitySubmission">{{ t("admin.builder.community.preview") }}</button>
            <button @click="importCommunitySubmissionToDraft">{{ t("admin.builder.community.importToDraft") }}</button>
            <button @click="approveAndPublishCommunitySubmission">{{ t("admin.builder.community.approvePublish") }}</button>
          </div>
          <div v-if="communitySubmissionStatus" class="slot-title">{{ communitySubmissionStatus }}</div>
          <div v-if="adminCommunitySubmissionDetail">
            <div>
              {{ t("admin.builder.community.detail", {
                id: adminCommunitySubmissionDetail.submissionId,
                units: adminCommunitySubmissionDetail.unitsCount,
                heroes: adminCommunitySubmissionDetail.heroesCount
              }) }}
            </div>
            <div v-if="adminCommunitySubmissionDetail.metadata" class="slot-title">
              {{ adminCommunitySubmissionDetail.metadata.title }} - {{ adminCommunitySubmissionDetail.metadata.author }} v{{ adminCommunitySubmissionDetail.metadata.version }}
            </div>
            <div v-if="!adminCommunitySubmissionDetail.validation.ok" class="error">
              {{ adminCommunitySubmissionDetail.validation.errors.join(" | ") }}
            </div>
          </div>
          <div v-else class="slot-title">{{ t("admin.builder.community.noneSelected") }}</div>
        </div>
        <div class="log">
          <div><strong>{{ t("admin.builder.audit.title") }}</strong></div>
          <div class="actions">
            <button @click="loadAdminContentPublishHistory(30)">{{ t("admin.builder.audit.refresh") }}</button>
          </div>
          <div v-if="rollbackStatus" class="slot-title">{{ rollbackStatus }}</div>
          <div v-for="entry in adminContentPublishHistory" :key="`audit-${entry.auditId}`" class="admin-row">
            <span>
              {{ formatBuilderUpdatedAt(entry.at) }} |
              {{ formatBuilderAuditAction(entry.action) }} |
              {{ formatBuilderAuditSource(entry.source) }} |
              v{{ entry.fromVersion }} -> v{{ entry.toVersion }} |
              {{ entry.unitsCount }}U/{{ entry.heroesCount }}H
            </span>
            <button @click="rollbackToAudit(entry.auditId)">{{ t("admin.builder.audit.rollback") }}</button>
          </div>
          <div v-if="adminContentPublishHistory.length === 0" class="slot-title">{{ t("admin.builder.audit.empty") }}</div>
        </div>
        <p v-if="builderStatus" class="slot-title">{{ builderStatus }}</p>
        <p v-if="builderError" class="error">{{ builderError }}</p>
        <p v-if="adminContentValidation && !adminContentValidation.ok" class="error">
          {{ adminContentValidation.errors.join(" | ") }}
        </p>
        <div class="log">
          <div><strong>{{ t("admin.builder.diffPreview") }}</strong></div>
          <div v-for="(line, idx) in builderDiffSummary" :key="`diff-${idx}`">{{ line }}</div>
        </div>
        <div class="builder-grid">
          <template v-if="builderEditorMode === 'json'">
            <label>
              {{ t("admin.builder.unitsJson") }}
              <textarea v-model="unitsDraftJson" rows="16" spellcheck="false"></textarea>
            </label>
            <label>
              {{ t("admin.builder.heroesJson") }}
              <textarea v-model="heroesDraftJson" rows="16" spellcheck="false"></textarea>
            </label>
          </template>
          <template v-else>
            <div class="builder-form-grid">
              <div class="admin-card">
                <div class="actions">
                  <strong>{{ t("admin.builder.unitEditor") }}</strong>
                  <button @click="addUnitFormRow">{{ t("admin.builder.addUnit") }}</button>
                  <button @click="removeSelectedUnit" :disabled="!selectedUnit">{{ t("admin.builder.removeSelected") }}</button>
                </div>
                <select v-model="selectedUnitId">
                  <option v-for="unit in formUnits" :key="`sel-unit-${unit.id}`" :value="unit.id">
                    {{ unit.id }} - {{ unit.name }}
                  </option>
                </select>
                <div v-if="selectedUnit" class="builder-fields">
                  <input v-model="selectedUnit.id" :placeholder="t('admin.builder.id')" :class="{ 'input-invalid': unitFieldInvalid('id') }" />
                  <input v-model="selectedUnit.name" :placeholder="t('admin.builder.name')" :class="{ 'input-invalid': unitFieldInvalid('name') }" />
                  <select v-model="selectedUnit.role" :class="{ 'input-invalid': unitFieldInvalid('role') }">
                    <option v-for="role in UNIT_ROLES" :key="`role-${role}`" :value="role">{{ role }}</option>
                  </select>
                  <input v-model.number="selectedUnit.tier" type="number" min="1" max="6" :class="{ 'input-invalid': unitFieldInvalid('tier') }" />
                  <input v-model.number="selectedUnit.attack" type="number" min="0" :class="{ 'input-invalid': unitFieldInvalid('attack') }" />
                  <input v-model.number="selectedUnit.hp" type="number" min="1" :class="{ 'input-invalid': unitFieldInvalid('hp') }" />
                  <input v-model.number="selectedUnit.shopWeight" type="number" min="0.01" step="0.01" :placeholder="t('admin.builder.shopWeight')" :class="{ 'input-invalid': unitFieldInvalid('shopWeight') }" />
                  <select v-model="selectedUnit.ability" :class="{ 'input-invalid': unitFieldInvalid('ability') }">
                    <option v-for="ability in ABILITY_KEYS" :key="`ability-${ability}`" :value="ability">{{ ability }}</option>
                  </select>
                  <label class="builder-label">{{ t("admin.builder.race") }}</label>
                  <select
                    :value="selectedUnit.race ?? ''"
                    :class="{ 'input-invalid': unitFieldInvalid('race') }"
                    @change="onUnitRaceChange"
                  >
                    <option value="">{{ t("admin.builder.raceNone") }}</option>
                    <option v-for="r in UNIT_RACES" :key="`urace-${r}`" :value="r">{{ r }}</option>
                  </select>
                  <input
                    v-model="selectedUnitTagsText"
                    :placeholder="t('admin.builder.tagsPlaceholder', { tags: SYNERGY_KEYS.join(', ') })"
                    :class="{ 'input-invalid': unitFieldInvalid('tags') }"
                  />
                </div>
                <div v-if="selectedUnitErrors.length > 0" class="builder-errors">
                  <div v-for="(err, idx) in selectedUnitErrors" :key="`unit-err-${idx}`">{{ err }}</div>
                </div>
              </div>
              <div class="admin-card">
                <div class="actions">
                  <strong>{{ t("admin.builder.heroEditor") }}</strong>
                  <button @click="addHeroFormRow">{{ t("admin.builder.addHero") }}</button>
                  <button @click="removeSelectedHero" :disabled="!selectedHero">{{ t("admin.builder.removeSelected") }}</button>
                </div>
                <select v-model="selectedHeroId">
                  <option v-for="hero in formHeroes" :key="`sel-hero-${hero.id}`" :value="hero.id">
                    {{ hero.id }} - {{ hero.name }}
                  </option>
                </select>
                <div v-if="selectedHero" class="builder-fields">
                  <input v-model="selectedHero.id" :placeholder="t('admin.builder.id')" :class="{ 'input-invalid': heroFieldInvalid('id') }" />
                  <input v-model="selectedHero.name" :placeholder="t('admin.builder.name')" :class="{ 'input-invalid': heroFieldInvalid('name') }" />
                  <input v-model="selectedHero.description" :placeholder="t('admin.builder.description')" :class="{ 'input-invalid': heroFieldInvalid('description') }" />
                  <select v-model="selectedHero.powerType" :class="{ 'input-invalid': heroFieldInvalid('powerType') }">
                    <option v-for="powerType in HERO_POWER_TYPES" :key="`ptype-${powerType}`" :value="powerType">{{ powerType }}</option>
                  </select>
                  <select v-model="selectedHero.powerKey" :class="{ 'input-invalid': heroFieldInvalid('powerKey') }">
                    <option v-for="powerKey in HERO_POWER_KEYS" :key="`pkey-${powerKey}`" :value="powerKey">{{ powerKey }}</option>
                  </select>
                  <input v-model.number="selectedHero.powerCost" type="number" min="0" :class="{ 'input-invalid': heroFieldInvalid('powerCost') }" />
                  <input v-model.number="selectedHero.offerWeight" type="number" min="0.01" step="0.01" :placeholder="t('admin.builder.offerWeight')" :class="{ 'input-invalid': heroFieldInvalid('offerWeight') }" />
                  <label class="builder-label">{{ t("admin.builder.race") }}</label>
                  <select
                    :value="selectedHero.race ?? ''"
                    :class="{ 'input-invalid': heroFieldInvalid('race') }"
                    @change="onHeroRaceChange"
                  >
                    <option value="">{{ t("admin.builder.raceNone") }}</option>
                    <option v-for="r in UNIT_RACES" :key="`hrace-${r}`" :value="r">{{ r }}</option>
                  </select>
                </div>
                <div v-if="selectedHeroErrors.length > 0" class="builder-errors">
                  <div v-for="(err, idx) in selectedHeroErrors" :key="`hero-err-${idx}`">{{ err }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div class="admin-card">
        <h3>{{ t("admin.metrics") }}</h3>
        <div class="stats" v-if="adminMetrics">
          <span>{{ t("admin.total") }}: {{ adminMetrics.totalMatches }}</span>
          <span>{{ t("admin.active") }}: {{ adminMetrics.activeMatches }}</span>
          <span>{{ t("admin.finished") }}: {{ adminMetrics.finishedMatches }}</span>
          <span>{{ t("admin.humans") }}: {{ adminMetrics.connectedHumans }}</span>
          <span>{{ t("admin.bots") }}: {{ adminMetrics.bots }}</span>
          <span>{{ t("admin.avgFill") }}: {{ adminMetrics.averageFillMs }}ms</span>
        </div>
        <div v-if="adminMetrics" class="log">
          <div><strong>{{ t("admin.topUnitBuys") }}</strong></div>
          <div v-for="([unitId, count], idx) in topUnitBuys" :key="`ub-${unitId}-${idx}`">
            {{ adminMetrics.unitBuyLabels?.[unitId] ?? unitId }} ({{ unitId }}): {{ count }}
          </div>
          <div v-if="topUnitBuys.length === 0">{{ t("admin.noUnitTelemetry") }}</div>
          <div style="margin-top: 8px;"><strong>{{ t("admin.topSynergyTriggers") }}</strong></div>
          <div v-for="([key, count], idx) in topSynergyTriggers" :key="`st-${key}-${idx}`">
            {{ formatSynergyLabel(key) }} ({{ key }}): {{ count }}
          </div>
          <div v-if="topSynergyTriggers.length === 0">{{ t("admin.noSynergyTelemetry") }}</div>
          <div style="margin-top: 8px;"><strong>{{ t("admin.startReasons") }}</strong></div>
          <div v-for="([reason, count], idx) in topStartReasons" :key="`sr-${reason}-${idx}`">
            {{ formatStartReasonLabel(reason) }} ({{ reason }}): {{ count }}
          </div>
          <div v-if="topStartReasons.length === 0">{{ t("admin.noStartReasonTelemetry") }}</div>
        </div>
      </div>

      <div v-if="rosterAnalysis" class="admin-card roster-analysis-card">
        <h3>{{ t("admin.roster.title") }}</h3>
        <p class="slot-title">{{ t("admin.roster.subtitle") }}</p>
        <details class="roster-analysis-help">
          <summary>{{ t("admin.roster.helpTitle") }}</summary>
          <p class="slot-title roster-analysis-help-body">{{ t("admin.roster.helpBody") }}</p>
        </details>
        <p class="slot-title">
          {{ t("admin.roster.totals", { units: rosterAnalysis.unitCount, heroes: rosterAnalysis.heroCount }) }}
        </p>
        <div v-if="rosterAnalysis.warningKeys.length > 0" class="roster-analysis-warnings">
          <strong>{{ t("admin.roster.warningsTitle") }}</strong>
          <ul>
            <li v-for="(w, idx) in rosterAnalysis.warningKeys" :key="`rw-${idx}`">{{ formatRosterWarning(w) }}</li>
          </ul>
        </div>
        <div class="roster-analysis-grid">
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByTier") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.tier") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedTierEntries(rosterAnalysis.byTier)" :key="`tier-${row.tier}`">
                  <td>T{{ row.tier }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByRole") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.role") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byRole)" :key="`role-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="roster-analysis-block roster-analysis-block--wide">
            <h4>{{ t("admin.roster.section.roleByTier") }}</h4>
            <p class="slot-title">{{ t("admin.roster.roleByTierHint") }}</p>
            <div class="roster-analysis-matrix-wrap">
              <table class="roster-analysis-table roster-analysis-matrix">
                <thead>
                  <tr>
                    <th>{{ t("admin.roster.col.role") }}</th>
                    <th v-for="ti in rosterTierColumnIndices" :key="`th-t${ti}`">T{{ ti }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="mrow in rosterRoleTierMatrix" :key="`m-${mrow.role}`">
                    <td>{{ mrow.role }}</td>
                    <td v-for="(c, idx) in mrow.cells" :key="`${mrow.role}-t${idx}`">{{ c }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByRace") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.race") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byRace)" :key="`urace-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="rosterAnalysis.unitsMissingRace > 0" class="slot-title">{{ t("admin.roster.unitsMissingRace", { n: rosterAnalysis.unitsMissingRace }) }}</p>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByCombatArchetype") }}</h4>
            <p class="slot-title">{{ t("admin.roster.combatHint") }}</p>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.style") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byCombatArchetype as Record<string, number>)" :key="`ca-${row.key}`">
                  <td>{{ combatArchetypeLabel(row.key) }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="rosterAnalysis.shopCombatArchetype" class="roster-analysis-shop-ca">
              <h5>{{ t("admin.roster.section.shopCombatArchetype") }}</h5>
              <p class="slot-title">{{ t("admin.roster.shopCombatHint") }}</p>
              <table class="roster-analysis-table">
                <thead>
                  <tr>
                    <th>{{ t("admin.roster.col.style") }}</th>
                    <th>{{ t("admin.roster.col.unitCount") }}</th>
                    <th>{{ t("admin.roster.col.weightSum") }}</th>
                    <th>{{ t("admin.roster.col.sharePct") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="caKey in ROSTER_SHOP_CA_KEYS" :key="`sca-${caKey}`">
                    <td>{{ combatArchetypeLabel(caKey) }}</td>
                    <td>{{ rosterAnalysis.shopCombatArchetype[caKey].unitCount }}</td>
                    <td>{{ rosterAnalysis.shopCombatArchetype[caKey].weightSum.toFixed(2) }}</td>
                    <td>{{ rosterAnalysis.shopCombatArchetype[caKey].sharePct }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByAbility") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.ability") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byAbility)" :key="`ab-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByTag") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.tag") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byTag)" :key="`tag-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="Object.keys(rosterAnalysis.byTag).length === 0" class="slot-title">{{ t("admin.roster.none") }}</p>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.unitsByMagicSpell") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.magicSpell") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.byMagicSpell)" :key="`ms-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="Object.keys(rosterAnalysis.byMagicSpell).length === 0" class="slot-title">{{ t("admin.roster.none") }}</p>
          </div>
          <div v-if="rosterAnalysis.shopWeight" class="roster-analysis-block roster-analysis-block--wide">
            <h4>{{ t("admin.roster.section.shopWeight") }}</h4>
            <p class="slot-title">{{ formatShopWeightStats(rosterAnalysis.shopWeight) }}</p>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.heroesByRace") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.race") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.heroesByRace)" :key="`hrace-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="rosterAnalysis.heroesMissingRace > 0" class="slot-title">{{ t("admin.roster.heroesMissingRace", { n: rosterAnalysis.heroesMissingRace }) }}</p>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.heroesByPowerKey") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.powerKey") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.heroesByPowerKey)" :key="`pk-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="roster-analysis-block">
            <h4>{{ t("admin.roster.section.heroesByPowerType") }}</h4>
            <table class="roster-analysis-table">
              <thead><tr><th>{{ t("admin.roster.col.powerType") }}</th><th>{{ t("admin.roster.col.count") }}</th></tr></thead>
              <tbody>
                <tr v-for="row in sortedEntries(rosterAnalysis.heroesByPowerType)" :key="`pt-${row.key}`">
                  <td>{{ row.key }}</td><td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <h3>{{ t("admin.portraits.title") }}</h3>
        <div class="portrait-preview-toolbar">
          <label class="admin-portrait-frame-picker">
            {{ t("admin.portraits.frameLabel") }}
            <select v-model="adminPortraitPreviewFrame">
              <option v-for="fid in PORTRAIT_FRAME_IDS" :key="fid" :value="fid">{{ t(`suggest.frame.${fid}`) }}</option>
            </select>
          </label>
          <p class="slot-title admin-portrait-frame-hint">{{ t("admin.portraits.frameHint") }}</p>
        </div>
        <div class="portrait-preview-block">
          <div class="slot-title">
            <strong>{{ t("admin.portraits.units") }}</strong> -
            {{ t("admin.builder.unitsCount", { count: portraitUnitPreview.length }) }}
          </div>
          <div class="portrait-preview-grid admin-portrait-shop-grid">
            <div v-for="entry in portraitUnitPreview" :key="`unit-portrait-${entry.id}`" class="admin-portrait-unit-cell">
              <div
                :class="`portrait-frame-variant portrait-frame-variant--${adminPortraitPreviewFrame} portrait-frame-preview-svg`"
              >
                <div class="shop-card admin-portrait-mini-shop" :class="adminPreviewTierClass(entry.tier)">
                  <div class="unit-card-chrome">
                    <div class="unit-card-chrome__content">
                      <div class="portrait-slot portrait-slot-unit admin-portrait-mini-slot portrait-slot--svg-frame">
                        <div class="portrait-frame-stack">
                          <img
                            v-if="entry.bgSrc"
                            class="portrait-image portrait-frame-stack__art"
                            :src="entry.bgSrc"
                            :alt="''"
                            loading="lazy"
                          />
                          <img class="portrait-image portrait-frame-stack__art" :src="entry.src" :alt="entry.name" loading="lazy" />
                        </div>
                      </div>
                      <div class="unit-name">
                        <span>{{ entry.name }}</span>
                      </div>
                      <div class="unit-meta">
                        <span class="meta-chip">T{{ entry.tier }}</span>
                        <span class="meta-chip">{{ entry.role }}</span>
                      </div>
                    </div>
                    <PortraitFrameSvg
                      :frame-id="adminPortraitPreviewFrame"
                      :tier-class="adminPreviewTierClass(entry.tier)"
                      scope="unitShopCard"
                    />
                  </div>
                </div>
              </div>
              <div class="portrait-preview-meta admin-portrait-unit-meta">
                <div class="slot-title">{{ entry.id }}</div>
                <span class="player-badge" :class="entry.exists ? 'badge-human' : 'badge-bot-hard'">
                  {{ entry.exists ? t("admin.portraits.loaded") : t("admin.portraits.missing") }}
                </span>
              </div>
            </div>
            <div v-if="portraitUnitPreview.length === 0" class="slot-title">{{ t("admin.portraits.none") }}</div>
          </div>
        </div>
        <div class="portrait-preview-block">
          <div class="slot-title">
            <strong>{{ t("admin.portraits.heroes") }}</strong> -
            {{ t("admin.builder.heroesCount", { count: portraitHeroPreview.length }) }}
          </div>
          <div class="portrait-preview-grid">
            <div v-for="entry in portraitHeroPreview" :key="`hero-portrait-${entry.id}`" class="portrait-preview-card">
              <div
                class="portrait-preview-image"
                :style="entry.bgSrc ? { backgroundImage: `url(${JSON.stringify(entry.bgSrc)})`, backgroundSize: 'cover', backgroundPosition: 'center center', backgroundRepeat: 'no-repeat' } : undefined"
              >
                <img class="portrait-image" :src="entry.src" :alt="entry.name" loading="lazy" />
              </div>
              <div class="portrait-preview-meta">
                <div>{{ entry.name }}</div>
                <div class="slot-title">{{ entry.id }}</div>
                <span class="player-badge" :class="entry.exists ? 'badge-human' : 'badge-bot-hard'">
                  {{ entry.exists ? t("admin.portraits.loaded") : t("admin.portraits.missing") }}
                </span>
              </div>
            </div>
            <div v-if="portraitHeroPreview.length === 0" class="slot-title">{{ t("admin.portraits.none") }}</div>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <h3>{{ t("admin.preview.title") }}</h3>
        <p class="slot-title">{{ t("admin.preview.hint") }}</p>
        <div class="join-card">
          <select v-model="adminPreviewPhase">
            <option v-for="phase in ADMIN_PREVIEW_PHASES" :key="`preview-phase-${phase}`" :value="phase">
              {{ formatPhaseLabel(phase) }}
            </option>
          </select>
          <button @click="prevAdminPreviewPhase">{{ t("admin.preview.prev") }}</button>
          <button @click="nextAdminPreviewPhase">{{ t("admin.preview.next") }}</button>
          <button @click="openAdminMockPreview">{{ t("admin.preview.open") }}</button>
          <button @click="reloadAdminMockPreview">{{ t("admin.preview.reload") }}</button>
          <label class="admin-preview-embed-toggle">
            <input v-model="adminPreviewEmbed" type="checkbox" />
            {{ t("admin.preview.embed") }}
          </label>
          <label class="admin-preview-embed-toggle">
            <input v-model="adminPreviewAutoCycle" type="checkbox" />
            {{ t("admin.preview.autoCycle") }}
          </label>
          <label class="admin-preview-cycle-label">
            {{ t("admin.preview.cycleMs") }}
            <input v-model.number="adminPreviewCycleMs" type="number" min="1200" step="200" />
          </label>
        </div>
        <div class="log">
          <div class="slot-title">{{ t("admin.preview.url") }}</div>
          <code>{{ adminMockPreviewUrl }}</code>
        </div>
        <div v-if="adminPreviewEmbed" class="admin-preview-frame-wrap">
          <iframe
            :key="`mock-preview-${adminPreviewReloadToken}-${adminPreviewPhase}`"
            class="admin-preview-frame"
            :src="adminMockPreviewUrl"
            :title="t('admin.preview.title')"
          />
        </div>
      </div>

      <div class="admin-card">
        <h3>{{ t("admin.ratings.title") }}</h3>
        <div class="actions">
          <button @click="refreshRatingLeaderboard">{{ t("admin.ratings.refreshLeaderboard") }}</button>
        </div>
        <div class="join-card" style="margin-top: 8px;">
          <input v-model="ratingLookupPlayerId" :placeholder="t('admin.ratings.playerIdPlaceholder')" />
          <button @click="lookupRatingPlayer">{{ t("admin.ratings.lookupPlayer") }}</button>
        </div>
        <p v-if="ratingLookupStatus" class="slot-title">{{ ratingLookupStatus }}</p>
        <div class="log">
          <div><strong>{{ t("admin.ratings.leaderboard") }}</strong></div>
          <div v-for="(entry, idx) in adminRatingLeaderboard" :key="`rating-row-${entry.playerId}-${idx}`">
            #{{ idx + 1 }} {{ entry.playerId }} | RP {{ entry.rankPoints }} | MMR {{ entry.mmrHidden }} | {{ entry.rankTier }} | {{ t("admin.ratings.provisionalGames") }} {{ entry.provisionalGames }}
          </div>
          <div v-if="adminRatingLeaderboard.length === 0">{{ t("admin.ratings.emptyLeaderboard") }}</div>
        </div>
        <div class="log" v-if="adminRatingPlayer">
          <div><strong>{{ t("admin.ratings.playerDetails") }}</strong></div>
          <div>{{ adminRatingPlayer.playerId }}</div>
          <div>RP {{ adminRatingPlayer.rankPoints }} | MMR {{ adminRatingPlayer.mmrHidden }}</div>
          <div>{{ t("admin.ratings.rankTier") }} {{ adminRatingPlayer.rankTier }}</div>
          <div>{{ t("admin.ratings.provisionalGames") }} {{ adminRatingPlayer.provisionalGames }}</div>
          <div>{{ t("admin.ratings.updatedAt") }} {{ new Date(adminRatingPlayer.updatedAt).toLocaleString() }}</div>
        </div>
      </div>

      <div class="admin-card">
        <h3>{{ t("admin.filters") }}</h3>
        <div class="join-card">
          <select v-model="adminFilters.phase">
            <option value="">{{ t("admin.anyPhase") }}</option>
            <option value="LOBBY">{{ formatPhaseLabel("LOBBY") }}</option>
            <option value="HERO_SELECTION">{{ formatPhaseLabel("HERO_SELECTION") }}</option>
            <option value="TAVERN">{{ formatPhaseLabel("TAVERN") }}</option>
            <option value="POSITIONING">{{ formatPhaseLabel("POSITIONING") }}</option>
            <option value="COMBAT">{{ formatPhaseLabel("COMBAT") }}</option>
            <option value="ROUND_END">{{ formatPhaseLabel("ROUND_END") }}</option>
            <option value="FINISHED">{{ formatPhaseLabel("FINISHED") }}</option>
          </select>
          <input v-model="adminFilters.region" :placeholder="t('admin.region')" />
          <select v-model="adminFilters.visibility">
            <option value="all">{{ t("admin.all") }}</option>
            <option value="public">{{ t("admin.public") }}</option>
            <option value="private">{{ t("admin.private") }}</option>
          </select>
          <button @click="loadAdminLobbies">{{ t("admin.apply") }}</button>
        </div>
        <div class="log">
          <div v-for="lobby in adminLobbies" :key="`admin-${lobby.matchId}`" class="admin-row">
            <span>{{ lobby.matchId }} | {{ formatPhaseLabel(lobby.phase) }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }}</span>
            <span>{{ lobby.region }} {{ lobby.mmrBucket }}</span>
            <button @click="inspectAdminLobby(lobby.matchId)">{{ t("admin.inspect") }}</button>
            <button @click="startAdminStream(lobby.matchId)">{{ t("admin.stream") }}</button>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <h3>{{ t("admin.selectedLobby") }}</h3>
        <div v-if="adminLobbyDetail">
          <p>
            {{ adminLobbyDetail.matchId }} | {{ formatPhaseLabel(adminLobbyDetail.phase) }} | {{ t("admin.round") }} {{ adminLobbyDetail.round }}
            <span v-if="adminLobbyDetail.inviteCode"> | {{ t("admin.code") }} {{ adminLobbyDetail.inviteCode }}</span>
          </p>
          <div class="actions" style="margin-bottom: 8px;">
            <button @click="loadAdminUnitPool(adminLobbyDetail.matchId)">{{ t("admin.pool.refresh") }}</button>
          </div>
          <div class="log" v-if="adminUnitPool">
            <div><strong>{{ t("admin.pool.title") }}</strong> ({{ adminUnitPool.matchId }} | {{ formatPhaseLabel(adminUnitPool.phase) }} | {{ t("admin.round") }} {{ adminUnitPool.round }})</div>
            <div v-for="u in adminUnitPool.units.slice(0, 12)" :key="`pool-${u.unitId}`">
              T{{ u.tier }} {{ u.unitName }} ({{ u.unitId }}) -
              {{ t("admin.pool.available") }} {{ u.availableCopies }}/{{ u.initialCopies }} ({{ formatPoolPct(u.availablePct) }}) -
              {{ t("admin.pool.shop") }} {{ u.inShop }} -
              {{ t("admin.pool.board") }} {{ u.onBoard }} -
              {{ t("admin.pool.bench") }} {{ u.onBench }} -
              {{ t("admin.pool.consumed") }} {{ u.consumedCopies }}
            </div>
          </div>
          <div v-else class="slot-title">{{ t("admin.pool.empty") }}</div>
          <div class="log">
            <div v-for="p in adminLobbyDetail.players" :key="`detail-${p.playerId}`">
              {{ p.name }} | HP {{ p.health }} | {{ p.connected ? t("admin.online") : t("admin.offline") }} | {{ p.isBot ? t("admin.bot") : t("admin.human") }}
            </div>
          </div>
          <h3>{{ t("admin.recentEvents") }}</h3>
          <div class="log">
            <div v-for="e in adminLobbyDetail.recentEvents" :key="`evt-${e.sequence}`">
              {{ formatTime(e.at) }} | #{{ e.sequence }} | {{ e.type }} | {{ e.message }}
            </div>
          </div>
        </div>
        <div v-else>{{ t("admin.noLobbySelected") }}</div>

        <h3>{{ t("admin.liveFeed") }}</h3>
        <div class="log">
          <div v-for="(line, idx) in adminEventFeed" :key="`feed-${idx}`">
            {{ line }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
