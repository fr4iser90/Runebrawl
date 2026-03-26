<script setup lang="ts">
import type { LobbySummary } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  connected: boolean;
  name: string;
  profileSyncState: "idle" | "saving" | "saved" | "error";
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
  (e: "saveProfile"): void;
  (e: "startQuick"): void;
  (e: "startCreatePrivate"): void;
  (e: "startJoinPrivate"): void;
  (e: "startSolo", difficulty: "EASY" | "NORMAL" | "HARD"): void;
  (e: "reconnect"): void;
  (e: "openSettings"): void;
  (e: "refreshLobbies"): void;
  (e: "joinSelectedOpenLobby"): void;
}>();

const { t } = useI18n();

const showDevFlowBadge = import.meta.env.DEV;

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
</script>

<template>
  <template v-if="!props.connected">
    <section class="menu-screen menu-stage">
      <div class="menu-shell">
        <header class="menu-header">
          <div class="menu-header-brand">
            <h2>{{ t("game.menu.title") }}</h2>
            <span v-if="showDevFlowBadge" class="menu-mode-badge" aria-hidden="true">FLOW V2</span>
          </div>
          <div class="menu-header-actions">
            <a href="/login" class="menu-auth-link">{{ t("game.menu.logIn") }}</a>
            <a href="/register" class="menu-auth-link">{{ t("game.menu.register") }}</a>
            <button type="button" class="menu-btn-icon" :aria-label="t('game.settings.open')" @click="emit('openSettings')">
              <svg class="menu-icon-gear" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>
              <span class="menu-btn-icon-text">{{ t("game.settings.open") }}</span>
            </button>
          </div>
        </header>

        <p class="menu-lead">{{ t("game.menu.subtitle") }}</p>

        <div class="menu-identity-panel menu-identity-panel--compact">
          <div class="menu-identity menu-identity--row" role="group" :aria-label="t('game.menu.profileSection')">
            <label class="menu-name-field">
              <span class="menu-name-label">{{ t("game.join.yourName") }}</span>
              <input
                class="menu-name-input"
                :value="props.name"
                :placeholder="t('game.join.yourName')"
                autocomplete="username"
                @input="emit('update:name', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <div class="menu-profile-meta">
              <span class="menu-profile-status" :class="`state-${props.profileSyncState}`">
                <template v-if="props.profileSyncState === 'saving'">{{ t("game.profile.statusSaving") }}</template>
                <template v-else-if="props.profileSyncState === 'saved'">{{ t("game.profile.statusSaved") }}</template>
                <template v-else-if="props.profileSyncState === 'error'">{{ t("game.profile.statusError") }}</template>
                <template v-else>{{ t("game.profile.statusIdle") }}</template>
              </span>
              <button
                type="button"
                class="menu-btn-save"
                :disabled="!props.name.trim() || props.profileSyncState === 'saving'"
                @click="emit('saveProfile')"
              >
                {{ t("game.profile.saveNow") }}
              </button>
            </div>
          </div>
        </div>

        <div class="menu-primary-grid">
        <article class="menu-card menu-card-solo">
          <h3>{{ t("game.menu.soloTitle") }}</h3>
          <p class="slot-title">{{ t("game.menu.soloSubtitle") }}</p>
          <div class="actions menu-action-list">
            <button type="button" class="cta-primary menu-btn-easy" @click="emit('startSolo', 'EASY')">
              {{ t("game.menu.soloEasy") }}
            </button>
            <button type="button" class="cta-primary menu-btn-normal" @click="emit('startSolo', 'NORMAL')">
              {{ t("game.menu.soloNormal") }}
            </button>
            <button type="button" class="cta-primary menu-btn-hard" @click="emit('startSolo', 'HARD')">
              {{ t("game.menu.soloHard") }}
            </button>
          </div>
        </article>

        <article class="menu-card menu-card-multi">
          <h3>{{ t("game.menu.multiplayerTitle") }}</h3>
          <p class="slot-title">{{ t("game.menu.multiplayerSubtitle") }}</p>
          <div class="actions menu-action-list">
            <button type="button" class="cta-primary" @click="emit('startQuick')">{{ t("game.join.quick") }}</button>
            <button type="button" class="menu-btn-secondary" @click="emit('startCreatePrivate')">
              {{ t("game.join.createPrivate") }}
            </button>
            <button
              v-if="props.storedPlayerId && props.storedMatchId"
              type="button"
              class="menu-btn-secondary"
              @click="emit('reconnect')"
            >
              {{ t("game.join.reconnect") }}
            </button>
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
            <button type="button" @click="emit('startJoinPrivate')">{{ t("game.join.joinPrivate") }}</button>
            <button
              v-if="props.storedPlayerId && props.storedMatchId"
              type="button"
              @click="emit('reconnect')"
            >
              {{ t("game.join.reconnect") }}
            </button>
            <button type="button" @click="emit('refreshLobbies')">{{ t("game.join.refreshLobbies") }}</button>
          </div>
        </div>
        </details>

        <div v-if="props.openLobbies.length > 0" class="join-card menu-open-lobbies">
        <select
          :value="props.selectedOpenLobby"
          @change="emit('update:selectedOpenLobby', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t("game.join.openLobbyPlaceholder") }}</option>
          <option v-for="lobby in props.openLobbies" :key="lobby.matchId" :value="lobby.matchId">
            {{ lobby.matchId }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }} | {{ lobby.region }} | {{ lobby.mmrBucket }}
          </option>
        </select>
        <button type="button" @click="emit('joinSelectedOpenLobby')">{{ t("game.join.selectedLobby") }}</button>
        </div>
      </div>
    </section>
  </template>
</template>
