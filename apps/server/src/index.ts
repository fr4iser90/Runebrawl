import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import type { ClientIntent, ErrorCode, HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ContentBuilderService } from "./admin/contentBuilderService.js";
import { CommunityContentService } from "./admin/communityContentService.js";
import { SqlContentAuditStore } from "./admin/sqlContentAuditStore.js";
import {
  convertAndSaveUnitPortrait,
  listPortraitUnitIdsForSubmission,
  readPortraitFileIfExists
} from "./public/publicSubmissionPortraits.js";
import {
  parseSubmissionMetadata,
  PublicSubmissionStore,
  type PublicSubmissionStatus
} from "./public/publicSubmissionStore.js";
import { AdminAuthService } from "./auth/adminAuth.js";
import { PlayerIdentityService } from "./auth/playerIdentity.js";
import { PlayerProfileService } from "./auth/playerProfile.js";
import { MatchmakingService } from "./matchmakingService.js";
import { getGameContentManifest } from "@runebrawl/game-content";

const server = Fastify({ logger: true });
const matchmaking = new MatchmakingService();
const adminAuth = new AdminAuthService();
const playerIdentity = new PlayerIdentityService();
const playerProfiles = new PlayerProfileService(process.env.DATABASE_URL);
const contentBuilder = new ContentBuilderService();
const contentAuditStore = new SqlContentAuditStore(process.env.DATABASE_URL);
const publicSubmissionStore = new PublicSubmissionStore(process.env.DATABASE_URL);
const communityContent = new CommunityContentService(contentBuilder);

function sendWsError(socket: { send: (data: string) => void }, message: string, errorCode?: ErrorCode): void {
  socket.send(JSON.stringify({ type: "ERROR", message, errorCode }));
}

function sendHttpError(reply: FastifyReply, statusCode: number, error: string, errorCode: ErrorCode): void {
  reply.code(statusCode).send({ error, errorCode });
}

function isPgUndefinedTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "42P01";
}

const PORTRAIT_UPLOAD_STATUSES: PublicSubmissionStatus[] = ["pending_validation", "pending_review"];

function submissionAllowsPortraitUpload(status: PublicSubmissionStatus): boolean {
  return PORTRAIT_UPLOAD_STATUSES.includes(status);
}

function mapErrorCode(error: unknown): ErrorCode | undefined {
  if (!(error instanceof Error)) return undefined;
  if (error.name === "SyntaxError") {
    return "INVALID_MESSAGE_FORMAT";
  }
  switch (error.message) {
    case "Private lobby not found":
      return "PRIVATE_LOBBY_NOT_FOUND";
    case "Private lobby is full or already started":
      return "PRIVATE_LOBBY_NOT_JOINABLE";
    case "Lobby not joinable":
      return "LOBBY_NOT_JOINABLE";
    case "Match is full or already started":
      return "MATCH_NOT_JOINABLE";
    default:
      return undefined;
  }
}

async function persistLatestContentAudit(): Promise<void> {
  if (!contentAuditStore.enabled) return;
  await contentAuditStore.persistLatestFromBuilder(contentBuilder);
}

if (contentAuditStore.enabled) {
  try {
    await contentAuditStore.hydrateBuilder(contentBuilder);
    server.log.info("Loaded persisted content publish audit history.");
  } catch (error) {
    server.log.warn({ error }, "Failed to load persisted content publish audit history; continuing with in-memory history.");
  }
}

const configuredCorsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

await server.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    const allowed =
      configuredCorsAllowedOrigins.length > 0
        ? configuredCorsAllowedOrigins.includes(origin)
        : origin.startsWith("http://localhost:5173") ||
          origin.startsWith("http://127.0.0.1:5173") ||
          origin.startsWith("http://localhost:5174") ||
          origin.startsWith("http://127.0.0.1:5174");
    cb(null, allowed);
  },
  credentials: true
});
await server.register(cookie);
await server.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });
await server.register(websocket);

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!adminAuth.isAuthenticated(request)) {
    sendHttpError(reply, 401, "Unauthorized", "ADMIN_UNAUTHORIZED");
    return;
  }
}

server.get("/health", async () => ({ ok: true }));
server.get("/content/manifest", async () => getGameContentManifest());

