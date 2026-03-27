<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import type {
  AbilityKey,
  HeroDefinition,
  HeroPowerKey,
  HeroPowerType,
  UnitDefinition,
  UnitRace,
  UnitRole
} from "@runebrawl/shared";
import { UNIT_RACES } from "@runebrawl/shared";
import roleTankIcon from "../../assets/optimized/icons/role-tank.svg";
import roleMeleeIcon from "../../assets/optimized/icons/role-melee.svg";
import roleRangedIcon from "../../assets/optimized/icons/role-ranged.svg";
import roleSupportIcon from "../../assets/optimized/icons/role-support.svg";
import abilityTauntIcon from "../../assets/optimized/icons/ability-taunt.svg";
import abilityDeathBurstIcon from "../../assets/optimized/icons/ability-death-burst.svg";
import abilityBloodlustIcon from "../../assets/optimized/icons/ability-bloodlust.svg";
import abilityLifestealIcon from "../../assets/optimized/icons/ability-lifesteal.svg";
import abilityNoneIcon from "../../assets/optimized/icons/ability-none.svg";
import PortraitFrameSvg from "../shared/PortraitFrameSvg.vue";
import UnitCardFrameCorners from "../game/cards/UnitCardFrameCorners.vue";
import { useI18n } from "../../i18n/useI18n";

const ABILITY_ICON_PATHS: Record<AbilityKey, string> = {
  NONE: abilityNoneIcon,
  TAUNT: abilityTauntIcon,
  DEATH_BURST: abilityDeathBurstIcon,
  BLOODLUST: abilityBloodlustIcon,
  LIFESTEAL: abilityLifestealIcon
};

function roleIconPath(role: UnitRole): string {
  switch (role) {
    case "Tank":
      return roleTankIcon;
    case "Melee":
      return roleMeleeIcon;
    case "Ranged":
      return roleRangedIcon;
    case "Support":
      return roleSupportIcon;
    default:
      return roleSupportIcon;
  }
}

function abilityIconPath(ability: AbilityKey): string {
  return ABILITY_ICON_PATHS[ability];
}

const { t } = useI18n();

const DRAFT_KEY = "runebrawl.suggest.draft";
const DRAFT_VERSION = 1;

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || `http://${location.hostname}:3001`;

const UNIT_ROLES: UnitRole[] = ["Tank", "Melee", "Ranged", "Support"];
const ABILITIES: AbilityKey[] = ["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"];
const CAST_ABILITIES: AbilityKey[] = ["NONE", "DEATH_BURST", "TAUNT", "BLOODLUST", "LIFESTEAL"];
const HERO_POWER_TYPES: HeroPowerType[] = ["PASSIVE", "ACTIVE"];
const HERO_POWER_KEYS: HeroPowerKey[] = ["BONUS_GOLD", "WAR_DRUM", "RECRUITER", "FORTIFY"];

type Scope = "units_only" | "heroes_only" | "race_idea" | "mechanics_idea";
type StepKey = "intro" | "meta" | "units" | "heroes" | "review";

interface UnitFormRow {
  id: string;
  name: string;
  role: UnitRole;
  tier: number;
  attack: number;
  hp: number;
  ability: AbilityKey;
  shopWeight: number;
  race: "" | UnitRace;
  tagBerserker: boolean;
  castOnDeath: AbilityKey | "";
  castOnKill: AbilityKey | "";
  castOnCrit: AbilityKey | "";
  castOnFirstStrike: AbilityKey | "";
  castOnBattlefieldAdded: AbilityKey | "";
  castOnRecruitmentRefresh: AbilityKey | "";
  /** Local file for preview + upload after submit (not in JSON draft). */
  portraitFile: File | null;
  portraitPreviewUrl: string | null;
  /** Preview-only framing (%), matches object-position; in-game stays center-top until persisted. */
  portraitFocusX: number;
  portraitFocusY: number;
}

interface HeroFormRow {
  id: string;
  name: string;
  description: string;
  powerType: HeroPowerType;
  powerKey: HeroPowerKey;
  powerCost: number;
  offerWeight: number;
}

const scope = ref<Scope>("units_only");
const stepIndex = ref(0);
const phase = ref<"wizard" | "success">("wizard");

