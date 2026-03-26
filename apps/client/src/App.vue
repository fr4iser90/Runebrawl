<script setup lang="ts">
import { computed } from "vue";
import AdminPanel from "./components/admin/AdminPanel.vue";
import GameClient from "./components/GameClient.vue";
import PlayerAccountStubView from "./components/public/PlayerAccountStubView.vue";
import PublicReviewView from "./components/public/PublicReviewView.vue";
import PublicSuggestView from "./components/public/PublicSuggestView.vue";
import { useI18n } from "./i18n/useI18n";

const pathname = computed(() => window.location.pathname);
const normalizedPath = computed(() => pathname.value.replace(/\/$/, "") || "/");
const isAdminRoute = computed(() => pathname.value.startsWith("/admin"));
const isReviewRoute = computed(() => normalizedPath.value === "/review");
const isSuggestRoute = computed(() => normalizedPath.value === "/suggest");
const isLoginRoute = computed(() => normalizedPath.value === "/login");
const isRegisterRoute = computed(() => normalizedPath.value === "/register");
const isGameRoute = computed(
  () =>
    !isAdminRoute.value &&
    !isReviewRoute.value &&
    !isSuggestRoute.value &&
    !isLoginRoute.value &&
    !isRegisterRoute.value
);
const { locale, setLocale, t } = useI18n();
</script>

<template>
  <div>
    <header v-if="!isGameRoute" class="header top-nav">
      <h1>Runebrawl</h1>
      <div class="actions">
        <a href="/" class="nav-link">{{ t("nav.game") }}</a>
        <a href="/suggest" class="nav-link">{{ t("nav.suggest") }}</a>
        <a href="/review" class="nav-link">{{ t("nav.review") }}</a>
        <a href="/admin" class="nav-link">{{ t("nav.admin") }}</a>
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
    <PlayerAccountStubView v-else-if="isLoginRoute" variant="login" />
    <PlayerAccountStubView v-else-if="isRegisterRoute" variant="register" />
    <GameClient v-else />
  </div>
</template>
