<script setup lang="ts">
import { computed } from "vue";
import AdminPanel from "./components/AdminPanel.vue";
import GameClient from "./components/GameClient.vue";
import PublicReviewView from "./components/PublicReviewView.vue";
import PublicSuggestView from "./components/PublicSuggestView.vue";
import { useI18n } from "./i18n/useI18n";

const pathname = computed(() => window.location.pathname);
const isAdminRoute = computed(() => pathname.value.startsWith("/admin"));
const isReviewRoute = computed(() => {
  const p = pathname.value.replace(/\/$/, "") || "/";
  return p === "/review";
});
const isSuggestRoute = computed(() => {
  const p = pathname.value.replace(/\/$/, "") || "/";
  return p === "/suggest";
});
const { locale, setLocale, t } = useI18n();

function openGameSettings(): void {
  window.dispatchEvent(new CustomEvent("runebrawl:open-settings"));
}
</script>

<template>
  <div>
    <header class="header top-nav">
      <h1>Runebrawl</h1>
      <div class="actions">
        <a href="/" class="nav-link">{{ t("nav.game") }}</a>
        <a href="/suggest" class="nav-link">{{ t("nav.suggest") }}</a>
        <a href="/review" class="nav-link">{{ t("nav.review") }}</a>
        <a href="/admin" class="nav-link">{{ t("nav.admin") }}</a>
        <button v-if="!isAdminRoute && !isReviewRoute && !isSuggestRoute" @click="openGameSettings">{{ t("game.settings.open") }}</button>
        <label>
          {{ t("nav.language") }}
          <select :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value as 'en' | 'de')">
            <option value="en">{{ t("nav.lang.en") }}</option>
            <option value="de">{{ t("nav.lang.de") }}</option>
          </select>
        </label>
      </div>
    </header>
    <AdminPanel v-if="isAdminRoute" />
    <PublicSuggestView v-else-if="isSuggestRoute" />
    <PublicReviewView v-else-if="isReviewRoute" />
    <GameClient v-else />
  </div>
</template>
