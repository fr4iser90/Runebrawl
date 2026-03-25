<script setup lang="ts">
import type { LobbySummary } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  connected: boolean;
  joinMode: "quick" | "createPrivate" | "joinPrivate";
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
  (e: "update:joinMode", value: "quick" | "createPrivate" | "joinPrivate"): void;
  (e: "update:name", value: string): void;
  (e: "update:region", value: string): void;
  (e: "update:mmr", value: number): void;
  (e: "update:inviteCodeInput", value: string): void;
  (e: "update:privateMaxPlayers", value: number): void;
  (e: "update:selectedOpenLobby", value: string): void;
  (e: "connect"): void;
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
    <div class="join-card menu-screen">
      <select :value="props.joinMode" @change="emit('update:joinMode', ($event.target as HTMLSelectElement).value as 'quick' | 'createPrivate' | 'joinPrivate')">
        <option value="quick">{{ t("game.join.quick") }}</option>
        <option value="createPrivate">{{ t("game.join.createPrivate") }}</option>
        <option value="joinPrivate">{{ t("game.join.joinPrivate") }}</option>
      </select>
      <input :value="props.name" :placeholder="t('game.join.yourName')" @input="emit('update:name', ($event.target as HTMLInputElement).value)" />
      <input
        v-if="props.joinMode !== 'joinPrivate'"
        :value="props.region"
        :placeholder="t('game.join.regionPlaceholder')"
        @input="emit('update:region', ($event.target as HTMLInputElement).value)"
      />
      <input
        v-if="props.joinMode !== 'joinPrivate'"
        :value="props.mmr"
        type="number"
        min="1"
        :placeholder="t('game.join.mmr')"
        @input="emit('update:mmr', asNumber(($event.target as HTMLInputElement).value))"
      />
      <input
        v-if="props.joinMode === 'joinPrivate'"
        :value="props.inviteCodeInput"
        :placeholder="t('game.join.inviteCode')"
        @input="emit('update:inviteCodeInput', ($event.target as HTMLInputElement).value)"
      />
      <input
        v-if="props.joinMode === 'createPrivate'"
        :value="props.privateMaxPlayers"
        type="number"
        min="2"
        max="8"
        :placeholder="t('game.join.maxPlayers')"
        @input="emit('update:privateMaxPlayers', asNumber(($event.target as HTMLInputElement).value))"
      />
      <button @click="emit('connect')">{{ props.storedPlayerId && props.storedMatchId ? t("game.join.reconnect") : t("game.join.enterLobby") }}</button>
      <button @click="emit('refreshLobbies')">{{ t("game.join.refreshLobbies") }}</button>
    </div>

    <div v-if="props.openLobbies.length > 0" class="join-card">
      <select :value="props.selectedOpenLobby" @change="emit('update:selectedOpenLobby', ($event.target as HTMLSelectElement).value)">
        <option value="">{{ t("game.join.openLobbyPlaceholder") }}</option>
        <option v-for="lobby in props.openLobbies" :key="lobby.matchId" :value="lobby.matchId">
          {{ lobby.matchId }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }} | {{ lobby.region }} | {{ lobby.mmrBucket }}
        </option>
      </select>
      <button @click="emit('joinSelectedOpenLobby')">{{ t("game.join.selectedLobby") }}</button>
    </div>
  </template>
</template>
