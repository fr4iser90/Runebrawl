<script setup lang="ts">
import { computed } from "vue";
import AdminPanel from "./components/AdminPanel.vue";
import GameClient from "./components/GameClient.vue";
import { useI18n } from "./i18n/useI18n";

const pathname = computed(() => window.location.pathname);
const isAdminRoute = computed(() => pathname.value.startsWith("/admin"));
const { locale, setLocale, t } = useI18n();
</script>

<template>
  <div>
    <header class="header top-nav">
      <h1>Runebrawl</h1>
      <div class="actions">
        <a href="/" class="nav-link">{{ t("nav.game") }}</a>
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
    <GameClient v-else />
  </div>
</template>
