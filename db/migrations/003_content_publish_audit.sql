-- Content publish audit persistence:
-- - stores publish/rollback audit trail
-- - stores full runtime snapshots for deterministic rollback after restart

CREATE TABLE IF NOT EXISTS content_publish_audit (
  id BIGSERIAL PRIMARY KEY,
  audit_id TEXT NOT NULL UNIQUE,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  source TEXT NOT NULL,
  submission_id TEXT,
  rollback_to_audit_id TEXT,
  from_version INTEGER NOT NULL,
  to_version INTEGER NOT NULL,
  units_count INTEGER NOT NULL,
  heroes_count INTEGER NOT NULL,
  snapshot_version INTEGER NOT NULL,
  snapshot_updated_at_ms BIGINT NOT NULL,
  units_json JSONB NOT NULL,
  heroes_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_publish_audit_at ON content_publish_audit(at DESC);