const metadata = reactive({
  packId: "",
  title: "",
  author: "",
  version: "1.0.0",
  description: "",
  targetGameVersion: "",
  tagsInput: "community",
  notes: ""
});

const units = ref<UnitFormRow[]>([emptyUnitRow()]);
const heroes = ref<HeroFormRow[]>([emptyHeroRow()]);

const submitting = ref(false);
const submitError = ref("");
const submittedId = ref<string | null>(null);
const lastValidationErrors = ref<string[]>([]);
const portraitStatus = ref<Record<string, "idle" | "uploading" | "done" | "error">>({});

const submittedUnitIds = ref<string[]>([]);

/** Server/db unique `pack_id`; always generated in the client — never user-edited. */
const submissionPackId = ref<string | null>(null);

function generateSubmissionPackId(): string {
  const part = Math.random().toString(36).slice(2, 10);
  return `suggestion_${Date.now()}_${part}`;
}

function emptyUnitRow(): UnitFormRow {
  return {
    id: "",
    name: "",
    role: "Melee",
    tier: 1,
    attack: 2,
    hp: 5,
    ability: "NONE",
    shopWeight: 1,
    race: "",
    tagBerserker: false,
    castOnDeath: "",
    castOnKill: "",
    castOnCrit: "",
    castOnFirstStrike: "",
    castOnBattlefieldAdded: "",
    castOnRecruitmentRefresh: "",
    portraitFile: null,
    portraitPreviewUrl: null,
    portraitFocusX: 50,
    portraitFocusY: 0
  };
}

function emptyHeroRow(): HeroFormRow {
  return {
    id: "",
    name: "",
    description: "",
    powerType: "PASSIVE",
    powerKey: "BONUS_GOLD",
    powerCost: 0,
    offerWeight: 1
  };
}

const isSemanticScope = computed(
  () => scope.value === "race_idea" || scope.value === "mechanics_idea"
);

const stepSequence = computed((): StepKey[] => {
  const seq: StepKey[] = ["intro", "meta"];
  if (isSemanticScope.value) {
    seq.push("review");
    return seq;
  }
  if (scope.value !== "heroes_only") seq.push("units");
  if (scope.value !== "units_only") seq.push("heroes");
  seq.push("review");
  return seq;
});

const currentStep = computed(() => stepSequence.value[stepIndex.value] ?? "intro");

watch(scope, () => {
  const max = stepSequence.value.length - 1;
  if (stepIndex.value > max) stepIndex.value = max;
});

watch(
  [scope, stepIndex, metadata, units, heroes, submissionPackId],
  () => {
    scheduleDraftSave();
  },
  { deep: true }
);

watch(
  heroes,
  (rows) => {
    for (const row of rows) {
      if (row.powerType === "PASSIVE" && row.powerCost !== 0) row.powerCost = 0;
    }
  },
  { deep: true }
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDraftSave(): void {
  if (phase.value !== "wizard") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const draft = {
        v: DRAFT_VERSION,
        scope: scope.value,
        stepIndex: stepIndex.value,
        submissionPackId: submissionPackId.value ?? undefined,
        metadata: { ...metadata },
        units: units.value.map((u) => {
          const { portraitFile: _f, portraitPreviewUrl: _p, ...rest } = u;
          return rest;
        }),
        heroes: heroes.value
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, 400);
}

function loadDraft(): void {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw) as {
      v?: number;
      scope?: Scope;
      stepIndex?: number;
      submissionPackId?: string;
      semanticPackId?: string;
      metadata?: typeof metadata;
      units?: UnitFormRow[];
      heroes?: HeroFormRow[];
    };
    if (d.v !== DRAFT_VERSION) return;
    if (
      d.scope === "units_only" ||
      d.scope === "heroes_only" ||
      d.scope === "race_idea" ||
      d.scope === "mechanics_idea"
    ) {
      scope.value = d.scope;
    }
    if ((d.scope as string | undefined) === "both") scope.value = "units_only";
    if (typeof d.stepIndex === "number" && d.stepIndex >= 0) stepIndex.value = d.stepIndex;
    if (d.metadata) Object.assign(metadata, d.metadata);
    const savedPid = d.submissionPackId ?? d.semanticPackId;
    if (typeof savedPid === "string" && savedPid.trim()) {
      submissionPackId.value = savedPid.trim();
    }
    if (Array.isArray(d.units) && d.units.length > 0) {
      units.value = d.units.map((raw) => {
        const u = raw as Partial<UnitFormRow>;
        return {
          ...emptyUnitRow(),
          ...u,
          portraitFile: null,
          portraitPreviewUrl: null,
          portraitFocusX: typeof u.portraitFocusX === "number" ? u.portraitFocusX : 50,
          portraitFocusY: typeof u.portraitFocusY === "number" ? u.portraitFocusY : 0
        };
      });
    }
    if (Array.isArray(d.heroes) && d.heroes.length > 0) heroes.value = d.heroes;
  } catch {
    /* ignore */
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadDraft();
});

