<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
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
  heroPortraitPath: (heroId: string) => string;
  heroBackplatePath: (heroId: string) => string | null;
}>();

const emit = defineEmits<{
  (e: "kickPlayer", targetPlayerId: string): void;
}>();

const { t } = useI18n();
const logEl = ref<HTMLElement | null>(null);

function heroBackplateStyle(url: string | null): Record<string, string> | undefined {
  if (!url) return undefined;
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat"
  };
}

watch(
  () => props.enrichedCombatLog.length,
  async () => {
    await nextTick();
    if (!logEl.value) return;
    logEl.value.scrollTop = logEl.value.scrollHeight;
  },
  { flush: "post" }
);
</script>

<template>
  <aside class="sidebar">
    <h3>{{ t("game.players") }}</h3>
    <ul class="player-list">
      <li v-for="p in props.state.players" :key="p.playerId" class="player-row">
        <div class="player-row-main">
          <div class="player-hero-icon" :style="heroBackplateStyle(p.hero ? props.heroBackplatePath(p.hero.id) : null)">
            <img v-if="p.hero" class="portrait-image portrait-image-contain" :src="props.heroPortraitPath(p.hero.id)" :alt="p.hero.name" loading="lazy" />
            <span v-else>?</span>
          </div>
          <div class="player-row-text">
            <div class="player-row-topline">
              <span class="player-name">{{ props.displayPlayerName(p.name) }}</span>
              <span class="player-badge" :class="props.playerTypeBadgeClass(p.name)">{{ props.playerTypeLabel(p.name) }}</span>
              <span class="player-status-badge" :class="p.ready ? 'status-ready' : 'status-thinking'">
                {{ p.ready ? t("game.ready") : t("game.thinking") }}
              </span>
            </div>
            <div class="player-row-meta">
              <img class="chip-icon" :src="props.statHealthIcon" alt="" />
              <span>{{ p.health }} {{ t("game.hpShort") }}</span>
              <span class="meta-dot">•</span>
              <span>{{ p.hero ? p.hero.name : t("game.noHero") }}</span>
            </div>
          </div>
        </div>
        <div class="player-hover-card">
          <div class="player-hover-title">{{ props.displayPlayerName(p.name) }}</div>
          <div>{{ p.hero ? p.hero.name : t("game.noHero") }}</div>
          <div>{{ t("game.health") }}: {{ p.health }}</div>
          <div>{{ t("game.gold") }}: {{ p.gold }}</div>
          <div>{{ t("game.tier") }}: {{ p.tavernTier }} / {{ t("game.xp") }}: {{ p.xp }}</div>
          <div>{{ p.ready ? t("game.ready") : t("game.thinking") }}</div>
        </div>
        <button v-if="props.isLobby && props.isCreator && p.playerId !== props.mePlayerId" @click="emit('kickPlayer', p.playerId)">
          {{ t("game.kick") }}
        </button>
      </li>
    </ul>

    <h3>{{ t("game.combatLog") }}</h3>
    <div ref="logEl" class="log">
      <div v-for="(entry, idx) in props.enrichedCombatLog" :key="idx" class="log-entry">
        <div>{{ entry.line }}</div>
        <div v-if="entry.hint" class="log-hint">{{ entry.hint }}</div>
      </div>
    </div>
  </aside>
</template>