server.get("/public/submissions", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const q = request.query as { validOnly?: string; limit?: string };
  const validOnly = q.validOnly === "1" || q.validOnly === "true";
  const limit = q.limit ? Number(q.limit) : 50;
  try {
    const submissions = await publicSubmissionStore.listSubmissions({
      validOnly,
      limit: Number.isFinite(limit) ? limit : 50
    });
    return { submissions };
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    throw error;
  }
});

server.get("/public/submissions/:id", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const { id } = request.params as { id: string };
  try {
    const submission = await publicSubmissionStore.getSubmission(id);
    if (!submission) {
      sendHttpError(reply, 404, "Submission not found", "PUBLIC_SUBMISSION_NOT_FOUND");
      return;
    }
    const portraitUnitIds = await listPortraitUnitIdsForSubmission(id, new Set(submission.units.map((u) => u.id)));
    return { submission, portraitUnitIds };
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    throw error;
  }
});

server.get("/public/submissions/:id/portraits/:unitId", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const { id, unitId } = request.params as { id: string; unitId: string };
  try {
    const submission = await publicSubmissionStore.getSubmission(id);
    if (!submission || !submission.units.some((u) => u.id === unitId)) {
      sendHttpError(reply, 404, "Submission or unit not found", "PUBLIC_SUBMISSION_NOT_FOUND");
      return;
    }
    const buf = await readPortraitFileIfExists(id, unitId);
    if (!buf) {
      sendHttpError(reply, 404, "Portrait not found", "PUBLIC_SUBMISSION_NOT_FOUND");
      return;
    }
    return reply.type("image/webp").send(buf);
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    throw error;
  }
});

server.post("/public/submissions/:id/portraits/:unitId", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const { id, unitId } = request.params as { id: string; unitId: string };
  playerIdentity.createOrRefreshSession(request, reply);
  let submission;
  try {
    submission = await publicSubmissionStore.getSubmission(id);
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    throw error;
  }
  if (!submission) {
    sendHttpError(reply, 404, "Submission not found", "PUBLIC_SUBMISSION_NOT_FOUND");
    return;
  }
  if (!submissionAllowsPortraitUpload(submission.status)) {
    sendHttpError(reply, 400, "This submission no longer accepts portrait uploads.", "INVALID_MESSAGE_FORMAT");
    return;
  }
  if (!submission.units.some((u) => u.id === unitId)) {
    sendHttpError(reply, 400, "Unit is not part of this submission.", "INVALID_MESSAGE_FORMAT");
    return;
  }
  const file = await request.file();
  if (!file) {
    sendHttpError(reply, 400, "Expected multipart field \"file\" with image data.", "INVALID_MESSAGE_FORMAT");
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of file.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buf = Buffer.concat(chunks);
  const result = await convertAndSaveUnitPortrait(id, unitId, buf, file.mimetype, file.filename);
  if (!result.ok) {
    sendHttpError(reply, 400, result.error, "INVALID_MESSAGE_FORMAT");
    return;
  }
  return {
    ok: true,
    path: `/public/submissions/${encodeURIComponent(id)}/portraits/${encodeURIComponent(unitId)}`
  };
});

server.post("/public/submissions", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const body = (request.body as { metadata?: unknown; units?: unknown; heroes?: unknown } | undefined) ?? {};
  const metaParsed = parseSubmissionMetadata(body.metadata);
  if (!metaParsed.ok) {
    sendHttpError(reply, 400, metaParsed.error, "INVALID_MESSAGE_FORMAT");
    return;
  }
  if (!Array.isArray(body.units) || !Array.isArray(body.heroes)) {
    sendHttpError(reply, 400, "units and heroes must be arrays.", "INVALID_MESSAGE_FORMAT");
    return;
  }
  const units = body.units as UnitDefinition[];
  const heroes = body.heroes as HeroDefinition[];
  const validation = contentBuilder.validateContent(units, heroes, { allowPartialCatalog: true });
  try {
    const { id } = await publicSubmissionStore.createSubmission({
      metadata: metaParsed.metadata,
      units,
      heroes,
      validationOk: validation.ok,
      validationErrors: validation.errors
    });
    return { ok: true, id, validation };
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "23505") {
      sendHttpError(
        reply,
        409,
        "A submission with this pack_id is already open for review.",
        "PUBLIC_DUPLICATE_PACK_ID"
      );
      return;
    }
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    server.log.error({ error }, "public submission insert failed");
    return reply.code(500).send({ error: "Failed to save submission" });
  }
});

