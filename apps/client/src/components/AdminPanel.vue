<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import { useAdminApi } from "../composables/useAdminApi";
import { useI18n } from "../i18n/useI18n";

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
const baseHost = location.hostname;
const { t } = useI18n();

const UNIT_ROLES: UnitDefinition["role"][] = ["Tank", "Melee", "Ranged", "Support"];
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
  adminUnitPool,
  adminEventFeed,
  adminLastErrorCode,
  adminLastErrorMessage,
  adminFilters,
  checkAuth,
  login,
  logout,
  refreshAdmin,
  loadAdminLobbies,
  loadAdminContentDraft,
  loadAdminUnitPool,
  saveAdminContentDraft,
  validateAdminContentDraft,
  publishAdminContentDraft,
  inspectAdminLobby,
  startAdminStream,
  stopAdminStream,
  startPolling,
  stopPolling
} = useAdminApi(baseHost);

const ADMIN_ERROR_KEYS: Record<string, string> = {
  ADMIN_UNAUTHORIZED: "admin.error.ADMIN_UNAUTHORIZED",
  ADMIN_INVALID_CREDENTIALS: "admin.error.ADMIN_INVALID_CREDENTIALS",
  ADMIN_MATCH_NOT_FOUND: "admin.error.ADMIN_MATCH_NOT_FOUND"
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
  if (!Number.isFinite(unit.speed) || unit.speed <= 0) errors.push(t("admin.builder.validation.unit.speedRange"));
  if (!Number.isFinite(unit.shopWeight) || (unit.shopWeight ?? 0) <= 0) errors.push(t("admin.builder.validation.unit.shopWeightRange"));
  for (const tag of unit.tags ?? []) {
    if (!SYNERGY_KEYS.includes(tag)) errors.push(t("admin.builder.validation.unit.invalidTag", { tag }));
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
  return errors;
});

const hasFormValidationErrors = computed(() => selectedUnitErrors.value.length > 0 || selectedHeroErrors.value.length > 0);

function unitFieldInvalid(field: "id" | "name" | "tier" | "attack" | "hp" | "speed" | "shopWeight" | "role" | "ability" | "tags"): boolean {
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
    case "speed":
      return !Number.isFinite(unit.speed) || unit.speed <= 0;
    case "shopWeight":
      return !Number.isFinite(unit.shopWeight) || (unit.shopWeight ?? 0) <= 0;
    case "role":
      return !UNIT_ROLES.includes(unit.role);
    case "ability":
      return !ABILITY_KEYS.includes(unit.ability);
    case "tags":
      return (unit.tags ?? []).some((tag) => !SYNERGY_KEYS.includes(tag));
  }
}

function heroFieldInvalid(field: "id" | "name" | "description" | "powerType" | "powerKey" | "powerCost" | "offerWeight"): boolean {
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
  }
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
    speed: 1,
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
}

async function doLogout(): Promise<void> {
  await logout();
  stopPolling();
}

onMounted(() => {
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

onBeforeUnmount(() => {
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
                  <input v-model.number="selectedUnit.speed" type="number" min="1" :class="{ 'input-invalid': unitFieldInvalid('speed') }" />
                  <input v-model.number="selectedUnit.shopWeight" type="number" min="0.01" step="0.01" :placeholder="t('admin.builder.shopWeight')" :class="{ 'input-invalid': unitFieldInvalid('shopWeight') }" />
                  <select v-model="selectedUnit.ability" :class="{ 'input-invalid': unitFieldInvalid('ability') }">
                    <option v-for="ability in ABILITY_KEYS" :key="`ability-${ability}`" :value="ability">{{ ability }}</option>
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
