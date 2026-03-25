import { describe, expect, it } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PlayerIdentityService } from "../auth/playerIdentity.js";

function mockRequest(cookieValue?: string): FastifyRequest {
  return {
    cookies: cookieValue ? { rb_player_session: cookieValue } : {}
  } as FastifyRequest;
}

function mockReply() {
  let cookieName = "";
  let cookieValue = "";
  const reply = {
    setCookie: (name: string, value: string) => {
      cookieName = name;
      cookieValue = value;
      return reply;
    }
  } as unknown as FastifyReply;
  return {
    reply,
    readCookie: () => ({ name: cookieName, value: cookieValue })
  };
}

describe("player identity session", () => {
  it("creates and reuses signed account session cookie", () => {
    const service = new PlayerIdentityService();
    const first = mockReply();
    const accountId = service.createOrRefreshSession(mockRequest(), first.reply, "ACC-42");
    expect(accountId).toBe("acc-42");
    const cookie = first.readCookie();
    expect(cookie.name).toBe("rb_player_session");
    expect(cookie.value.length).toBeGreaterThan(20);

    const resolved = service.readSessionAccountId(mockRequest(cookie.value));
    expect(resolved).toBe("acc-42");
  });

  it("rejects tampered session cookie payload", () => {
    const service = new PlayerIdentityService();
    const first = mockReply();
    service.createOrRefreshSession(mockRequest(), first.reply, "acc-safe");
    const cookie = first.readCookie().value;
    const tampered = `${cookie}x`;
    const resolved = service.readSessionAccountId(mockRequest(tampered));
    expect(resolved).toBeNull();
  });

  it("requires PLAYER_SESSION_SECRET in production", () => {
    expect(() => new PlayerIdentityService({ NODE_ENV: "production" })).toThrow(
      "PLAYER_SESSION_SECRET is required in production."
    );
  });
});