server.post("/public/submissions/:id/vote", async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions require DATABASE_URL and migration 004.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const { id } = request.params as { id: string };
  const body = (request.body as { value?: unknown } | undefined) ?? {};
  const raw = body.value;
  const value = raw === 1 || raw === -1 ? raw : Number(raw);
  if (value !== 1 && value !== -1) {
    sendHttpError(reply, 400, "value must be 1 or -1", "INVALID_MESSAGE_FORMAT");
    return;
  }
  let existing;
  try {
    existing = await publicSubmissionStore.getSubmission(id);
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    throw error;
  }
  if (!existing) {
    sendHttpError(reply, 404, "Submission not found", "PUBLIC_SUBMISSION_NOT_FOUND");
    return;
  }
  const accountId = playerIdentity.createOrRefreshSession(request, reply);
  try {
    const agg = await publicSubmissionStore.castVote(id, accountId, value);
    return { ok: true, submissionId: id, voteScore: agg.voteScore, voteCount: agg.voteCount };
  } catch (error: unknown) {
    if (isPgUndefinedTable(error)) {
      request.log.warn({ err: error }, "public submissions: DB tables missing (run db/migrations)");
      sendHttpError(
        reply,
        503,
        "Public submissions require database tables from db/migrations applied to PostgreSQL.",
        "PUBLIC_SUBMISSIONS_DISABLED"
      );
      return;
    }
    server.log.error({ error }, "public vote failed");
    return reply.code(500).send({ error: "Failed to record vote" });
  }
});

server.get("/admin/content/public-submissions", { preHandler: requireAdmin }, async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions store not configured.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const q = request.query as { status?: string; limit?: string };
  const limit = q.limit ? Number(q.limit) : 100;
  const statusTokens = q.status
    ? q.status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const statusIn =
    statusTokens.length > 0 ? (statusTokens as PublicSubmissionStatus[]) : undefined;
  const submissions = await publicSubmissionStore.listSubmissions({
    listAll: !statusIn,
    statusIn: statusIn && statusIn.length > 0 ? statusIn : undefined,
    validOnly: false,
    limit: Number.isFinite(limit) ? limit : 100
  });
  return { submissions };
});

server.get("/admin/content/public-submissions/:id", { preHandler: requireAdmin }, async (request, reply) => {
  if (!publicSubmissionStore.enabled) {
    sendHttpError(reply, 503, "Public submissions store not configured.", "PUBLIC_SUBMISSIONS_DISABLED");
    return;
  }
  const { id } = request.params as { id: string };
  const submission = await publicSubmissionStore.getSubmission(id);
  if (!submission) {
    sendHttpError(reply, 404, "Submission not found", "PUBLIC_SUBMISSION_NOT_FOUND");
    return;
  }
  return { submission };
});
server.get("/lobbies", async () => ({ lobbies: matchmaking.listOpenLobbies() }));
server.get("/auth/admin/status", async (request) => ({
  authenticated: adminAuth.isAuthenticated(request)
}));
server.post("/auth/player/session", async (request, reply) => {
  const body = (request.body as { accountId?: string; displayName?: string; name?: string } | undefined) ?? {};
  const accountId = playerIdentity.createOrRefreshSession(request, reply, body.accountId);
  const profile = await playerProfiles.ensureProfile(accountId, body.displayName ?? body.name);
  return { ok: true, accountId: profile.accountId, displayName: profile.displayName };
});
server.post("/auth/player/profile", async (request, reply) => {
  const body = (request.body as { displayName?: string } | undefined) ?? {};
  const accountId = playerIdentity.readSessionAccountId(request);
  if (!accountId) {
    sendHttpError(reply, 401, "Player session required", "JOIN_FIRST_REQUIRED");
    return;
  }
  const profile = await playerProfiles.updateDisplayName(accountId, body.displayName ?? "");
  return { ok: true, accountId: profile.accountId, displayName: profile.displayName };
});
server.post("/auth/admin/login", async (request, reply) => {
  const body = (request.body as { username?: string; password?: string } | undefined) ?? {};
  const username = body.username ?? "admin";
  const password = body.password ?? "";
  const ok = adminAuth.login(username, password, reply);
  if (!ok) {
    sendHttpError(reply, 401, "Invalid credentials", "ADMIN_INVALID_CREDENTIALS");
    return;
  }
  return { ok: true };
});
server.post("/auth/admin/logout", async (request, reply) => {
  adminAuth.logout(request, reply);
  return { ok: true };
});

