import { ref } from "vue";
import type { ErrorCode, HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import type {
  AdminCommunitySubmissionDetail,
  AdminCommunitySubmissionSummary,
  AdminContentPublishAuditEntry,
  AdminContentDraftResponse,
  AdminContentSnapshot,
  AdminContentValidationResult,
  AdminLobbyDetail,
  AdminLobbySnapshot,
  AdminMetrics,
  AdminPlayerRating,
  AdminUnitPoolSnapshot
} from "../types/admin";
import { useI18n } from "../i18n/useI18n";

interface ApiErrorPayload {
  error?: string;
  errorCode?: ErrorCode;
}

export function useAdminApi(apiBaseUrl: string) {
  const { t } = useI18n();
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  const isAuthenticated = ref(false);
  const adminMetrics = ref<AdminMetrics | null>(null);
  const adminLobbies = ref<AdminLobbySnapshot[]>([]);
  const adminLobbyDetail = ref<AdminLobbyDetail | null>(null);
  const adminContentCatalog = ref<AdminContentSnapshot | null>(null);
  const adminContentDraft = ref<AdminContentSnapshot | null>(null);
  const adminContentHasDraft = ref(false);
  const adminContentValidation = ref<AdminContentValidationResult | null>(null);
  const adminContentPublishHistory = ref<AdminContentPublishAuditEntry[]>([]);
  const adminCommunitySubmissions = ref<AdminCommunitySubmissionSummary[]>([]);
  const adminCommunitySubmissionDetail = ref<AdminCommunitySubmissionDetail | null>(null);
  const adminUnitPool = ref<AdminUnitPoolSnapshot | null>(null);
  const adminRatingLeaderboard = ref<AdminPlayerRating[]>([]);
  const adminRatingPlayer = ref<AdminPlayerRating | null>(null);
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
      const response = await fetch(`${normalizedApiBaseUrl}/auth/admin/status`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/auth/admin/login`, {
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
      await fetch(`${normalizedApiBaseUrl}/auth/admin/logout`, {
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
      adminContentPublishHistory.value = [];
      adminCommunitySubmissions.value = [];
      adminCommunitySubmissionDetail.value = null;
      adminRatingLeaderboard.value = [];
      adminRatingPlayer.value = null;
      adminEventFeed.value = [];
      clearAdminError();
      stopAdminStream();
    }
  }

  async function loadAdminMetrics(): Promise<void> {
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/metrics`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/lobbies?${q.toString()}`, {
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
    await Promise.all([
      loadAdminMetrics(),
      loadAdminLobbies(),
      loadAdminContentCatalog(),
      loadAdminContentPublishHistory(),
      loadAdminCommunitySubmissions(),
      loadAdminRatingLeaderboard()
    ]);
  }

  async function loadAdminRatingLeaderboard(limit = 20): Promise<void> {
    try {
      const boundedLimit = Math.max(1, Math.min(200, limit));
      const response = await fetch(`${normalizedApiBaseUrl}/admin/ratings/leaderboard?limit=${boundedLimit}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminRatingLeaderboard.value = [];
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminRatingLeaderboard.value = [];
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as { leaderboard?: AdminPlayerRating[] };
      adminRatingLeaderboard.value = payload.leaderboard ?? [];
    } catch {
      adminRatingLeaderboard.value = [];
    }
  }

  async function loadAdminRatingPlayer(playerId: string): Promise<AdminPlayerRating | null> {
    const trimmed = playerId.trim();
    if (!trimmed) {
      adminRatingPlayer.value = null;
      return null;
    }
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/ratings/player/${encodeURIComponent(trimmed)}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminRatingPlayer.value = null;
        await parseApiError(response);
        return null;
      }
      if (!response.ok) {
        adminRatingPlayer.value = null;
        await parseApiError(response);
        return null;
      }
      clearAdminError();
      const payload = (await response.json()) as AdminPlayerRating;
      adminRatingPlayer.value = payload;
      return payload;
    } catch {
      adminRatingPlayer.value = null;
      return null;
    }
  }

  async function loadAdminContentCatalog(): Promise<void> {
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/catalog`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/draft`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/draft`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/draft/validate`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/draft/publish`, {
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
        await Promise.all([loadAdminContentCatalog(), loadAdminContentDraft(), loadAdminContentPublishHistory()]);
      }
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.error.publishFailed")] };
    }
  }

  async function loadAdminContentPublishHistory(limit = 30): Promise<void> {
    try {
      const boundedLimit = Math.max(1, Math.min(200, limit));
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/publish-history?limit=${boundedLimit}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminContentPublishHistory.value = [];
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminContentPublishHistory.value = [];
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as { entries?: AdminContentPublishAuditEntry[] };
      adminContentPublishHistory.value = payload.entries ?? [];
    } catch {
      adminContentPublishHistory.value = [];
    }
  }

  async function loadAdminCommunitySubmissions(): Promise<void> {
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/submissions`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminCommunitySubmissions.value = [];
        await parseApiError(response);
        return;
      }
      if (!response.ok) {
        adminCommunitySubmissions.value = [];
        await parseApiError(response);
        return;
      }
      clearAdminError();
      const payload = (await response.json()) as { submissions?: AdminCommunitySubmissionSummary[] };
      adminCommunitySubmissions.value = payload.submissions ?? [];
    } catch {
      adminCommunitySubmissions.value = [];
    }
  }

  async function loadAdminCommunitySubmissionDetail(submissionId: string): Promise<AdminCommunitySubmissionDetail | null> {
    const trimmed = submissionId.trim();
    if (!trimmed) {
      adminCommunitySubmissionDetail.value = null;
      return null;
    }
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/submissions/${encodeURIComponent(trimmed)}`, {
        credentials: "include"
      });
      if (response.status === 401) {
        isAuthenticated.value = false;
        adminCommunitySubmissionDetail.value = null;
        await parseApiError(response);
        return null;
      }
      if (!response.ok) {
        adminCommunitySubmissionDetail.value = null;
        await parseApiError(response);
        return null;
      }
      clearAdminError();
      const payload = (await response.json()) as AdminCommunitySubmissionDetail;
      adminCommunitySubmissionDetail.value = payload;
      return payload;
    } catch {
      adminCommunitySubmissionDetail.value = null;
      return null;
    }
  }

  async function importAdminCommunitySubmissionToDraft(submissionId: string): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(
        `${normalizedApiBaseUrl}/admin/content/submissions/${encodeURIComponent(submissionId)}/import-draft`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      if (response.status === 401) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return { ok: false, errors: [t("admin.error.ADMIN_UNAUTHORIZED")] };
      }
      const payload = (await response.json()) as AdminContentValidationResult;
      adminContentValidation.value = payload;
      if (!response.ok || !payload.ok) {
        return payload;
      }
      adminContentHasDraft.value = true;
      await Promise.all([loadAdminContentDraft(), loadAdminCommunitySubmissions()]);
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.community.importFailed")] };
    }
  }

  async function approvePublishAdminCommunitySubmission(submissionId: string): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(
        `${normalizedApiBaseUrl}/admin/content/submissions/${encodeURIComponent(submissionId)}/approve-publish`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      if (response.status === 401) {
        isAuthenticated.value = false;
        await parseApiError(response);
        return { ok: false, errors: [t("admin.error.ADMIN_UNAUTHORIZED")] };
      }
      const payload = (await response.json()) as AdminContentValidationResult;
      adminContentValidation.value = payload;
      if (!response.ok || !payload.ok) {
        return payload;
      }
      adminContentHasDraft.value = false;
      await Promise.all([
        loadAdminContentCatalog(),
        loadAdminContentDraft(),
        loadAdminContentPublishHistory(),
        loadAdminCommunitySubmissions()
      ]);
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.community.approvePublishFailed")] };
    }
  }

  async function rollbackAdminContentToAudit(auditId: string): Promise<AdminContentValidationResult> {
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/publish-history/${encodeURIComponent(auditId)}/rollback`, {
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
      if (!response.ok || !payload.ok) {
        return payload;
      }
      adminContentHasDraft.value = false;
      await Promise.all([loadAdminContentCatalog(), loadAdminContentDraft(), loadAdminContentPublishHistory()]);
      return payload;
    } catch {
      return { ok: false, errors: [t("admin.builder.audit.rollbackFailed")] };
    }
  }

  async function inspectAdminLobby(matchId: string): Promise<void> {
    adminSelectedLobbyId.value = matchId;
    try {
      const response = await fetch(`${normalizedApiBaseUrl}/admin/lobbies/${matchId}?events=100`, {
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
      const response = await fetch(`${normalizedApiBaseUrl}/admin/content/pool?matchId=${encodeURIComponent(matchId)}`, {
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
    const es = new EventSource(`${normalizedApiBaseUrl}/admin/lobbies/${matchId}/events/stream?from=0&snapshotEvents=20`, {
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
    adminContentPublishHistory,
    adminCommunitySubmissions,
    adminCommunitySubmissionDetail,
    adminUnitPool,
    adminRatingLeaderboard,
    adminRatingPlayer,
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
    loadAdminRatingLeaderboard,
    loadAdminRatingPlayer,
    loadAdminContentCatalog,
    loadAdminContentDraft,
    loadAdminContentPublishHistory,
    loadAdminUnitPool,
    loadAdminCommunitySubmissions,
    loadAdminCommunitySubmissionDetail,
    importAdminCommunitySubmissionToDraft,
    approvePublishAdminCommunitySubmission,
    rollbackAdminContentToAudit,
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
