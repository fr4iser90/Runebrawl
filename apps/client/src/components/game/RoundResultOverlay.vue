<script setup lang="ts">
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  round: number;
  resultLabel: string;
  summary: string;
  detail: string;
  noDuel: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="round-result-overlay" aria-live="polite">
    <div class="round-result-card">
      <h3>{{ t("game.roundResult.title") }} - {{ t("game.round", { round: props.round }) }}</h3>
      <p class="round-result-outcome">{{ props.noDuel ? t("game.roundResult.noDuel") : props.resultLabel }}</p>
      <p class="round-result-summary">{{ props.summary }}</p>
      <p v-if="props.detail" class="slot-title">{{ props.detail }}</p>
    </div>
  </section>
</template>