server.get("/admin/lobbies", { preHandler: requireAdmin }, async (request) => {
  const query = request.query as { phase?: string; region?: string; visibility?: "public" | "private" | "all" };
  return { lobbies: matchmaking.listAdminLobbies(query) };
});
server.get("/admin/lobbies/:matchId", { preHandler: requireAdmin }, async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const { events } = request.query as { events?: string };
  const eventsLimitRaw = events ? Number(events) : 50;
  const eventsLimit = Number.isFinite(eventsLimitRaw) ? Math.max(1, Math.min(500, eventsLimitRaw)) : 50;
  const detail = matchmaking.getAdminLobbyDetail(matchId, eventsLimit);
  if (!detail) {
    sendHttpError(reply, 404, "Match not found", "ADMIN_MATCH_NOT_FOUND");
    return;
  }
  return detail;
});
server.get("/admin/lobbies/:matchId/events/stream", { preHandler: requireAdmin }, async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const { from, snapshotEvents } = request.query as { from?: string; snapshotEvents?: string };
  const fromRaw = from ? Number(from) : 0;
  let cursor = Number.isFinite(fromRaw) ? Math.max(0, fromRaw) : 0;
  const initialEventsRaw = snapshotEvents ? Number(snapshotEvents) : 50;
  const initialEvents = Number.isFinite(initialEventsRaw) ? Math.max(1, Math.min(500, initialEventsRaw)) : 50;

  const initialDetail = matchmaking.getAdminLobbyDetail(matchId, initialEvents);
  if (!initialDetail) {
    sendHttpError(reply, 404, "Match not found", "ADMIN_MATCH_NOT_FOUND");
    return;
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const writeEvent = (eventName: string, payload: unknown): void => {
    reply.raw.write(`event: ${eventName}\n`);
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  writeEvent("snapshot", initialDetail);
  const backlog = matchmaking.getReplayEvents(matchId, cursor + 1);
  if (backlog.length > 0) {
    cursor = backlog[backlog.length - 1].sequence;
    writeEvent("events", backlog);
  }

  const poll = setInterval(() => {
    const detail = matchmaking.getAdminLobbyDetail(matchId, 1);
    if (!detail) {
      writeEvent("end", { reason: "match_not_found" });
      clearInterval(poll);
      reply.raw.end();
      return;
    }
    const events = matchmaking.getReplayEvents(matchId, cursor + 1);
    if (events.length > 0) {
      cursor = events[events.length - 1].sequence;
      writeEvent("events", events);
    } else {
      // Heartbeat keeps proxies and browser connections alive.
      writeEvent("heartbeat", { ts: Date.now(), cursor });
    }
  }, 2000);

  request.raw.on("close", () => {
    clearInterval(poll);
  });
});
server.get("/admin/metrics", { preHandler: requireAdmin }, async () => matchmaking.getTelemetryMetrics());
server.get("/admin/ratings/leaderboard", { preHandler: requireAdmin }, async (request) => {
  const { limit } = request.query as { limit?: string };
  const parsed = limit ? Number(limit) : 50;
  const boundedLimit = Number.isFinite(parsed) ? Math.max(1, Math.min(200, parsed)) : 50;
  return { leaderboard: await matchmaking.getRatingLeaderboard(boundedLimit) };
});
server.get("/admin/ratings/player/:playerId", { preHandler: requireAdmin }, async (request, reply) => {
  const { playerId } = request.params as { playerId: string };
  const rating = await matchmaking.getPlayerRating(playerId);
  if (!rating) {
    sendHttpError(reply, 404, "Rating not found", "ADMIN_RATING_NOT_FOUND");
    return;
  }
  return rating;
});
server.get("/admin/content/catalog", { preHandler: requireAdmin }, async () => contentBuilder.getCatalog());
server.get("/admin/content/pool", { preHandler: requireAdmin }, async (request, reply) => {
  const { matchId } = request.query as { matchId?: string };
  if (matchId) {
    const snapshot = matchmaking.getAdminUnitPool(matchId);
    if (!snapshot) {
      sendHttpError(reply, 404, "Match not found", "ADMIN_MATCH_NOT_FOUND");
      return;
    }
    return snapshot;
  }
  return { matches: matchmaking.listAdminUnitPools() };
});
server.get("/admin/content/draft", { preHandler: requireAdmin }, async () => contentBuilder.getDraft());
server.put("/admin/content/draft", { preHandler: requireAdmin }, async (request, reply) => {
  const body = (request.body as { units?: unknown; heroes?: unknown } | undefined) ?? {};
  if (!Array.isArray(body.units) || !Array.isArray(body.heroes)) {
    sendHttpError(reply, 400, "Invalid draft payload.", "INVALID_MESSAGE_FORMAT");
    return;
  }
  const result = contentBuilder.saveDraft(body.units as UnitDefinition[], body.heroes as HeroDefinition[]);
  if (!result.ok) {
    reply.code(400).send(result);
    return;
  }
  return result;
});
server.post("/admin/content/draft/validate", { preHandler: requireAdmin }, async () => contentBuilder.validateDraft());
server.post("/admin/content/draft/publish", { preHandler: requireAdmin }, async (request, reply) => {
  const result = contentBuilder.publishDraft();
  if (!result.ok) {
    reply.code(400).send(result);
    return;
  }
  try {
    await persistLatestContentAudit();
  } catch (error) {
    server.log.warn({ error }, "Failed to persist content publish audit entry.");
  }
  return result;
});
server.get("/admin/content/submissions", { preHandler: requireAdmin }, async () => ({
  submissions: await communityContent.listSubmissions()
}));
server.get("/admin/content/submissions/:submissionId", { preHandler: requireAdmin }, async (request, reply) => {
  const { submissionId } = request.params as { submissionId: string };
  const submission = await communityContent.getSubmission(submissionId);
  if (!submission) {
    sendHttpError(reply, 404, "Submission not found", "ADMIN_CONTENT_SUBMISSION_NOT_FOUND");
    return;
  }
  return submission;
});
server.post("/admin/content/submissions/:submissionId/import-draft", { preHandler: requireAdmin }, async (request, reply) => {
  const { submissionId } = request.params as { submissionId: string };
  const submission = await communityContent.getSubmission(submissionId);
  if (!submission) {
    sendHttpError(reply, 404, "Submission not found", "ADMIN_CONTENT_SUBMISSION_NOT_FOUND");
    return;
  }
  if (!submission.validation.ok) {
    reply.code(400).send(submission.validation);
    return;
  }
  const result = contentBuilder.saveDraft(submission.units, submission.heroes);
  if (!result.ok) {
    reply.code(400).send(result);
    return;
  }
  return {
    ok: true,
    errors: [],
    imported: {
      submissionId: submission.submissionId,
      units: submission.units.length,
      heroes: submission.heroes.length
    }
  };
});
server.post("/admin/content/submissions/:submissionId/approve-publish", { preHandler: requireAdmin }, async (request, reply) => {
  const { submissionId } = request.params as { submissionId: string };
  const submission = await communityContent.getSubmission(submissionId);
  if (!submission) {
    sendHttpError(reply, 404, "Submission not found", "ADMIN_CONTENT_SUBMISSION_NOT_FOUND");
    return;
  }
  if (!submission.validation.ok) {
    reply.code(400).send(submission.validation);
    return;
  }
  const saveResult = contentBuilder.saveDraft(submission.units, submission.heroes);
  if (!saveResult.ok) {
    reply.code(400).send(saveResult);
    return;
  }
  const publishResult = contentBuilder.publishDraft({
    actor: "admin",
    source: "COMMUNITY_SUBMISSION",
    submissionId
  });
  if (!publishResult.ok) {
    reply.code(400).send(publishResult);
    return;
  }
  try {
    await persistLatestContentAudit();
  } catch (error) {
    server.log.warn({ error }, "Failed to persist content publish audit entry.");
  }
  return {
    ok: true,
    errors: [],
    approved: {
      submissionId,
      units: submission.units.length,
      heroes: submission.heroes.length
    }
  };
});
server.get("/admin/content/publish-history", { preHandler: requireAdmin }, async (request) => {
  const { limit } = request.query as { limit?: string };
  const parsed = limit ? Number(limit) : 30;
  const boundedLimit = Number.isFinite(parsed) ? Math.max(1, Math.min(200, parsed)) : 30;
  return { entries: contentBuilder.getPublishHistory(boundedLimit) };
});
server.post("/admin/content/publish-history/:auditId/rollback", { preHandler: requireAdmin }, async (request, reply) => {
  const { auditId } = request.params as { auditId: string };
  const result = contentBuilder.rollbackToAudit(auditId, "admin");
  if (!result.ok) {
    if (result.errors.some((err) => err.includes("not found"))) {
      sendHttpError(reply, 404, "Audit entry not found", "ADMIN_CONTENT_AUDIT_NOT_FOUND");
      return;
    }
    reply.code(400).send(result);
    return;
  }
  try {
    await persistLatestContentAudit();
  } catch (error) {
    server.log.warn({ error }, "Failed to persist content rollback audit entry.");
  }
  return result;
});
server.get("/matches/:matchId/history", async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const data = matchmaking.getMatchHistory(matchId);
  if (!data) {
    reply.status(404);
    return { error: "Match not found" };
  }
  return data;
});

