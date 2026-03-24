import { ref } from "vue";
import type { AdminLobbyDetail, AdminLobbySnapshot, AdminMetrics } from "../types/admin";

export function useAdminApi(baseHost: string) {
  const isAuthenticated = ref(false);
  const adminMetrics = ref<AdminMetrics | null>(null);
  const adminLobbies = ref<AdminLobbySnapshot[]>([]);
  const adminLobbyDetail = ref<AdminLobbyDetail | null>(null);
  const adminEventFeed = ref<string[]>([]);
  const adminSelectedLobbyId = ref("");
  const adminFilters = ref<{ phase: string; region: string; visibility: "all" | "public" | "private" }>({
    phase: "",
    region: "",
    visibility: "all"
  });

  let pollingTimer: number | null = null;
  let sse: EventSource | null = null;

  async function checkAuth(): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/auth/admin/status`, {
        credentials: "include"
      });
      const payload = (await response.json()) as { authenticated: boolean };
      isAuthenticated.value = !!payload.authenticated;
    } catch {
      isAuthenticated.value = false;
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`http://${baseHost}:3001/auth/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        isAuthenticated.value = false;
        return false;
      }
      isAuthenticated.value = true;
      return true;
    } catch {
      isAuthenticated.value = false;
      return false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`http://${baseHost}:3001/auth/admin/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch {
      // no-op
    } finally {
      isAuthenticated.value = false;
      adminMetrics.value = null;
      adminLobbies.value = [];
      adminLobbyDetail.value = null;
      adminEventFeed.value = [];
      stopAdminStream();
    }
  }

  async function loadAdminMetrics(): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/metrics`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminMetrics.value = null;
        return;
      }
      adminMetrics.value = (await response.json()) as AdminMetrics;
    } catch {
      adminMetrics.value = null;
    }
  }

  async function loadAdminLobbies(): Promise<void> {
    try {
      const q = new URLSearchParams();
      if (adminFilters.value.phase) q.set("phase", adminFilters.value.phase);
      if (adminFilters.value.region) q.set("region", adminFilters.value.region);
      q.set("visibility", adminFilters.value.visibility);
      const response = await fetch(`http://${baseHost}:3001/admin/lobbies?${q.toString()}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminLobbies.value = [];
        return;
      }
      const payload = (await response.json()) as { lobbies: AdminLobbySnapshot[] };
      adminLobbies.value = payload.lobbies ?? [];
    } catch {
      adminLobbies.value = [];
    }
  }

  async function refreshAdmin(): Promise<void> {
    await checkAuth();
    if (!isAuthenticated.value) return;
    await Promise.all([loadAdminMetrics(), loadAdminLobbies()]);
  }

  async function inspectAdminLobby(matchId: string): Promise<void> {
    adminSelectedLobbyId.value = matchId;
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/lobbies/${matchId}?events=100`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminLobbyDetail.value = null;
        return;
      }
      if (!response.ok) {
        adminLobbyDetail.value = null;
        return;
      }
      adminLobbyDetail.value = (await response.json()) as AdminLobbyDetail;
    } catch {
      adminLobbyDetail.value = null;
    }
  }

  function stopAdminStream(): void {
    if (sse) {
      sse.close();
      sse = null;
    }
  }

  function startAdminStream(matchId: string): void {
    stopAdminStream();
    adminEventFeed.value = [];
    const es = new EventSource(`http://${baseHost}:3001/admin/lobbies/${matchId}/events/stream?from=0&snapshotEvents=20`, {
      withCredentials: true
    });
    sse = es;

    es.addEventListener("snapshot", (event) => {
      const msg = event as MessageEvent;
      const detail = JSON.parse(msg.data) as AdminLobbyDetail;
      adminLobbyDetail.value = detail;
      adminEventFeed.value.push(`[snapshot] ${detail.matchId} ${detail.phase}`);
    });

    es.addEventListener("events", (event) => {
      const msg = event as MessageEvent;
      const events = JSON.parse(msg.data) as Array<{ sequence: number; type: string; message: string }>;
      for (const e of events) {
        adminEventFeed.value.push(`#${e.sequence} [${e.type}] ${e.message}`);
      }
      if (adminEventFeed.value.length > 300) {
        adminEventFeed.value = adminEventFeed.value.slice(-300);
      }
      void inspectAdminLobby(matchId);
    });

    es.addEventListener("end", () => {
      adminEventFeed.value.push("[end] stream closed by server");
      stopAdminStream();
    });

    es.onerror = () => {
      adminEventFeed.value.push("[error] stream disconnected");
      stopAdminStream();
    };
  }

  function startPolling(intervalMs = 5000): void {
    stopPolling();
    pollingTimer = window.setInterval(() => {
      void refreshAdmin();
    }, intervalMs);
  }

  function stopPolling(): void {
    if (pollingTimer !== null) {
      window.clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  return {
    isAuthenticated,
    adminMetrics,
    adminLobbies,
    adminLobbyDetail,
    adminEventFeed,
    adminSelectedLobbyId,
    adminFilters,
    checkAuth,
    login,
    logout,
    loadAdminMetrics,
    loadAdminLobbies,
    refreshAdmin,
    inspectAdminLobby,
    startAdminStream,
    stopAdminStream,
    startPolling,
    stopPolling
  };
}
