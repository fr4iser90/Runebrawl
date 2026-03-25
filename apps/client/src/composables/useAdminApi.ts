import { ref } from "vue";
import type { ErrorCode, HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import type {
  AdminContentDraftResponse,
  AdminContentSnapshot,
  AdminContentValidationResult,
  AdminLobbyDetail,
  AdminLobbySnapshot,
  AdminMetrics,
  AdminUnitPoolSnapshot
} from "../types/admin";
import { useI18n } from "../i18n/useI18n";

interface ApiErrorPayload {
  error?: string;
  errorCode?: ErrorCode;
}

export function useAdminApi(baseHost: string) {
  const { t } = useI18n();
  const isAuthenticated = ref(false);
  const adminMetrics = ref<AdminMetrics | null>(null);
  const adminLobbies = ref<AdminLobbySnapshot[]>([]);
  const adminLobbyDetail = ref<AdminLobbyDetail | null>(null);
  const adminContentCatalog = ref<AdminContentSnapshot | null>(null);
  const adminContentDraft = ref<AdminContentSnapshot | null>(null);
  const adminContentHasDraft = ref(false);
  const adminContentValidation = ref<AdminContentValidationResult | null>(null);
  const adminUnitPool = ref<AdminUnitPoolSnapshot | null>(null);
  const adminEventFeed = ref<string[]>([]);
  const adminLastErrorCode = ref<ErrorCode | null>(null);
  const adminLastErrorMessage = ref("");
  const adminSelectedLobbyId = ref("");
  const adminFilters = ref<{ phase: string; region: string; visibility: "all" | "public" | "private" }>({
    phase: "",
    region: "",
    visibility: "all"
  });

  let pollingTimer: number | null = null;
  let sse: EventSource | null = null;

  function clearAdminError(): void {
    adminLastErrorCode.value = null;
    adminLastErrorMessage.value = "";
  }

  function appendFeedLine(line: string): void {
    adminEventFeed.value.push(line);
    if (adminEventFeed.value.length > 300) {
      adminEventFeed.value = adminEventFeed.value.slice(-300);
    }
  }

  async function parseApiError(response: Response): Promise<void> {
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      adminLastErrorCode.value = payload.errorCode ?? null;
      adminLastErrorMessage.value = payload.error ?? "";
    } catch {
      adminLastErrorCode.value = null;
      adminLastErrorMessage.value = "";
    }
  }

  async function checkAuth(): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/auth/admin/status`, {
        credentials: "include"
      });
      if (!response.ok) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as { authenticated: boolean };
      isAuthenticated.value = !!payload.authenticated;
    } catch {
      isAuthenticated.value = false;
    }
  }

  async function login(username: string, password: string): Promise<{ ok: boolean; errorCode?: ErrorCode }> {
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
        await parseApiError(response);
        return { ok: false, errorCode: adminLastErrorCode.value ?? undefined };
      }
      clearAdminError();
      isAuthenticated.value = true;
      return { ok: true };
    } catch {
      isAuthenticated.value = false;
      return { ok: false };
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
      adminUnitPool.value = null;
      adminEventFeed.value = [];
      clearAdminError();
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
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminMetrics.value = null;
        await parseApiError(response);
        return;
      }
      clearAdminError();
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
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminLobbies.value = [];
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as { lobbies: AdminLobbySnapshot[] };
      adminLobbies.value = payload.lobbies ?? [];
    } catch {
      adminLobbies.value = [];
    }
  }

  async function refreshAdmin(): Promise<void> {
    await checkAuth();
    if (!isAuthenticated.value) return;
    await Promise.all([loadAdminMetrics(), loadAdminLobbies(), loadAdminContentCatalog()]);
  }

  async function loadAdminContentCatalog(): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/catalog`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminContentCatalog.value = null;
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminContentCatalog.value = null;
        await parseApiError(response);
        return;
      }
      clearAdminError();
      adminContentCatalog.value = (await response.json()) as AdminContentSnapshot;
    } catch {
      adminContentCatalog.value = null;
    }
  }

  async function loadAdminContentDraft(): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/draft`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminContentDraft.value = null;
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminContentDraft.value = null;
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as AdminContentDraftResponse;
      adminContentHasDraft.value = payload.hasDraft;
      adminContentDraft.value = payload.snapshot;
    } catch {
      adminContentDraft.value = null;
    }
  }

  async function saveAdminContentDraft(units: UnitDefinition[], heroes: HeroDefinition[]): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/draft`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, heroes })
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return { ok: false, errors: [t("admin.error.ADMIN_UNAUTHORIZED")] };
      }
      const payload = (await response.json()) as AdminContentValidationResult;
      adminContentValidation.value = payload;
      if (payload.ok) {
        adminContentHasDraft.value = true;
        await loadAdminContentDraft();
      }
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.error.saveFailed")] };
    }
  }

  async function validateAdminContentDraft(): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/draft/validate`, {
        method: "POST",
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return { ok: false, errors: [t("admin.error.ADMIN_UNAUTHORIZED")] };
      }
      const payload = (await response.json()) as AdminContentValidationResult;
      adminContentValidation.value = payload;
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.error.validateFailed")] };
    }
  }

  async function publishAdminContentDraft(): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/draft/publish`, {
        method: "POST",
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return { ok: false, errors: [t("admin.error.ADMIN_UNAUTHORIZED")] };
      }
      const payload = (await response.json()) as AdminContentValidationResult;
      adminContentValidation.value = payload;
      if (payload.ok) {
        adminContentHasDraft.value = false;
        await Promise.all([loadAdminContentCatalog(), loadAdminContentDraft()]);
      }
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.error.publishFailed")] };
    }
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
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminLobbyDetail.value = null;
        await parseApiError(response);
        return;
      }
      clearAdminError();
      adminLobbyDetail.value = (await response.json()) as AdminLobbyDetail;
      await loadAdminUnitPool(matchId);
    } catch {
      adminLobbyDetail.value = null;
      adminUnitPool.value = null;
    }
  }

  async function loadAdminUnitPool(matchId: string): Promise<void> {
    try {
      const response = await fetch(`http://${baseHost}:3001/admin/content/pool?matchId=${encodeURIComponent(matchId)}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminUnitPool.value = null;
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminUnitPool.value = null;
        await parseApiError(response);
        return;
      }
      clearAdminError();
      adminUnitPool.value = (await response.json()) as AdminUnitPoolSnapshot;
    } catch {
      adminUnitPool.value = null;
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
      appendFeedLine(t("admin.feed.snapshot", { matchId: detail.matchId, phase: t(`phase.${detail.phase}`) }));
    });

    es.addEventListener("events", (event) => {
      const msg = event as MessageEvent;
      const events = JSON.parse(msg.data) as Array<{ sequence: number; type: string; message: string }>;
      for (const e of events) {
        appendFeedLine(t("admin.feed.event", { sequence: e.sequence, type: e.type, message: e.message }));
      }
      void inspectAdminLobby(matchId);
    });

    es.addEventListener("end", (event) => {
      const msg = event as MessageEvent;
      let reason = "unknown";
      try {
        const payload = JSON.parse(msg.data) as { reason?: string };
        reason = payload.reason ?? "unknown";
      } catch {
        reason = "unknown";
      }
      appendFeedLine(t("admin.feed.end", { reason: t(`admin.feed.reason.${reason}`) }));
      stopAdminStream();
    });

    es.onerror = () => {
      appendFeedLine(t("admin.feed.errorDisconnected"));
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
    adminContentCatalog,
    adminContentDraft,
    adminContentHasDraft,
    adminContentValidation,
    adminUnitPool,
    adminEventFeed,
    adminLastErrorCode,
    adminLastErrorMessage,
    adminSelectedLobbyId,
    adminFilters,
    checkAuth,
    login,
    logout,
    loadAdminMetrics,
    loadAdminLobbies,
    loadAdminContentCatalog,
    loadAdminContentDraft,
    loadAdminUnitPool,
    saveAdminContentDraft,
    validateAdminContentDraft,
    publishAdminContentDraft,
    refreshAdmin,
    inspectAdminLobby,
    startAdminStream,
    stopAdminStream,
    startPolling,
    stopPolling
  };
}
