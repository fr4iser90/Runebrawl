import { createHash } from "node:crypto";
import { Pool } from "pg";
import type {
  PlayerRatingRecord,
  RatingUpdateInput,
  RatingUpdateOutput,
  VisibleRankTier
} from "./types.js";
import type { RatingService } from "./service.js";

interface MutableRating {
  playerId: string;
  mmrHidden: number;
  rankPoints: number;
  rankTier: VisibleRankTier;
  provisionalGames: number;
  updatedAt: string;
}

const DEFAULT_MMR = 1000;
const DEFAULT_RANK_POINTS = 0;
const PROVISIONAL_GAMES = 10;

function expectedScore(aMmr: number, bMmr: number): number {
  return 1 / (1 + 10 ** ((bMmr - aMmr) / 400));
}

function placementToActualScore(placement: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 0.5;
  return Math.max(0, Math.min(1, (totalPlayers - placement) / (totalPlayers - 1)));
}

function rankTierFromPoints(points: number): VisibleRankTier {
  if (points >= 2600) return "MASTER";
  if (points >= 2000) return "DIAMOND";
  if (points >= 1500) return "PLATINUM";
  if (points >= 1000) return "GOLD";
  if (points >= 500) return "SILVER";
  if (points > 0) return "BRONZE";
  return "UNRANKED";
}

