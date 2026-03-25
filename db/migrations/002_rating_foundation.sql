-- Rating foundation v1:
-- - keep matchmaking signal in hidden mmr
-- - support visible ladder progression independently
-- - persist per-match rating deltas for audit/recompute

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'FFA',
  ADD COLUMN IF NOT EXISTS seed BIGINT,
  ADD COLUMN IF NOT EXISTS balance_version TEXT;

CREATE TABLE IF NOT EXISTS player_ratings (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  mmr_hidden INTEGER NOT NULL DEFAULT 1000,
  rank_points INTEGER NOT NULL DEFAULT 0,
  rank_tier TEXT NOT NULL DEFAULT 'UNRANKED',
  provisional_games INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (mmr_hidden >= 0),
  CHECK (rank_points >= 0),
  CHECK (provisional_games >= 0)
);

CREATE TABLE IF NOT EXISTS match_results (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  placement INTEGER NOT NULL,
  mmr_before INTEGER NOT NULL,
  mmr_after INTEGER NOT NULL,
  mmr_delta INTEGER NOT NULL,
  rank_points_before INTEGER NOT NULL,
  rank_points_after INTEGER NOT NULL,
  rank_points_delta INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id),
  CHECK (placement > 0)
);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player_id ON match_results(player_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_hidden_mmr ON player_ratings(mmr_hidden DESC);
CREATE INDEX IF NOT EXISTS idx_player_ratings_rank_points ON player_ratings(rank_points DESC);
