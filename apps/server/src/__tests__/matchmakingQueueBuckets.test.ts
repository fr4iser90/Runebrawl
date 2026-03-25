import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchmakingService } from "../matchmakingService.js";

function makeSocket() {
  return {
    send: vi.fn<(data: string) => void>()
  };
}

function stopService(service: MatchmakingService): void {
  service.shutdown();
}

describe("matchmaking queue MMR bucketing", () => {
  const services: MatchmakingService[] = [];

  afterEach(() => {
    for (const service of services) {
      stopService(service);
    }
    services.length = 0;
  });

  it("uses requested MMR as fallback for new players", async () => {
    const service = new MatchmakingService();
    services.push(service);

    await service.joinQuick("Fresh Player", makeSocket(), "EU", 1450);
    const openLobbies = service.listOpenLobbies();
    expect(openLobbies.length).toBe(1);
    expect(openLobbies[0].mmrBucket).toBe("high");
  });

  it("uses server-side rating lookup and keeps bucketing stable for same account id", async () => {
    const service = new MatchmakingService();
    services.push(service);

    const ratingService = (service as unknown as {
      ratingService: {
        applyMatchResult: (input: {
          matchId: string;
          mode: "FFA";
          placements: Array<{ playerId: string; placement: number }>;
        }) => Promise<unknown>;
      };
    }).ratingService;

    await ratingService.applyMatchResult({
      matchId: "seed_queue_bucket",
      mode: "FFA",
      placements: [
        { playerId: "acct:acc-123", placement: 1 },
        { playerId: "name:seed_opp", placement: 2 }
      ]
    });

    await service.joinQuick("Pro Player", makeSocket(), "EU", 2000, "acc-123");
    await service.joinQuick("Different Display Name", makeSocket(), "EU", 200, "acc-123");

    const openLobbies = service.listOpenLobbies();
    expect(openLobbies.length).toBe(1);
    expect(openLobbies[0].mmrBucket).toBe("mid");
    expect(openLobbies[0].currentPlayers).toBe(2);
  });

  it("falls back to name identity when account id is missing", async () => {
    const service = new MatchmakingService();
    services.push(service);

    const ratingService = (service as unknown as {
      ratingService: {
        applyMatchResult: (input: {
          matchId: string;
          mode: "FFA";
          placements: Array<{ playerId: string; placement: number }>;
        }) => Promise<unknown>;
      };
    }).ratingService;

    await ratingService.applyMatchResult({
      matchId: "seed_queue_bucket_name_fallback",
      mode: "FFA",
      placements: [
        { playerId: "name:legacy player", placement: 1 },
        { playerId: "name:legacy_opp", placement: 2 }
      ]
    });

    await service.joinQuick("Legacy Player", makeSocket(), "EU", 200);
    const openLobbies = service.listOpenLobbies();
    expect(openLobbies.length).toBe(1);
    expect(openLobbies[0].mmrBucket).toBe("mid");
  });
});

