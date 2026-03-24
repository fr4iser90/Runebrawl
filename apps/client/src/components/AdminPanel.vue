<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useAdminApi } from "../composables/useAdminApi";

const showAdmin = ref(true);
const username = ref("admin");
const password = ref("");
const authError = ref("");
const baseHost = location.hostname;

const {
  isAuthenticated,
  adminMetrics,
  adminLobbies,
  adminLobbyDetail,
  adminEventFeed,
  adminFilters,
  checkAuth,
  login,
  logout,
  refreshAdmin,
  loadAdminLobbies,
  inspectAdminLobby,
  startAdminStream,
  stopAdminStream,
  startPolling,
  stopPolling
} = useAdminApi(baseHost);

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

async function doLogin(): Promise<void> {
  authError.value = "";
  const ok = await login(username.value, password.value);
  if (!ok) {
    authError.value = "Login failed.";
    return;
  }
  password.value = "";
  startPolling(5000);
  void refreshAdmin();
}

async function doLogout(): Promise<void> {
  await logout();
  stopPolling();
}

onMounted(() => {
  void checkAuth().then(() => {
    if (isAuthenticated.value) {
      void refreshAdmin();
      startPolling(5000);
    }
  });
});

onBeforeUnmount(() => {
  stopPolling();
  stopAdminStream();
});
</script>

<template>
  <section class="admin-panel">
    <div class="admin-header">
      <h2>Admin Panel</h2>
      <div class="actions">
        <button v-if="isAuthenticated" @click="doLogout">Logout</button>
        <button @click="showAdmin = !showAdmin">{{ showAdmin ? "Hide" : "Show" }}</button>
        <button @click="refreshAdmin">Refresh</button>
      </div>
    </div>

    <div v-if="showAdmin && !isAuthenticated" class="admin-card">
      <h3>Admin Login</h3>
      <div class="join-card">
        <input v-model="username" placeholder="Username" />
        <input v-model="password" type="password" placeholder="Password" />
        <button @click="doLogin">Login</button>
      </div>
      <p v-if="authError" class="error">{{ authError }}</p>
      <p class="slot-title">Set `ADMIN_PASSWORD` and optional `ADMIN_USERNAME` on server.</p>
    </div>

    <div v-if="showAdmin && isAuthenticated" class="admin-grid">
      <div class="admin-card">
        <h3>Metrics</h3>
        <div class="stats" v-if="adminMetrics">
          <span>Total: {{ adminMetrics.totalMatches }}</span>
          <span>Active: {{ adminMetrics.activeMatches }}</span>
          <span>Finished: {{ adminMetrics.finishedMatches }}</span>
          <span>Humans: {{ adminMetrics.connectedHumans }}</span>
          <span>Bots: {{ adminMetrics.bots }}</span>
          <span>Avg Fill: {{ adminMetrics.averageFillMs }}ms</span>
        </div>
      </div>

      <div class="admin-card">
        <h3>Lobby Filters</h3>
        <div class="join-card">
          <select v-model="adminFilters.phase">
            <option value="">Any phase</option>
            <option value="LOBBY">LOBBY</option>
            <option value="TAVERN">TAVERN</option>
            <option value="POSITIONING">POSITIONING</option>
            <option value="COMBAT">COMBAT</option>
            <option value="ROUND_END">ROUND_END</option>
            <option value="FINISHED">FINISHED</option>
          </select>
          <input v-model="adminFilters.region" placeholder="Region" />
          <select v-model="adminFilters.visibility">
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button @click="loadAdminLobbies">Apply</button>
        </div>
        <div class="log">
          <div v-for="lobby in adminLobbies" :key="`admin-${lobby.matchId}`" class="admin-row">
            <span>{{ lobby.matchId }} | {{ lobby.phase }} | {{ lobby.currentPlayers }}/{{ lobby.maxPlayers }}</span>
            <span>{{ lobby.region }} {{ lobby.mmrBucket }}</span>
            <button @click="inspectAdminLobby(lobby.matchId)">Inspect</button>
            <button @click="startAdminStream(lobby.matchId)">Stream</button>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <h3>Selected Lobby Detail</h3>
        <div v-if="adminLobbyDetail">
          <p>
            {{ adminLobbyDetail.matchId }} | {{ adminLobbyDetail.phase }} | round {{ adminLobbyDetail.round }}
            <span v-if="adminLobbyDetail.inviteCode"> | code {{ adminLobbyDetail.inviteCode }}</span>
          </p>
          <div class="log">
            <div v-for="p in adminLobbyDetail.players" :key="`detail-${p.playerId}`">
              {{ p.name }} | HP {{ p.health }} | {{ p.connected ? "online" : "offline" }} | {{ p.isBot ? "bot" : "human" }}
            </div>
          </div>
          <h3>Recent Events</h3>
          <div class="log">
            <div v-for="e in adminLobbyDetail.recentEvents" :key="`evt-${e.sequence}`">
              {{ formatTime(e.at) }} | #{{ e.sequence }} | {{ e.type }} | {{ e.message }}
            </div>
          </div>
        </div>
        <div v-else>No lobby selected.</div>

        <h3>Live Event Feed</h3>
        <div class="log">
          <div v-for="(line, idx) in adminEventFeed" :key="`feed-${idx}`">
            {{ line }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
