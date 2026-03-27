<script setup lang="ts">
import { computed, ref } from "vue";
import type { LobbySummary } from "@runebrawl/shared";
import { useI18n } from "../../i18n/useI18n";

const props = defineProps<{
  connected: boolean;
  name: string;
  profileSyncState: "idle" | "saving" | "saved" | "error";
  inviteCodeInput: string;
  openLobbies: LobbySummary[];
  storedPlayerId: string | null;
  storedMatchId: string | null;
}>();

const emit = defineEmits<{
  (e: "update:name", value: string): void;
  (e: "update:inviteCodeInput", value: string): void;
  (e: "saveProfile"): void;
  (e: "startQuick"): void;
  (e: "startCreatePrivate"): void;
  (e: "startJoinPrivate"): void;
  (e: "startSolo", difficulty: "EASY" | "NORMAL" | "HARD"): void;
  (e: "reconnect"): void;
  (e: "openSettings"): void;
  (e: "refreshLobbies"): void;
  (e: "joinLobby", matchId: string): void;
}>();

const { t } = useI18n();

const showDevFlowBadge = import.meta.env.DEV;

type LobbySortKey = "region" | "mmrBucket" | "fill" | "visibility";

const sortKey = ref<LobbySortKey>("region");
const sortDir = ref<1 | -1>(1);

function toggleSort(key: LobbySortKey): void {
  if (sortKey.value === key) {
    sortDir.value = (sortDir.value === 1 ? -1 : 1) as 1 | -1;
  } else {
    sortKey.value = key;
    sortDir.value = 1;
  }
}

function sortLabel(key: LobbySortKey): string {
  const base =
    key === "region"
      ? t("game.menu.lobbyCol.region")
      : key === "mmrBucket"
        ? t("game.menu.lobbyCol.mmr")
        : key === "fill"
          ? t("game.menu.lobbyCol.fill")
          : t("game.menu.lobbyCol.visibility");
  if (sortKey.value !== key) return base;
  return `${base} ${sortDir.value === 1 ? "▲" : "▼"}`;
}

function fillRatio(lobby: LobbySummary): number {
  if (lobby.maxPlayers <= 0) return 0;
  return lobby.currentPlayers / lobby.maxPlayers;
}

const sortedOpenLobbies = computed(() => {
  const rows = [...props.openLobbies];
  const dir = sortDir.value;
  const key = sortKey.value;
  rows.sort((a, b) => {
    let cmp = 0;
    if (key === "region") cmp = a.region.localeCompare(b.region);
    else if (key === "mmrBucket") cmp = a.mmrBucket.localeCompare(b.mmrBucket);
    else if (key === "fill") cmp = fillRatio(a) - fillRatio(b);
    else cmp = Number(a.isPrivate) - Number(b.isPrivate);
    if (cmp === 0) cmp = a.matchId.localeCompare(b.matchId);
    return cmp * dir;
  });
  return rows;
});

function playerSummary(lobby: LobbySummary): string {
  const h = lobby.humanCount ?? lobby.currentPlayers;
  const b = lobby.botCount ?? 0;
  return t("game.menu.lobbyPlayersFormat", { humans: h, bots: b });
}
</script>