function stableUuidFromString(value: string): string {
  const hex = createHash("md5").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function asNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

export class SqlRatingService implements RatingService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async applyMatchResult(input: RatingUpdateInput): Promise<RatingUpdateOutput> {
    const participants = [...input.placements].sort((a, b) => a.placement - b.placement);
    const totalPlayers = participants.length;
    const matchUuid = stableUuidFromString(`match:${input.matchId}`);
    const playerUuidById = new Map<string, string>();
    for (const participant of participants) {
      playerUuidById.set(participant.playerId, stableUuidFromString(`player:${participant.playerId}`));
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const alreadyRated = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM match_results WHERE match_id = $1",
        [matchUuid]
      );
      if (asNumber(alreadyRated.rows[0]?.count ?? 0) > 0) {
        const existingRows = await client.query<{
          player_id: string;
          mmr_before: number;
          mmr_after: number;
          mmr_delta: number;
          rank_points_before: number;
          rank_points_after: number;
          rank_points_delta: number;
        }>(
          `SELECT player_id, mmr_before, mmr_after, mmr_delta, rank_points_before, rank_points_after, rank_points_delta
           FROM match_results
           WHERE match_id = $1`,
          [matchUuid]
        );
        const playerIdByUuid = new Map<string, string>();
        for (const [playerId, playerUuid] of playerUuidById.entries()) {
          playerIdByUuid.set(playerUuid, playerId);
        }
        const updates: RatingUpdateOutput["updates"] = existingRows.rows
          .map((row) => {
            const playerId = playerIdByUuid.get(row.player_id);
            if (!playerId) return null;
            return {
              playerId,
              mmrBefore: asNumber(row.mmr_before),
              mmrAfter: asNumber(row.mmr_after),
              mmrDelta: asNumber(row.mmr_delta),
              rankPointsBefore: asNumber(row.rank_points_before),
              rankPointsAfter: asNumber(row.rank_points_after),
              rankPointsDelta: asNumber(row.rank_points_delta)
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        await client.query("COMMIT");
        return {
          matchId: input.matchId,
          mode: input.mode,
          updates
        };
      }

      await client.query(
        `INSERT INTO matches (id, status, round, mode, ended_at)
         VALUES ($1::uuid, 'FINISHED', 1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET status = 'FINISHED', mode = EXCLUDED.mode, ended_at = NOW()`,
        [matchUuid, input.mode]
      );

      for (const participant of participants) {
        const playerUuid = playerUuidById.get(participant.playerId);
        if (!playerUuid) continue;
        await client.query(
          `INSERT INTO players (id, display_name)
           VALUES ($1::uuid, $2)
           ON CONFLICT (id) DO NOTHING`,
          [playerUuid, participant.playerId]
        );
        await client.query(
          `INSERT INTO player_ratings (player_id)
           VALUES ($1::uuid)
           ON CONFLICT (player_id) DO NOTHING`,
          [playerUuid]
        );
      }

      const ratingRows = await client.query<{
        player_id: string;
        mmr_hidden: number;
        rank_points: number;
        rank_tier: VisibleRankTier;
        provisional_games: number;
        updated_at: string;
      }>(
        `SELECT player_id, mmr_hidden, rank_points, rank_tier, provisional_games, updated_at
         FROM player_ratings
         WHERE player_id = ANY($1::uuid[])`,
        [[...playerUuidById.values()]]
      );

      const mutableRatings = new Map<string, MutableRating>();
      for (const row of ratingRows.rows) {
        const playerId =
          [...playerUuidById.entries()].find(([, playerUuid]) => playerUuid === row.player_id)?.[0] ?? null;
        if (!playerId) continue;
        mutableRatings.set(playerId, {
          playerId,
          mmrHidden: asNumber(row.mmr_hidden),
          rankPoints: asNumber(row.rank_points),
          rankTier: row.rank_tier,
          provisionalGames: asNumber(row.provisional_games),
          updatedAt: row.updated_at
        });
      }
      for (const participant of participants) {
        if (!mutableRatings.has(participant.playerId)) {
          mutableRatings.set(participant.playerId, {
            playerId: participant.playerId,
            mmrHidden: DEFAULT_MMR,
            rankPoints: DEFAULT_RANK_POINTS,
            rankTier: "UNRANKED",
            provisionalGames: 0,
            updatedAt: new Date().toISOString()
          });
        }
      }

      const updates: RatingUpdateOutput["updates"] = [];
      for (const participant of participants) {
        const current = mutableRatings.get(participant.playerId);
        if (!current) continue;
        const mmrBefore = current.mmrHidden;
        const rankPointsBefore = current.rankPoints;

        let expected = 0;
        const opponents = participants.filter((p) => p.playerId !== participant.playerId);
        if (opponents.length > 0) {
          for (const opponent of opponents) {
            const oppRating = mutableRatings.get(opponent.playerId);
            if (!oppRating) continue;
            expected += expectedScore(mmrBefore, oppRating.mmrHidden);
          }
          expected /= opponents.length;
        } else {
          expected = 0.5;
        }

        const actual = placementToActualScore(participant.placement, totalPlayers);
        const kFactor = current.provisionalGames < PROVISIONAL_GAMES ? 48 : 24;
        const mmrDelta = Math.round(kFactor * (actual - expected));
        const mmrAfter = Math.max(0, mmrBefore + mmrDelta);
        const rankPointsDelta = participant.placement <= Math.ceil(totalPlayers / 2) ? 8 : -8;
        const rankPointsAfter = Math.max(0, rankPointsBefore + rankPointsDelta);

        current.mmrHidden = mmrAfter;
        current.rankPoints = rankPointsAfter;
        current.rankTier = rankTierFromPoints(rankPointsAfter);
        current.provisionalGames += 1;
        current.updatedAt = new Date().toISOString();

        updates.push({
          playerId: participant.playerId,
          mmrBefore,
          mmrAfter,
          mmrDelta,
          rankPointsBefore,
          rankPointsAfter,
          rankPointsDelta
        });
      }

      for (const update of updates) {
        const playerUuid = playerUuidById.get(update.playerId);
        const participant = participants.find((p) => p.playerId === update.playerId);
        const current = mutableRatings.get(update.playerId);
        if (!playerUuid || !participant || !current) continue;

        await client.query(
          `UPDATE player_ratings
           SET mmr_hidden = $2,
               rank_points = $3,
               rank_tier = $4,
               provisional_games = $5,
               updated_at = NOW()
           WHERE player_id = $1::uuid`,
          [playerUuid, current.mmrHidden, current.rankPoints, current.rankTier, current.provisionalGames]
        );

        await client.query(
          `INSERT INTO match_results (
             match_id, player_id, placement, mmr_before, mmr_after, mmr_delta, rank_points_before, rank_points_after, rank_points_delta
           )
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (match_id, player_id) DO NOTHING`,
          [
            matchUuid,
            playerUuid,
            participant.placement,
            update.mmrBefore,
            update.mmrAfter,
            update.mmrDelta,
            update.rankPointsBefore,
            update.rankPointsAfter,
            update.rankPointsDelta
          ]
        );
      }

      await client.query("COMMIT");
      return {
        matchId: input.matchId,
        mode: input.mode,
        updates
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPlayerRating(playerId: string): Promise<PlayerRatingRecord | null> {
    const playerUuid = stableUuidFromString(`player:${playerId}`);
    const result = await this.pool.query<{
      player_id: string;
      mmr_hidden: number;
      rank_points: number;
      rank_tier: VisibleRankTier;
      provisional_games: number;
      updated_at: string;
    }>(
      `SELECT player_id, mmr_hidden, rank_points, rank_tier, provisional_games, updated_at
       FROM player_ratings
       WHERE player_id = $1::uuid
       LIMIT 1`,
      [playerUuid]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      playerId,
      mmrHidden: asNumber(row.mmr_hidden),
      rankPoints: asNumber(row.rank_points),
      rankTier: row.rank_tier,
      provisionalGames: asNumber(row.provisional_games),
      updatedAt: row.updated_at
    };
  }

  async getLeaderboard(limit = 50): Promise<PlayerRatingRecord[]> {
    const boundedLimit = Math.max(1, Math.min(200, limit));
    const rows = await this.pool.query<{
      player_id: string;
      mmr_hidden: number;
      rank_points: number;
      rank_tier: VisibleRankTier;
      provisional_games: number;
      updated_at: string;
      display_name: string;
    }>(
      `SELECT pr.player_id, pr.mmr_hidden, pr.rank_points, pr.rank_tier, pr.provisional_games, pr.updated_at, p.display_name
       FROM player_ratings pr
       JOIN players p ON p.id = pr.player_id
       ORDER BY pr.rank_points DESC, pr.mmr_hidden DESC
       LIMIT $1`,
      [boundedLimit]
    );
    return rows.rows.map((row) => ({
      playerId: row.display_name,
      mmrHidden: asNumber(row.mmr_hidden),
      rankPoints: asNumber(row.rank_points),
      rankTier: row.rank_tier,
      provisionalGames: asNumber(row.provisional_games),
      updatedAt: row.updated_at
    }));
  }
}

