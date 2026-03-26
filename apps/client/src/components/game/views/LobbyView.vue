<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import type { MatchPublicState } from "@runebrawl/shared";
import { useI18n } from "../../../i18n/useI18n";

interface MeView {
  playerId: string;
  ready: boolean;
}

const props = defineProps<{
  state: MatchPublicState;
  me: MeView;
  isCreator: boolean;
  isPrivateLobby: boolean;
  lobbyStatusText: string;
  statPlayersIcon: string;
  statHealthIcon: string;
  playerTypeIconPath: (name: string) => string;
  displayPlayerName: (name: string) => string;
  playerTypeBadgeClass: (name: string) => string;
  playerTypeLabel: (name: string) => string;
}>();

const emit = defineEmits<{
  (e: "addBotToLobby"): void;
  (e: "forceStartLobby"): void;
  (e: "readyLobbyToggle"): void;
  (e: "kickPlayer", targetPlayerId: string): void;
}>();

const { t } = useI18n();
const copiedInvite = ref(false);
let copiedResetTimer: number | null = null;

async function shareInviteLink(inviteCode: string): Promise<void> {
  const url = `${window.location.origin}/?invite=${encodeURIComponent(inviteCode)}`;
  if (navigator.share) {
    try {
      await navigator.share({ url });
      copiedInvite.value = true;
    } catch {
      // Ignore abort/cancel and fall back to clipboard only when possible.
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copiedInvite.value = true;
      if (copiedResetTimer !== null) window.clearTimeout(copiedResetTimer);
      copiedResetTimer = window.setTimeout(() => {
        copiedInvite.value = false;
      }, 1600);
    } catch {
      copiedInvite.value = false;
    }
  }
}

onBeforeUnmount(() => {
  if (copiedResetTimer !== null) window.clearTimeout(copiedResetTimer);
});
</script>

<template>
  <section class="lobby-screen">
    <header class="lobby-header">
      <h2>{{ t("phase.LOBBY") }}</h2>
      <div class="stats">
        <span class="stat-pill">
          <img class="chip-icon" :src="props.statPlayersIcon" alt="" />
          {{ t("game.players") }}: {{ props.state.players.length }} / {{ props.state.maxPlayers }}
        </span>
        <span v-if="props.state.isPrivate && props.state.inviteCode" class="stat-pill">{{ t("game.code") }}: {{ props.state.inviteCode }}</span>
        <button v-if="props.state.isPrivate && props.state.inviteCode" @click="shareInviteLink(props.state.inviteCode)">
          {{ copiedInvite ? t("game.invite.copied") : t("game.invite.copyLink") }}
        </button>
      </div>
    </header>

    <p class="slot-title lobby-status">{{ props.lobbyStatusText }}</p>

    <div class="lobby-grid">
      <article class="lobby-card">
        <h3>{{ t("game.players") }}</h3>
        <ul class="player-list">
          <li v-for="p in props.state.players" :key="p.playerId">
            <img class="chip-icon" :src="props.playerTypeIconPath(p.name)" alt="" />
            {{ props.displayPlayerName(p.name) }} -
            <span class="player-badge" :class="props.playerTypeBadgeClass(p.name)">{{ props.playerTypeLabel(p.name) }}</span> -
            <img class="chip-icon" :src="props.statHealthIcon" alt="" /> {{ p.health }} {{ t("game.hpShort") }} -
            {{ p.hero ? p.hero.name : t("game.noHero") }} - {{ p.ready ? t("game.ready") : t("game.thinking") }}
            <button v-if="props.isCreator && p.playerId !== props.me.playerId" @click="emit('kickPlayer', p.playerId)">{{ t("game.kick") }}</button>
          </li>
        </ul>
      </article>

      <article class="lobby-card">
        <h3>{{ t("game.lobbyControls") }}</h3>
        <div class="actions">
          <button v-if="props.isCreator" @click="emit('addBotToLobby')">{{ t("game.addBot") }}</button>
          <button v-if="props.isPrivateLobby && props.isCreator" @click="emit('forceStartLobby')">{{ t("game.forceStart") }}</button>
          <button v-if="props.isPrivateLobby" @click="emit('readyLobbyToggle')">{{ props.me.ready ? t("game.unreadyLobby") : t("game.readyLobby") }}</button>
        </div>
      </article>
    </div>
  </section>
</template>
