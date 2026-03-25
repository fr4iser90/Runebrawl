import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { SqlRatingService } from "../ratings/sqlRatingService.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeIfDb = testDatabaseUrl ? describe : describe.skip;

function stableUuidFromString(value: string): string {
  const hex = createHash("md5").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

describeIfDb("sql rating service contracts", () => {
  const runId = `sqlrt_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
  let adminPool: Pool;
  let service: SqlRatingService;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: testDatabaseUrl });
    service = new SqlRatingService(testDatabaseUrl as string);
    const migration1 = await readFile(new URL("../../../../db/migrations/001_initial_schema.sql", import.meta.url), "utf8");
    const migration2 = await readFile(new URL("../../../../db/migrations/002_rating_foundation.sql", import.meta.url), "utf8");
    await adminPool.query(migration1);
    await adminPool.query(migration2);
  });

  afterAll(async () => {
    await service.close();
    await adminPool.end();
  });

  it("applies one match result and serves player rating", async () => {
    const input = {
      matchId: `${runId}_m1`,
      mode: "FFA" as const,
      placements: [
        { playerId: `${runId}_alice`, placement: 1 },
        { playerId: `${runId}_bob`, placement: 2 },
        { playerId: `${runId}_cara`, placement: 3 },
        { playerId: `${runId}_dave`, placement: 4 }
      ]
    };
    const output = await service.applyMatchResult(input);
    expect(output.matchId).toBe(input.matchId);
    expect(output.updates).toHaveLength(4);
    const alice = await service.getPlayerRating(`${runId}_alice`);
    expect(alice).toBeTruthy();
    expect(alice?.provisionalGames).toBe(1);
    expect(alice?.rankPoints).toBeGreaterThan(0);
  });

  it("is idempotent for repeated apply on same match id", async () => {
    const input = {
      matchId: `${runId}_m2`,
      mode: "FFA" as const,
      placements: [
        { playerId: `${runId}_ida`, placement: 1 },
        { playerId: `${runId}_idb`, placement: 2 },
        { playerId: `${runId}_idc`, placement: 3 },
        { playerId: `${runId}_idd`, placement: 4 }
      ]
    };
    const first = await service.applyMatchResult(input);
    const second = await service.applyMatchResult(input);
    expect(second.updates).toHaveLength(first.updates.length);
    const ida = await service.getPlayerRating(`${runId}_ida`);
    expect(ida?.provisionalGames).toBe(1);

    const matchUuid = stableUuidFromString(`match:${input.matchId}`);
    const countRows = await adminPool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM match_results WHERE match_id = $1::uuid",
      [matchUuid]
    );
    expect(Number(countRows.rows[0]?.count ?? "0")).toBe(input.placements.length);
  });

  it("returns leaderboard ordered by rank points and mmr", async () => {
    const winner = `${runId}_lead_winner`;
    const loser = `${runId}_lead_loser`;
    await service.applyMatchResult({
      matchId: `${runId}_m3`,
      mode: "FFA",
      placements: [
        { playerId: winner, placement: 1 },
        { playerId: loser, placement: 2 }
      ]
    });

    const leaderboard = await service.getLeaderboard(200);
    const winnerIdx = leaderboard.findIndex((row) => row.playerId === winner);
    const loserIdx = leaderboard.findIndex((row) => row.playerId === loser);
    expect(winnerIdx).toBeGreaterThanOrEqual(0);
    expect(loserIdx).toBeGreaterThanOrEqual(0);
    expect(winnerIdx).toBeLessThan(loserIdx);
  });
});

