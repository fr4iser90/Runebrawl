-- Public community pack suggestions (wizard upload) + advisory votes.
-- Admin still imports/publishes via existing builder; nothing auto-publishes from votes.

CREATE TABLE IF NOT EXISTS content_public_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL,
  status TEXT NOT NULL,
  author_display TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL,
  units_json JSONB NOT NULL,
  heroes_json JSONB NOT NULL,
  validation_ok BOOLEAN NOT NULL,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_public_submission_status_check CHECK (
    status IN (
      'pending_validation',
      'pending_review',
      'rejected',
      'imported',
      'published',
      'withdrawn'
    )
  )
);

-- At most one "open" submission per pack_id (rejected/withdrawn can be resubmitted with new row after status change).
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_public_submission_pack_open
  ON content_public_submission (pack_id)
  WHERE status IN ('pending_validation', 'pending_review');

CREATE INDEX IF NOT EXISTS idx_content_public_submission_status_created
  ON content_public_submission (status, created_at DESC);

CREATE TABLE IF NOT EXISTS content_public_vote (
  id BIGSERIAL PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES content_public_submission (id) ON DELETE CASCADE,
  voter_account_id TEXT NOT NULL,
  value SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_public_vote_value_check CHECK (value IN (-1, 1)),
  CONSTRAINT content_public_vote_unique_voter UNIQUE (submission_id, voter_account_id)
);

CREATE INDEX IF NOT EXISTS idx_content_public_vote_submission ON content_public_vote (submission_id);
