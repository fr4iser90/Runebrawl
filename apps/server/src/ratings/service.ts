import type { PlayerRatingRecord, RatingUpdateInput, RatingUpdateOutput } from "./types.js";

export interface RatingService {
  applyMatchResult(input: RatingUpdateInput): Promise<RatingUpdateOutput>;
  getPlayerRating(playerId: string): Promise<PlayerRatingRecord | null>;
  getLeaderboard(limit?: number): Promise<PlayerRatingRecord[]>;
}

