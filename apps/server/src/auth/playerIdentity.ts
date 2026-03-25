import { createHmac, randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

const PLAYER_COOKIE = "rb_player_session";
const PLAYER_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

interface SessionPayload {
  accountId: string;
  exp: number;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function normalizeAccountId(value: string): string {
  return value.trim().toLowerCase();
}

export class PlayerIdentityService {
  private env: NodeJS.ProcessEnv;
  private resolvedSecret: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env;
    this.resolvedSecret = this.resolveSecret();
  }

  private get secret(): string {
    return this.resolvedSecret;
  }

  private get secureCookies(): boolean {
    return this.env.NODE_ENV === "production";
  }

  createOrRefreshSession(request: FastifyRequest, reply: FastifyReply, requestedAccountId?: string): string {
    const current = this.readSessionAccountId(request);
    const normalizedRequested = requestedAccountId ? normalizeAccountId(requestedAccountId) : "";
    const accountId = normalizedRequested || current || randomUUID();
    this.writeSessionCookie(reply, accountId);
    return accountId;
  }

  readSessionAccountId(request: FastifyRequest): string | null {
    const token = request.cookies[PLAYER_COOKIE];
    if (!token) return null;
    return this.verifyToken(token);
  }

  private writeSessionCookie(reply: FastifyReply, accountId: string): void {
    const payload: SessionPayload = {
      accountId,
      exp: Date.now() + PLAYER_SESSION_TTL_MS
    };
    const payloadJson = JSON.stringify(payload);
    const payloadEncoded = toBase64Url(payloadJson);
    const signature = this.sign(payloadEncoded);
    const token = `${payloadEncoded}.${signature}`;

    reply.setCookie(PLAYER_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookies,
      maxAge: Math.floor(PLAYER_SESSION_TTL_MS / 1000)
    });
  }

  private verifyToken(token: string): string | null {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex <= 0) return null;
    const payloadEncoded = token.slice(0, dotIndex);
    const receivedSignature = token.slice(dotIndex + 1);
    const expectedSignature = this.sign(payloadEncoded);
    if (receivedSignature !== expectedSignature) return null;
    try {
      const payload = JSON.parse(fromBase64Url(payloadEncoded)) as SessionPayload;
      if (!payload.accountId || !payload.exp) return null;
      if (payload.exp <= Date.now()) return null;
      return normalizeAccountId(payload.accountId);
    } catch {
      return null;
    }
  }

  private sign(payloadEncoded: string): string {
    return createHmac("sha256", this.secret).update(payloadEncoded).digest("base64url");
  }

  private resolveSecret(): string {
    const configured = this.env.PLAYER_SESSION_SECRET?.trim() ?? "";
    if (configured.length > 0) return configured;
    if (this.env.NODE_ENV === "production") {
      throw new Error("PLAYER_SESSION_SECRET is required in production.");
    }
    return "runebrawl-dev-player-secret";
  }
}