server.get("/matches/:matchId/replay", async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const { from } = request.query as { from?: string };
  const base = matchmaking.getMatchHistory(matchId);
  if (!base) {
    reply.status(404);
    return { error: "Match not found" };
  }
  const fromSequence = from ? Number(from) : 0;
  return {
    matchId,
    fromSequence,
    events: matchmaking.getReplayEvents(matchId, Number.isFinite(fromSequence) ? fromSequence : 0)
  };
});

server.register(async (instance) => {
  instance.get(
    "/ws",
    { websocket: true },
    (socket, request) => {
      let playerId: string | null = null;
      const sessionAccountId = playerIdentity.readSessionAccountId(request);

      socket.on("message", async (raw: unknown) => {
        try {
          const payload =
            typeof raw === "string"
              ? raw
              : Buffer.isBuffer(raw)
                ? raw.toString()
                : Array.isArray(raw)
                  ? Buffer.concat(raw as Buffer[]).toString()
                  : Buffer.from(raw as ArrayBuffer).toString();
          const msg = JSON.parse(payload) as ClientIntent;
          if (msg.type === "RECONNECT") {
            if (playerId) return;
            const ok = matchmaking.reconnect(msg.playerId, socket, msg.name, (msg as { matchId?: string }).matchId);
            if (!ok) {
              sendWsError(socket, "Reconnect failed, please join a new match.", "RECONNECT_FAILED");
              return;
            }
            playerId = msg.playerId;
            return;
          }
          if (msg.type === "JOIN_MATCH" || msg.type === "QUICK_MATCH") {
            if (playerId) return;
            playerId = await matchmaking.joinQuick(msg.name, socket, msg.region, msg.mmr, sessionAccountId ?? undefined);
            return;
          }
          if (msg.type === "JOIN_LOBBY") {
            if (playerId) return;
            playerId = matchmaking.joinLobby(msg.name, msg.matchId, socket, sessionAccountId ?? undefined);
            return;
          }
          if (msg.type === "CREATE_PRIVATE_MATCH") {
            if (playerId) return;
            playerId = matchmaking.createPrivate(
              msg.name,
              socket,
              msg.maxPlayers,
              msg.region,
              msg.mmr,
              sessionAccountId ?? undefined
            );
            return;
          }
          if (msg.type === "JOIN_PRIVATE_MATCH") {
            if (playerId) return;
            playerId = matchmaking.joinPrivate(msg.name, msg.inviteCode, socket, sessionAccountId ?? undefined);
            return;
          }
          if (!playerId) {
            sendWsError(socket, "Please join first.", "JOIN_FIRST_REQUIRED");
            return;
          }
          matchmaking.handleIntent(playerId, msg);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid message format.";
          const errorCode = error instanceof Error ? mapErrorCode(error) : "INVALID_MESSAGE_FORMAT";
          sendWsError(socket, message, errorCode);
          instance.log.error(error);
        }
      });

      socket.on("close", () => {
        if (playerId) matchmaking.disconnect(playerId);
      });
    }
  );
});

server.addHook("onClose", async () => {
  await playerProfiles.close();
});

const port = Number(process.env.PORT ?? 3001);
await server.listen({ port, host: "0.0.0.0" });
server.log.info(`Runebrawl server listening on ${port}`);
