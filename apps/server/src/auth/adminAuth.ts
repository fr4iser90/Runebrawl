import type { FastifyReply, FastifyRequest } from "fastify";
import { nanoid } from "nanoid";

const COOKIE_NAME = "rb_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface AdminSession {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

export class AdminAuthService {
  private sessions = new Map<string, AdminSession>();

  private get expectedUsername(): string {
    return process.env.ADMIN_USERNAME ?? "admin";
  }

  private get expectedPassword(): string {
    return process.env.ADMIN_PASSWORD ?? "change-me";
  }

  private get secureCookies(): boolean {
    return process.env.NODE_ENV === "production";
  }

  login(username: string, password: string, reply: FastifyReply): boolean {
    this.cleanupExpiredSessions();
    if (username !== this.expectedUsername || password !== this.expectedPassword) {
      return false;
    }
    const sessionId = nanoid(32);
    const now = Date.now();
    this.sessions.set(sessionId, {
      sessionId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS
    });
    reply.setCookie(COOKIE_NAME, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookies,
      maxAge: Math.floor(SESSION_TTL_MS / 1000)
    });
    return true;
  }

  logout(request: FastifyRequest, reply: FastifyReply): void {
    const sessionId = request.cookies[COOKIE_NAME];
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
    reply.clearCookie(COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookies
    });
  }

  isAuthenticated(request: FastifyRequest): boolean {
    this.cleanupExpiredSessions();
    const sessionId = request.cookies[COOKIE_NAME];
    if (!sessionId) return false;
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  ensureAdmin(request: FastifyRequest): void {
    if (!this.isAuthenticated(request)) {
      throw new Error("Unauthorized");
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