<template>
  <template v-if="!props.connected">
    <section class="menu-screen menu-stage">
      <div class="menu-shell">
        <div class="menu-brand">
          <span class="menu-brand-wordmark">Runebrawl</span>
        </div>
        <header class="menu-header">
          <div class="menu-header-brand">
            <h2>{{ t("game.menu.title") }}</h2>
            <span v-if="showDevFlowBadge" class="menu-mode-badge" aria-hidden="true">FLOW V2</span>
          </div>
          <div class="menu-header-actions-stack">
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
            <div class="menu-public-links">
              <a href="/suggest" class="menu-public-link">{{ t("nav.suggest") }}</a>
              <a href="/codex" class="menu-public-link">{{ t("nav.codex") }}</a>
            </div>
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
            <div class="menu-multi-join">
              <p class="menu-multi-join-title">{{ t("game.menu.joinWithCodeTitle") }}</p>
              <p class="menu-multi-join-hint">{{ t("game.menu.joinWithCodeHint") }}</p>
              <div class="menu-multi-join-row">
                <input
                  class="menu-multi-invite-input"
                  :value="props.inviteCodeInput"
                  :placeholder="t('game.join.inviteCode')"
                  autocomplete="off"
                  spellcheck="false"
                  @input="emit('update:inviteCodeInput', ($event.target as HTMLInputElement).value)"
                />
                <button type="button" class="menu-btn-secondary menu-multi-join-btn" @click="emit('startJoinPrivate')">
                  {{ t("game.join.joinPrivate") }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <details class="menu-lobby-list">
          <summary>{{ t("game.menu.lobbyListTitle") }}</summary>
          <div class="menu-lobby-list-body">
            <p class="menu-lobby-list-lead">{{ t("game.menu.lobbyListLead") }}</p>
            <div class="menu-lobby-toolbar">
              <button type="button" class="menu-btn-secondary menu-lobby-refresh" @click="emit('refreshLobbies')">
                {{ t("game.join.refreshLobbies") }}
              </button>
            </div>

            <div v-if="sortedOpenLobbies.length === 0" class="menu-lobby-empty">
              {{ t("game.menu.lobbyListEmpty") }}
            </div>

            <div v-else class="menu-lobby-table-wrap">
              <table class="menu-lobby-table">
                <thead>
                  <tr>
                    <th scope="col" class="menu-lobby-th-sort">
                      <button type="button" class="menu-lobby-sort-btn" @click="toggleSort('visibility')">
                        {{ sortLabel("visibility") }}
                      </button>
                    </th>
                    <th scope="col" class="menu-lobby-th-sort">
                      <button type="button" class="menu-lobby-sort-btn" @click="toggleSort('region')">
                        {{ sortLabel("region") }}
                      </button>
                    </th>
                    <th scope="col" class="menu-lobby-th-sort">
                      <button type="button" class="menu-lobby-sort-btn" @click="toggleSort('mmrBucket')">
                        {{ sortLabel("mmrBucket") }}
                      </button>
                    </th>
                    <th scope="col">{{ t("game.menu.lobbyCol.players") }}</th>
                    <th scope="col" class="menu-lobby-th-sort">
                      <button type="button" class="menu-lobby-sort-btn" @click="toggleSort('fill')">
                        {{ sortLabel("fill") }}
                      </button>
                    </th>
                    <th scope="col">{{ t("game.menu.lobbyCol.join") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lobby in sortedOpenLobbies" :key="lobby.matchId">
                    <td class="menu-lobby-cell-ico">
                      <span
                        v-if="lobby.isPrivate"
                        class="menu-lobby-private"
                        :title="t('game.menu.lobbyPrivateTitle')"
                        aria-hidden="true"
                      >
                        <svg class="menu-lobby-key-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
                          />
                        </svg>
                      </span>
                      <span v-else class="menu-lobby-public" :title="t('game.menu.lobbyPublicTitle')" aria-hidden="true">
                        <svg class="menu-lobby-key-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                          />
                        </svg>
                      </span>
                    </td>
                    <td>{{ lobby.region }}</td>
                    <td>{{ lobby.mmrBucket }}</td>
                    <td class="menu-lobby-cell-mono">{{ playerSummary(lobby) }}</td>
                    <td>{{ lobby.currentPlayers }} / {{ lobby.maxPlayers }}</td>
                    <td>
                      <button
                        v-if="!lobby.isPrivate"
                        type="button"
                        class="menu-btn-secondary menu-lobby-join-btn"
                        @click="emit('joinLobby', lobby.matchId)"
                      >
                        {{ t("game.menu.lobbyJoin") }}
                      </button>
                      <span v-else class="menu-lobby-invite-only">{{ t("game.menu.lobbyInviteOnly") }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </section>
  </template>
</template>