function goNext(): void {
  if (stepIndex.value < stepSequence.value.length - 1) stepIndex.value += 1;
}

function goBack(): void {
  if (stepIndex.value > 0) stepIndex.value -= 1;
}

function addUnit(): void {
  units.value.push(emptyUnitRow());
}

function removeUnit(i: number): void {
  if (units.value.length <= 1) return;
  const row = units.value[i];
  if (row?.portraitPreviewUrl) URL.revokeObjectURL(row.portraitPreviewUrl);
  units.value.splice(i, 1);
}

function setUnitPortraitFile(index: number, file: File | null): void {
  const row = units.value[index];
  if (!row) return;
  if (row.portraitPreviewUrl) {
    URL.revokeObjectURL(row.portraitPreviewUrl);
    row.portraitPreviewUrl = null;
  }
  row.portraitFile = file;
  row.portraitPreviewUrl = file ? URL.createObjectURL(file) : null;
}

function onUnitPortraitChange(index: number, ev: Event): void {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  if (file && !file.type.startsWith("image/")) {
    input.value = "";
    return;
  }
  setUnitPortraitFile(index, file);
  const row = units.value[index];
  if (row && file) {
    row.portraitFocusX = 50;
    row.portraitFocusY = 0;
  }
  input.value = "";
}

function portraitFocusStyle(row: UnitFormRow): Record<string, string> {
  return { objectPosition: `${row.portraitFocusX}% ${row.portraitFocusY}%` };
}

type TierPreviewClass = "tier-low" | "tier-mid" | "tier-high";

function previewTierClass(tier: number): TierPreviewClass {
  const n = Math.round(Number(tier)) || 1;
  if (n <= 2) return "tier-low";
  if (n <= 4) return "tier-mid";
  return "tier-high";
}

function resetPortraitFocus(index: number): void {
  const row = units.value[index];
  if (!row) return;
  row.portraitFocusX = 50;
  row.portraitFocusY = 0;
}

function clearUnitPortrait(index: number): void {
  setUnitPortraitFile(index, null);
}

function revokeAllUnitPortraitUrls(): void {
  for (const row of units.value) {
    if (row.portraitPreviewUrl) URL.revokeObjectURL(row.portraitPreviewUrl);
    row.portraitPreviewUrl = null;
    row.portraitFile = null;
  }
}

onBeforeUnmount(() => {
  revokeAllUnitPortraitUrls();
});

function addHero(): void {
  heroes.value.push(emptyHeroRow());
}

function removeHero(i: number): void {
  if (heroes.value.length <= 1) return;
  heroes.value.splice(i, 1);
}

function parseTags(): string[] {
  const raw = metadata.tagsInput
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (raw.length === 0) return ["community"];
  return raw;
}

function mergeProposalTags(tags: string[]): string[] {
  const set = new Set(tags);
  if (scope.value === "race_idea") set.add("proposal_race");
  if (scope.value === "mechanics_idea") set.add("proposal_mechanics");
  return [...set];
}

