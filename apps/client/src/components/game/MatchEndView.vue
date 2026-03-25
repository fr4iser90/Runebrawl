<script setup lang="ts">
import type { MatchPublicState } from "@runebrawl/shared";
import { computed } from "vue";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  state: MatchPublicState;
  mePlayerId: string;
}>();

const emit = defineEmits<{
  (e: "playAgain"): void;
  (e: "backToMenu"): void;
}>();

const { t } = useI18n();

const placements = computed(() =>
  [...props.state.players].sort((a, b) => {
    if (b.health !== a.health) return b.health - a.health;
    return a.name.localeCompare(b.name);
  })
);
</script>

<template>
  <section class="match-end-screen">
    <header class="match-end-header">
      <h2>{{ t("game.matchEnd.title") }}</h2>
      <p class="slot-title">{{ t("game.round", { round: props.state.round }) }}</p>
    </header>

    <ol class="match-end-list">
      <li
        v-for="(p, idx) in placements"
        :key="p.playerId"
        :class="[
          'anim-stagger-in',
          { 'is-me': p.playerId === props.mePlayerId },
          idx === 0 ? 'rank-1' : '',
          idx === 1 ? 'rank-2' : '',
          idx === 2 ? 'rank-3' : ''
        ]"
        :style="{ '--stagger-index': idx }"
      >
        <span class="match-end-rank">#{{ idx + 1 }}</span>
        <span class="match-end-name">
          {{ p.name }}
          <span v-if="p.playerId === props.mePlayerId" class="player-badge badge-human">{{ t("game.matchEnd.you") }}</span>
        </span>
        <span class="match-end-health">{{ t("game.matchEnd.health", { hp: p.health }) }}</span>
      </li>
    </ol>

    <div class="actions">
      <button class="cta-primary" @click="emit('playAgain')">{{ t("game.matchEnd.playAgain") }}</button>
      <button @click="emit('backToMenu')">{{ t("game.matchEnd.backToMenu") }}</button>
    </div>
  </section>
</template>
