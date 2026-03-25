import type { PlayerRatingRecord, RatingUpdateInput, RatingUpdateOutput, VisibleRankTier } from "./types.js";
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

export class InMemoryRatingService implements RatingService {
  private ratings = new Map<string, MutableRating>();

  async applyMatchResult(input: RatingUpdateInput): Promise<RatingUpdateOutput> {
    const participants = [...input.placements].sort((a, b) => a.placement - b.placement);
    const totalPlayers = participants.length;
    const updates: RatingUpdateOutput["updates"] = [];

    for (const participant of participants) {
      const current = this.getOrCreateMutable(participant.playerId);
      const mmrBefore = current.mmrHidden;
      const rankPointsBefore = current.rankPoints;

      let expected = 0;
      const opponents = participants.filter((p) => p.playerId !== participant.playerId);
      if (opponents.length > 0) {
        for (const opponent of opponents) {
          const oppRating = this.getOrCreateMutable(opponent.playerId);
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

    return {
      matchId: input.matchId,
      mode: input.mode,
      updates
    };
  }

  async getPlayerRating(playerId: string): Promise<PlayerRatingRecord | null> {
    const current = this.ratings.get(playerId);
    if (!current) return null;
    return { ...current };
  }

  async getLeaderboard(limit = 50): Promise<PlayerRatingRecord[]> {
    return [...this.ratings.values()]
      .sort((a, b) => b.rankPoints - a.rankPoints || b.mmrHidden - a.mmrHidden)
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  private getOrCreateMutable(playerId: string): MutableRating {
    const existing = this.ratings.get(playerId);
    if (existing) return existing;
    const created: MutableRating = {
      playerId,
      mmrHidden: DEFAULT_MMR,
      rankPoints: DEFAULT_RANK_POINTS,
      rankTier: "UNRANKED",
      provisionalGames: 0,
      updatedAt: new Date().toISOString()
    };
    this.ratings.set(playerId, created);
    return created;
  }
}