function unitRowToDef(row: UnitFormRow): UnitDefinition | null {
  const id = row.id.trim();
  const name = row.name.trim();
  if (!id || !name) return null;
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) return null;
  const tier = Math.round(Number(row.tier));
  const attack = Math.round(Number(row.attack));
  const hp = Math.round(Number(row.hp));
  if (!Number.isFinite(tier) || tier < 1 || tier > 6) return null;
  if (!Number.isFinite(attack) || attack < 0) return null;
  if (!Number.isFinite(hp) || hp < 1) return null;

  const out: UnitDefinition = {
    id,
    name,
    role: row.role,
    tier,
    attack,
    hp,
    ability: row.ability
  };
  const sw = Number(row.shopWeight);
  if (Number.isFinite(sw) && sw > 0) out.shopWeight = sw;
  if (row.race) out.race = row.race;
  if (row.tagBerserker) out.tags = ["BERSERKER"];
  if (row.castOnDeath) out.castOnDeath = row.castOnDeath;
  if (row.castOnKill) out.castOnKill = row.castOnKill;
  if (row.castOnCrit) out.castOnCrit = row.castOnCrit;
  if (row.castOnFirstStrike) out.castOnFirstStrike = row.castOnFirstStrike;
  if (row.castOnBattlefieldAdded) out.castOnBattlefieldAdded = row.castOnBattlefieldAdded;
  if (row.castOnRecruitmentRefresh) out.castOnRecruitmentRefresh = row.castOnRecruitmentRefresh;
  return out;
}

function heroRowToDef(row: HeroFormRow): HeroDefinition | null {
  const id = row.id.trim();
  const name = row.name.trim();
  const description = row.description.trim();
  if (!id || !name || !description) return null;
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id)) return null;
  const powerCost = Math.round(Number(row.powerCost));
  const ow = Number(row.offerWeight);
  if (!Number.isFinite(powerCost) || powerCost < 0) return null;
  if (row.powerType === "PASSIVE" && powerCost !== 0) return null;
  const out: HeroDefinition = {
    id,
    name,
    description,
    powerType: row.powerType,
    powerKey: row.powerKey,
    powerCost
  };
  if (Number.isFinite(ow) && ow > 0) out.offerWeight = ow;
  return out;
}

function ensureSubmissionPackId(): string {
  if (!submissionPackId.value) submissionPackId.value = generateSubmissionPackId();
  return submissionPackId.value;
}

function buildPayload(): { metadata: Record<string, unknown>; units: UnitDefinition[]; heroes: HeroDefinition[] } | null {
  const tags = mergeProposalTags(parseTags());
  if (tags.length === 0) return null;
  if (!metadata.title.trim() || !metadata.author.trim() || !metadata.description.trim()) return null;

  const packIdForPayload = ensureSubmissionPackId();
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(packIdForPayload)) return null;

  const version = "1.0.0";
  const targetGameVersion = "any";

  const meta = {
    packId: packIdForPayload,
    title: metadata.title.trim(),
    author: metadata.author.trim(),
    version,
    description: metadata.description.trim(),
    targetGameVersion,
    tags,
    ...(metadata.notes.trim() ? { notes: metadata.notes.trim() } : {})
  };
  const u = units.value.map(unitRowToDef).filter((x): x is UnitDefinition => x !== null);
  const h = heroes.value.map(heroRowToDef).filter((x): x is HeroDefinition => x !== null);
  return { metadata: meta, units: u, heroes: h };
}

const reviewPreview = computed(() => {
  const p = buildPayload();
  if (!p) return "";
  return JSON.stringify({ metadata: p.metadata, units: p.units, heroes: p.heroes }, null, 2);
});

