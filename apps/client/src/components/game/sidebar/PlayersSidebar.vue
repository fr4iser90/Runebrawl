<script setup lang="ts">
import type { MatchPublicState } from "@runebrawl/shared";
import { useI18n } from "../../../i18n/useI18n";

interface EnrichedLogEntry {
  line: string;
  hint: string;
}

const props = defineProps<{
  state: MatchPublicState;
  isLobby: boolean;
  isCreator: boolean;
  mePlayerId: string;
  enrichedCombatLog: EnrichedLogEntry[];
  playerTypeIconPath: (name: string) => string;
  displayPlayerName: (name: string) => string;
  playerTypeBadgeClass: (name: string) => string;
  playerTypeLabel: (name: string) => string;
  statHealthIcon: string;
}>();

const emit = defineEmits<{
  (e: "kickPlayer", targetPlayerId: string): void;
}>();

const { t } = useI18n();
</script>

<template>
  <aside class="sidebar">
    <h3>{{ t("game.players") }}</h3>
    <ul class="player-list">
      <li v-for="p in props.state.players" :key="p.playerId">
        <img class="chip-icon" :src="props.playerTypeIconPath(p.name)" alt="" />
        {{ props.displayPlayerName(p.name) }} -
        <span class="player-badge" :class="props.playerTypeBadgeClass(p.name)">{{ props.playerTypeLabel(p.name) }}</span> -
        <img class="chip-icon" :src="props.statHealthIcon" alt="" /> {{ p.health }} {{ t("game.hpShort") }} -
        {{ p.hero ? p.hero.name : t("game.noHero") }} - {{ p.ready ? t("game.ready") : t("game.thinking") }}
        <button v-if="props.isLobby && props.isCreator && p.playerId !== props.mePlayerId" @click="emit('kickPlayer', p.playerId)">
          {{ t("game.kick") }}
        </button>
      </li>
    </ul>

    <h3>{{ t("game.combatLog") }}</h3>
    <div class="log">
      <div v-for="(entry, idx) in props.enrichedCombatLog" :key="idx" class="log-entry">
        <div>{{ entry.line }}</div>
        <div v-if="entry.hint" class="log-hint">{{ entry.hint }}</div>
      </div>
    </div>
  </aside>
</template>
