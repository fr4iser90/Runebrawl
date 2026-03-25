export type MatchMode = "FFA" | "TEAM_2V2" | "COMMANDER";

export type VisibleRankTier =
  | "UNRANKED"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MASTER";

export interface PlayerRatingRecord {
  playerId: string;
  mmrHidden: number;
  rankPoints: number;
  rankTier: VisibleRankTier;
  provisionalGames: number;
  updatedAt: string;
}

export interface MatchResultRecord {
  matchId: string;
  playerId: string;
  placement: number;
  mmrBefore: number;
  mmrAfter: number;
  mmrDelta: number;
  rankPointsBefore: number;
  rankPointsAfter: number;
  rankPointsDelta: number;
  createdAt: string;
}

export interface RatingUpdateInput {
  matchId: string;
  mode: MatchMode;
  placements: Array<{
    playerId: string;
    placement: number;
  }>;
}

export interface RatingUpdateOutput {
  matchId: string;
  mode: MatchMode;
  updates: Array<{
    playerId: string;
    mmrBefore: number;
    mmrAfter: number;
    mmrDelta: number;
    rankPointsBefore: number;
    rankPointsAfter: number;
    rankPointsDelta: number;
  }>;
}