async function uploadPortraitBlob(submissionId: string, unitId: string, file: File): Promise<boolean> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${apiBaseUrl}/public/submissions/${encodeURIComponent(submissionId)}/portraits/${encodeURIComponent(unitId)}`,
    { method: "POST", credentials: "include", body: fd }
  );
  return res.ok;
}

async function uploadPendingPortraitsAfterSubmit(submissionId: string): Promise<void> {
  for (const row of units.value) {
    const uid = row.id.trim();
    if (!uid || !row.portraitFile) continue;
    portraitStatus.value[uid] = "uploading";
    try {
      const ok = await uploadPortraitBlob(submissionId, uid, row.portraitFile);
      portraitStatus.value[uid] = ok ? "done" : "error";
    } catch {
      portraitStatus.value[uid] = "error";
    }
  }
}

async function submitPack(): Promise<void> {
  submitError.value = "";
  lastValidationErrors.value = [];
  const payload = buildPayload();
  if (!payload) {
    submitError.value = t("suggest.errorForm");
    return;
  }
  if (!isSemanticScope.value) {
    if (scope.value !== "heroes_only" && payload.units.length === 0) {
      submitError.value = t("suggest.errorNeedUnit");
      return;
    }
    if (scope.value !== "units_only" && payload.heroes.length === 0) {
      submitError.value = t("suggest.errorNeedHero");
      return;
    }
  }
  submitting.value = true;
  try {
    const res = await fetch(`${apiBaseUrl}/public/submissions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: payload.metadata,
        units: payload.units,
        heroes: payload.heroes
      })
    });
    const data = (await res.json()) as {
      ok?: boolean;
      id?: string;
      validation?: { ok?: boolean; errors?: string[] };
      error?: string;
      errorCode?: string;
    };
    if (!res.ok) {
      if (data.errorCode === "PUBLIC_SUBMISSIONS_DISABLED") submitError.value = t("review.disabled");
      else if (data.errorCode === "PUBLIC_DUPLICATE_PACK_ID") submitError.value = t("suggest.errorDuplicatePack");
      else submitError.value = data.error ?? t("suggest.errorSubmit");
      return;
    }
    if (data.validation?.errors?.length) {
      lastValidationErrors.value = data.validation.errors;
    }
    if (data.id) {
      submittedId.value = data.id;
      submittedUnitIds.value = payload.units.map((u) => u.id);
      phase.value = "success";
      clearDraft();
      await uploadPendingPortraitsAfterSubmit(data.id);
      revokeAllUnitPortraitUrls();
    }
  } catch {
    submitError.value = t("review.errorNetwork");
  } finally {
    submitting.value = false;
  }
}

async function uploadPortrait(unitId: string, ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !submittedId.value) return;
  portraitStatus.value[unitId] = "uploading";
  try {
    const ok = await uploadPortraitBlob(submittedId.value, unitId, file);
    portraitStatus.value[unitId] = ok ? "done" : "error";
  } catch {
    portraitStatus.value[unitId] = "error";
  } finally {
    input.value = "";
  }
}

function reviewLink(): string {
  if (!submittedId.value) return "/review";
  return `/review?id=${encodeURIComponent(submittedId.value)}`;
}

function resetWizard(): void {
  revokeAllUnitPortraitUrls();
  phase.value = "wizard";
  submittedId.value = null;
  submittedUnitIds.value = [];
  portraitStatus.value = {};
  stepIndex.value = 0;
  scope.value = "units_only";
  submissionPackId.value = null;
  Object.assign(metadata, {
    packId: "",
    title: "",
    author: "",
    version: "1.0.0",
    description: "",
    targetGameVersion: "",
    tagsInput: "community",
    notes: ""
  });
  units.value = [emptyUnitRow()];
  heroes.value = [emptyHeroRow()];
}
</script>

