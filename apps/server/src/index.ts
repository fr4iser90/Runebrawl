import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { ClientIntent, ErrorCode, HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ContentBuilderService } from "./admin/contentBuilderService.js";
import { AdminAuthService } from "./auth/adminAuth.js";
import { MatchmakingService } from "./matchmakingService.js";

const server = Fastify({ logger: true });
const matchmaking = new MatchmakingService();
const adminAuth = new AdminAuthService();
const contentBuilder = new ContentBuilderService();

function sendWsError(socket: { send: (data: string) => void }, message: string, errorCode?: ErrorCode): void {
  socket.send(JSON.stringify({ type: "ERROR", message, errorCode }));
}

function sendHttpError(reply: FastifyReply, statusCode: number, error: string, errorCode: ErrorCode): void {
  reply.code(statusCode).send({ error, errorCode });
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

await server.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    const allowed =
      origin.startsWith("http://localhost:5173") ||
      origin.startsWith("http://127.0.0.1:5173") ||
      origin.startsWith("http://localhost:5174") ||
      origin.startsWith("http://127.0.0.1:5174");
    cb(null, allowed);
  },
  credentials: true
});
await server.register(cookie);
await server.register(websocket);

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!adminAuth.isAuthenticated(request)) {
    sendHttpError(reply, 401, "Unauthorized", "ADMIN_UNAUTHORIZED");
    return;
  }
}

server.get("/health", async () => ({ ok: true }));
server.get("/lobbies", async () => ({ lobbies: matchmaking.listOpenLobbies() }));
server.get("/auth/admin/status", async (request) => ({
  authenticated: adminAuth.isAuthenticated(request)
}));
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
    (socket) => {
      let playerId: string | null = null;

      socket.on("message", (raw: unknown) => {
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
            playerId = matchmaking.joinQuick(msg.name, socket, msg.region, msg.mmr);
            return;
          }
          if (msg.type === "JOIN_LOBBY") {
            if (playerId) return;
            playerId = matchmaking.joinLobby(msg.name, msg.matchId, socket);
            return;
          }
          if (msg.type === "CREATE_PRIVATE_MATCH") {
            if (playerId) return;
            playerId = matchmaking.createPrivate(msg.name, socket, msg.maxPlayers, msg.region, msg.mmr);
            return;
          }
          if (msg.type === "JOIN_PRIVATE_MATCH") {
            if (playerId) return;
            playerId = matchmaking.joinPrivate(msg.name, msg.inviteCode, socket);
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

const port = Number(process.env.PORT ?? 3001);
await server.listen({ port, host: "0.0.0.0" });
server.log.info(`Runebrawl server listening on ${port}`);
