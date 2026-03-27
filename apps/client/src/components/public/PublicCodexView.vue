<script setup lang="ts">
import { useI18n } from "../../i18n/useI18n";

const { t } = useI18n();
</script>

<template>
  <main class="public-codex app">
    <section class="codex-hero">
      <h2>{{ t("codex.pageTitle") }}</h2>
      <p class="codex-intro">{{ t("codex.intro") }}</p>
      <p class="codex-disclaimer">{{ t("codex.disclaimer") }}</p>
    </section>

    <section class="codex-grid">
      <article class="codex-card">
        <h3>{{ t("codex.stats.title") }}</h3>
        <p>{{ t("codex.stats.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.combat.title") }}</h3>
        <p>{{ t("codex.combat.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.archetypes.title") }}</h3>
        <p>{{ t("codex.archetypes.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.races.title") }}</h3>
        <p>{{ t("codex.races.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.unitsHeroes.title") }}</h3>
        <p>{{ t("codex.unitsHeroes.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.lore.title") }}</h3>
        <p>{{ t("codex.lore.body") }}</p>
      </article>

      <article class="codex-card">
        <h3>{{ t("codex.mechanics.title") }}</h3>
        <p>{{ t("codex.mechanics.body") }}</p>
      </article>
    </section>
  </main>
</template>

<style scoped src="../../styles/public/public-codex.css"></style>