<template>
  <div class="public-suggest app suggest-stage">
    <div class="suggest-stage__backdrop" aria-hidden="true" />
    <div class="suggest-stage__vignette" aria-hidden="true" />
    <div class="suggest-stage__inner">
    <template v-if="phase === 'success' && submittedId">
      <section class="suggest-hero">
        <h2>{{ t("suggest.successTitle") }}</h2>
        <p class="suggest-lead">{{ t("suggest.successLead") }}</p>
        <p class="muted">
          {{ t("suggest.submissionId") }} <code>{{ submittedId }}</code>
        </p>
        <p class="suggest-actions">
          <a class="suggest-link" :href="reviewLink()">{{ t("suggest.openReview") }}</a>
          <button type="button" class="suggest-secondary" @click="resetWizard">{{ t("suggest.newPack") }}</button>
        </p>
      </section>

      <section v-if="submittedUnitIds.length > 0" class="suggest-card">
        <h3>{{ t("suggest.portraitsTitle") }}</h3>
        <p class="muted small">{{ t("suggest.portraitsHint") }}</p>
        <ul class="suggest-portrait-list">
          <li v-for="uid in submittedUnitIds" :key="uid">
            <span class="suggest-uid">{{ uid }}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadPortrait(uid, $event)" />
            <span v-if="portraitStatus[uid] === 'uploading'" class="muted">{{ t("suggest.uploading") }}</span>
            <span v-else-if="portraitStatus[uid] === 'done'" class="suggest-ok">{{ t("suggest.uploadDone") }}</span>
            <span v-else-if="portraitStatus[uid] === 'error'" class="suggest-err">{{ t("suggest.uploadFail") }}</span>
            <span v-else class="muted">{{ t("suggest.portraitRetryHint") }}</span>
          </li>
        </ul>
      </section>
    </template>

    <template v-else>
      <section class="suggest-hero">
        <h2>{{ t("suggest.pageTitle") }}</h2>
        <p class="suggest-disclaimer">{{ t("suggest.disclaimer") }}</p>
      </section>

      <!-- Intro -->
      <section v-show="currentStep === 'intro'" class="suggest-card">
        <h3>{{ t("suggest.stepIntro") }}</h3>
        <fieldset class="suggest-scope">
          <label><input v-model="scope" type="radio" value="units_only" /> {{ t("suggest.scopeUnits") }}</label>
          <label><input v-model="scope" type="radio" value="heroes_only" /> {{ t("suggest.scopeHeroes") }}</label>
          <label><input v-model="scope" type="radio" value="race_idea" /> {{ t("suggest.scopeRace") }}</label>
          <label><input v-model="scope" type="radio" value="mechanics_idea" /> {{ t("suggest.scopeMechanics") }}</label>
        </fieldset>
      </section>

      <!-- Metadata: only human-facing fields; pack_id / version / target / tags are set when submitting. -->
      <section v-show="currentStep === 'meta'" class="suggest-card">
        <h3>{{ isSemanticScope ? t("suggest.stepMetaSemantic") : t("suggest.stepMeta") }}</h3>
        <p v-if="isSemanticScope" class="suggest-meta-lead">{{ t("suggest.semanticStepLead") }}</p>
        <div class="suggest-grid suggest-grid--semantic">
          <label class="span-2">{{ t("suggest.metaTitle") }} * <input v-model="metadata.title" type="text" /></label>
          <label class="span-2">{{ t("suggest.author") }} * <input v-model="metadata.author" type="text" /></label>
          <label class="span-2">
            {{ isSemanticScope ? t("suggest.descriptionSemantic") : t("suggest.description") }} *
            <textarea v-model="metadata.description" :rows="isSemanticScope ? 6 : 4" />
          </label>
          <label class="span-2">{{ t("suggest.notes") }} <textarea v-model="metadata.notes" rows="2" /></label>
        </div>
        <p v-if="isSemanticScope" class="muted small">{{ t("suggest.semanticMetaHint") }}</p>
      </section>

      <!-- Units -->
      <section v-show="currentStep === 'units'" class="suggest-card">
        <h3>{{ t("suggest.stepUnits") }}</h3>
        <p class="muted small suggest-unit-portrait-intro">{{ t("suggest.unitPortraitIntro") }}</p>
        <div v-for="(row, i) in units" :key="i" class="suggest-unit-block">
          <div class="suggest-unit-head">
            <span>{{ t("suggest.unitN", { n: i + 1 }) }}</span>
            <button type="button" class="suggest-remove" :disabled="units.length <= 1" @click="removeUnit(i)">
              {{ t("suggest.remove") }}
            </button>
          </div>
          <div class="suggest-unit-layout">
            <div class="suggest-unit-fields">
              <div class="suggest-grid">
                <label>{{ t("suggest.unitId") }} * <input v-model="row.id" type="text" /></label>
                <label>{{ t("suggest.unitName") }} * <input v-model="row.name" type="text" /></label>
                <label>{{ t("suggest.role") }} <select v-model="row.role"><option v-for="r in UNIT_ROLES" :key="r" :value="r">{{ r }}</option></select></label>
                <label>{{ t("suggest.tier") }} <input v-model.number="row.tier" type="number" min="1" max="6" /></label>
                <label>{{ t("suggest.attack") }} <input v-model.number="row.attack" type="number" min="0" /></label>
                <label>{{ t("suggest.hp") }} <input v-model.number="row.hp" type="number" min="1" /></label>
                <label>{{ t("suggest.ability") }} <select v-model="row.ability"><option v-for="a in ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                <label>{{ t("suggest.shopWeight") }} <input v-model.number="row.shopWeight" type="number" min="0" step="0.05" /></label>
                <label>{{ t("suggest.race") }} <select v-model="row.race"><option value="">{{ t("suggest.raceNone") }}</option><option v-for="r in UNIT_RACES" :key="r" :value="r">{{ r }}</option></select></label>
                <label class="suggest-check"><input v-model="row.tagBerserker" type="checkbox" /> {{ t("suggest.tagBerserker") }}</label>
              </div>

              <details class="suggest-triggers">
                <summary>{{ t("suggest.castTriggers") }}</summary>
                <div class="suggest-grid small-gap">
                  <label>castOnDeath <select v-model="row.castOnDeath"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                  <label>castOnKill <select v-model="row.castOnKill"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                  <label>castOnCrit <select v-model="row.castOnCrit"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                  <label>castOnFirstStrike <select v-model="row.castOnFirstStrike"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                  <label>castOnBattlefieldAdded <select v-model="row.castOnBattlefieldAdded"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                  <label>castOnRecruitmentRefresh <select v-model="row.castOnRecruitmentRefresh"><option value="">{{ t("suggest.omit") }}</option><option v-for="a in CAST_ABILITIES" :key="a" :value="a">{{ a }}</option></select></label>
                </div>
              </details>
            </div>

            <aside class="suggest-unit-preview-column" :title="t('suggest.portraitPreviewTitle')">
              <div class="suggest-portrait-shop-preview portrait-frame-live-svg">
                <div class="shop-card suggest-preview-shop-card" :class="previewTierClass(row.tier)">
                  <div class="unit-card-chrome">
                    <div class="unit-card-chrome__content">
                      <div class="portrait-slot portrait-slot-unit suggest-preview-portrait-slot portrait-slot--svg-frame">
                        <div class="portrait-frame-stack">
                          <img
                            v-if="row.portraitPreviewUrl"
                            :src="row.portraitPreviewUrl"
                            class="portrait-image portrait-frame-stack__art"
                            :style="portraitFocusStyle(row)"
                            alt=""
                          />
                          <div v-else class="suggest-preview-empty-ph portrait-frame-stack__art">
                            {{ t("suggest.portraitPlaceholder") }}
                          </div>
                        </div>
                      </div>
                      <div class="unit-name">
                        <img class="unit-icon" :src="roleIconPath(row.role)" alt="" />
                        <span>{{ row.name.trim() || "—" }}</span>
                      </div>
                      <div class="unit-meta">
                        <span class="meta-chip">
                          <img class="chip-icon" :src="roleIconPath(row.role)" alt="" />
                          {{ row.role }}
                        </span>
                        <span v-if="row.tagBerserker" class="meta-chip tag-chip">BERSERKER</span>
                      </div>
                    </div>
                    <UnitCardFrameCorners
                      :tier="Math.round(Number(row.tier)) || 1"
                      :evolution-level="1"
                      :atk="Math.round(Number(row.attack)) || 0"
                      :hp="Math.round(Number(row.hp)) || 1"
                      :ability-icon-url="abilityIconPath(row.ability)"
                      :ability-title="`${t(`ability.${row.ability}.label`)}: ${t(`ability.${row.ability}.desc`)}`"
                    />
                    <PortraitFrameSvg
                      frame-id="ornate"
                      :tier-class="previewTierClass(row.tier)"
                      scope="unitShopCard"
                      :hide-ornate-corner-studs="true"
                    />
                  </div>
                </div>
              </div>
              <div class="suggest-unit-portrait-actions">
                <label class="suggest-file-label">
                  <input type="file" accept="image/jpeg,image/png,image/webp" @change="onUnitPortraitChange(i, $event)" />
                  <span>{{ t("suggest.choosePortrait") }}</span>
                </label>
                <button
                  v-if="row.portraitPreviewUrl"
                  type="button"
                  class="suggest-portrait-clear"
                  @click="clearUnitPortrait(i)"
                >
                  {{ t("suggest.portraitClear") }}
                </button>
                <template v-if="row.portraitPreviewUrl">
                  <div class="suggest-portrait-focus">
                    <label class="suggest-range-label">
                      {{ t("suggest.portraitFocusH") }}
                      <input v-model.number="row.portraitFocusX" type="range" min="0" max="100" step="1" />
                    </label>
                    <label class="suggest-range-label">
                      {{ t("suggest.portraitFocusV") }}
                      <input v-model.number="row.portraitFocusY" type="range" min="0" max="100" step="1" />
                    </label>
                    <button type="button" class="suggest-portrait-reset-focus" @click="resetPortraitFocus(i)">
                      {{ t("suggest.portraitFocusReset") }}
                    </button>
                  </div>
                  <p class="muted suggest-portrait-focus-hint">{{ t("suggest.portraitFocusHint") }}</p>
                </template>
              </div>
            </aside>
          </div>
        </div>
        <button type="button" class="suggest-add" @click="addUnit">{{ t("suggest.addUnit") }}</button>
      </section>

      <!-- Heroes -->
      <section v-show="currentStep === 'heroes'" class="suggest-card">
        <h3>{{ t("suggest.stepHeroes") }}</h3>
        <div v-for="(row, i) in heroes" :key="i" class="suggest-unit-block">
          <div class="suggest-unit-head">
            <span>{{ t("suggest.heroN", { n: i + 1 }) }}</span>
            <button type="button" class="suggest-remove" :disabled="heroes.length <= 1" @click="removeHero(i)">
              {{ t("suggest.remove") }}
            </button>
          </div>
          <div class="suggest-grid">
            <label>{{ t("suggest.heroId") }} * <input v-model="row.id" type="text" /></label>
            <label>{{ t("suggest.heroName") }} * <input v-model="row.name" type="text" /></label>
            <label class="span-2">{{ t("suggest.heroDesc") }} * <textarea v-model="row.description" rows="2" /></label>
            <label>{{ t("suggest.powerType") }} <select v-model="row.powerType"><option v-for="p in HERO_POWER_TYPES" :key="p" :value="p">{{ p }}</option></select></label>
            <label>{{ t("suggest.powerKey") }} <select v-model="row.powerKey"><option v-for="p in HERO_POWER_KEYS" :key="p" :value="p">{{ p }}</option></select></label>
            <label>{{ t("suggest.powerCost") }} <input v-model.number="row.powerCost" type="number" min="0" /></label>
            <label>{{ t("suggest.offerWeight") }} <input v-model.number="row.offerWeight" type="number" min="0" step="0.05" /></label>
          </div>
        </div>
        <button type="button" class="suggest-add" @click="addHero">{{ t("suggest.addHero") }}</button>
      </section>

      <!-- Review -->
      <section v-show="currentStep === 'review'" class="suggest-card">
        <h3>{{ t("suggest.stepReview") }}</h3>
        <p v-if="submitError" class="suggest-err">{{ submitError }}</p>
        <ul v-if="lastValidationErrors.length" class="suggest-val-list">
          <li v-for="(err, i) in lastValidationErrors" :key="i">{{ err }}</li>
        </ul>
        <pre class="suggest-json">{{ reviewPreview }}</pre>
        <button type="button" class="suggest-submit" :disabled="submitting" @click="submitPack">
          {{ submitting ? t("suggest.submitting") : t("suggest.submit") }}
        </button>
      </section>

      <nav class="suggest-nav">
        <button type="button" :disabled="stepIndex === 0" @click="goBack">{{ t("suggest.back") }}</button>
        <span class="suggest-step-label">{{ t("suggest.stepCounter", { current: stepIndex + 1, total: stepSequence.length }) }}</span>
        <button type="button" :disabled="stepIndex >= stepSequence.length - 1" @click="goNext">{{ t("suggest.next") }}</button>
      </nav>
    </template>
    </div>
  </div>
</template>

<style scoped src="../../styles/public/public-suggest.css"></style>
