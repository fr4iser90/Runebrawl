import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { ClientIntent } from "@runebrawl/shared";
import { GameManager } from "./gameManager.js";

const server = Fastify({ logger: true });
const game = new GameManager();

await server.register(websocket);

server.get("/health", async () => ({ ok: true }));
server.get("/matches/:matchId/history", async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const data = game.getMatchHistory(matchId);
  if (!data) {
    reply.status(404);
    return { error: "Match not found" };
  }
  return data;
});

server.get("/matches/:matchId/replay", async (request, reply) => {
  const { matchId } = request.params as { matchId: string };
  const { from } = request.query as { from?: string };
  const base = game.getMatchHistory(matchId);
  if (!base) {
    reply.status(404);
    return { error: "Match not found" };
  }
  const fromSequence = from ? Number(from) : 0;
  return {
    matchId,
    fromSequence,
    events: game.getReplayEvents(matchId, Number.isFinite(fromSequence) ? fromSequence : 0)
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
            const ok = game.reconnect(msg.playerId, socket, msg.name);
            if (!ok) {
              socket.send(JSON.stringify({ type: "ERROR", message: "Reconnect failed, please join a new match." }));
              return;
            }
            playerId = msg.playerId;
            return;
          }
          if (msg.type === "JOIN_MATCH") {
            if (playerId) return;
            playerId = game.join(msg.name, socket);
            return;
          }
          if (!playerId) {
            socket.send(JSON.stringify({ type: "ERROR", message: "Please join first." }));
            return;
          }
          game.handleIntent(playerId, msg);
        } catch (error) {
          socket.send(JSON.stringify({ type: "ERROR", message: "Invalid message format." }));
          instance.log.error(error);
        }
      });

      socket.on("close", () => {
        if (playerId) game.disconnect(playerId);
      });
    }
  );
});

const port = Number(process.env.PORT ?? 3001);
await server.listen({ port, host: "0.0.0.0" });
server.log.info(`Runebrawl server listening on ${port}`);
