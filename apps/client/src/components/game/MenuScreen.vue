<script setup lang="ts">
import type { LobbySummary } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  connected: boolean;
  name: string;
  region: string;
  mmr: number;
  inviteCodeInput: string;
  privateMaxPlayers: number;
  openLobbies: LobbySummary[];
  selectedOpenLobby: string;
  storedPlayerId: string | null;
  storedMatchId: string | null;
}>();

const emit = defineEmits<{
  (e: "update:name", value: string): void;
  (e: "update:region", value: string): void;
  (e: "update:mmr", value: number): void;
  (e: "update:inviteCodeInput", value: string): void;
  (e: "update:privateMaxPlayers", value: number): void;
  (e: "update:selectedOpenLobby", value: string): void;
  (e: "startQuick"): void;
  (e: "startCreatePrivate"): void;
  (e: "startJoinPrivate"): void;
  (e: "startSolo", difficulty: "EASY" | "NORMAL" | "HARD"): void;
  (e: "reconnect"): void;
  (e: "refreshLobbies"): void;
  (e: "joinSelectedOpenLobby"): void;
}>();

const { t } = useI18n();

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
</script>

<template>
  <template v-if="!props.connected">
    <section class="menu-screen menu-stage">
      <div class="menu-title-row">
        <h2>{{ t("game.menu.title") }}</h2>
        <span class="menu-mode-badge">FLOW V2</span>
      </div>
      <p class="menu-lead">{{ t("game.menu.subtitle") }}</p>

      <div class="menu-identity">
        <label>
          {{ t("game.join.yourName") }}
          <input :value="props.name" :placeholder="t('game.join.yourName')" @input="emit('update:name', ($event.target as HTMLInputElement).value)" />
        </label>
      </div>

      <div class="menu-primary-grid">
        <article class="menu-card menu-card-solo">
          <h3>{{ t("game.menu.soloTitle") }}</h3>
          <p class="slot-title">{{ t("game.menu.soloSubtitle") }}</p>
          <div class="actions menu-action-list">
            <button class="cta-primary menu-btn-easy" @click="emit('startSolo', 'EASY')">{{ t("game.menu.soloEasy") }}</button>
            <button class="cta-primary menu-btn-normal" @click="emit('startSolo', 'NORMAL')">{{ t("game.menu.soloNormal") }}</button>
            <button class="cta-primary menu-btn-hard" @click="emit('startSolo', 'HARD')">{{ t("game.menu.soloHard") }}</button>
          </div>
        </article>

        <article class="menu-card menu-card-multi">
          <h3>{{ t("game.menu.multiplayerTitle") }}</h3>
          <p class="slot-title">{{ t("game.menu.multiplayerSubtitle") }}</p>
          <div class="actions menu-action-list">
            <button class="cta-primary" @click="emit('startQuick')">{{ t("game.join.quick") }}</button>
            <button @click="emit('startCreatePrivate')">{{ t("game.join.createPrivate") }}</button>
            <button v-if="props.storedPlayerId && props.storedMatchId" @click="emit('reconnect')">{{ t("game.join.reconnect") }}</button>
          </div>
        </article>
      </div>

      <details class="menu-advanced">
        <summary>{{ t("game.menu.advanced") }}</summary>
        <div class="menu-advanced-grid">
          <input
            :value="props.region"
            :placeholder="t('game.join.regionPlaceholder')"
            @input="emit('update:region', ($event.target as HTMLInputElement).value)"
          />
          <input
            :value="props.mmr"
            type="number"
            min="1"
            :placeholder="t('game.join.mmr')"
            @input="emit('update:mmr', asNumber(($event.target as HTMLInputElement).value))"
          />
          <input
            :value="props.inviteCodeInput"
            :placeholder="t('game.join.inviteCode')"
            @input="emit('update:inviteCodeInput', ($event.target as HTMLInputElement).value)"
          />
          <input
            :value="props.privateMaxPlayers"
            type="number"
            min="2"
            max="8"
            :placeholder="t('game.join.maxPlayers')"
            @input="emit('update:privateMaxPlayers', asNumber(($event.target as HTMLInputElement).value))"
          />
          <div class="actions">
            <button @click="emit('startJoinPrivate')">{{ t("game.join.joinPrivate") }}</button>
            <button v-if="props.storedPlayerId && props.storedMatchId" @click="emit('reconnect')">{{ t("game.join.reconnect") }}</button>
            <button @click="emit('refreshLobbies')">{{ t("game.join.refreshLobbies") }}</button>
          </div>
        </div>
      </details>

      <div v-if="props.openLobbies.length > 0" class="join-card">
        <select :value="props.selectedOpenLobby" @change="emit('update:selectedOpenLobby', ($event.target as HTMLSelectElement).value)">
          <option value="">{{ t("game.join.openLobbyPlaceholder") }}</option>
          <option v-for="lobby in props.openLobbies" :key="lobby.matchId" :value="lobby.matchId">
            {{ lobby.matchId }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }} | {{ lobby.region }} | {{ lobby.mmrBucket }}
          </option>
        </select>
        <button @click="emit('joinSelectedOpenLobby')">{{ t("game.join.selectedLobby") }}</button>
      </div>
    </section>
  </template>
</template>
