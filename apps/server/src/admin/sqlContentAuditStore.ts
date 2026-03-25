import { Pool } from "pg";
import type { ContentBuilderService, ContentPublishHistoryRecord, ContentSnapshot } from "./contentBuilderService.js";

interface AuditHistoryRow {
  audit_id: string;
  at_ms: string | number;
  actor: string;
  action: "PUBLISH" | "ROLLBACK";
  source: "MANUAL_DRAFT" | "COMMUNITY_SUBMISSION" | "ROLLBACK";
  submission_id: string | null;
  rollback_to_audit_id: string | null;
  from_version: number;
  to_version: number;
  units_count: number;
  heroes_count: number;
  snapshot_version: number;
  snapshot_updated_at_ms: string | number;
  units_json: unknown;
  heroes_json: unknown;
}

function asNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function isSnapshotShape(snapshot: ContentSnapshot): boolean {
  return Array.isArray(snapshot.units) && Array.isArray(snapshot.heroes) && Number.isFinite(snapshot.version) && Number.isFinite(snapshot.updatedAt);
}

export class SqlContentAuditStore {
  private readonly pool: Pool | null;

  constructor(connectionString?: string) {
    this.pool = connectionString ? new Pool({ connectionString }) : null;
  }

  get enabled(): boolean {
    return this.pool !== null;
  }

  async close(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
  }

  async hydrateBuilder(builder: ContentBuilderService): Promise<void> {
    if (!this.pool) return;
    const result = await this.pool.query<AuditHistoryRow>(
      `SELECT
         audit_id,
         (EXTRACT(EPOCH FROM at) * 1000)::bigint AS at_ms,
         actor,
         action,
         source,
         submission_id,
         rollback_to_audit_id,
         from_version,
         to_version,
         units_count,
         heroes_count,
         snapshot_version,
         snapshot_updated_at_ms,
         units_json,
         heroes_json
       FROM content_publish_audit
       ORDER BY at ASC`
    );
    const records: ContentPublishHistoryRecord[] = [];
    for (const row of result.rows) {
      const snapshot: ContentSnapshot = {
        units: (row.units_json as ContentSnapshot["units"]) ?? [],
        heroes: (row.heroes_json as ContentSnapshot["heroes"]) ?? [],
        version: asNumber(row.snapshot_version),
        updatedAt: asNumber(row.snapshot_updated_at_ms)
      };
      if (!isSnapshotShape(snapshot)) continue;
      records.push({
        audit: {
          auditId: row.audit_id,
          at: asNumber(row.at_ms),
          actor: row.actor,
          action: row.action,
          source: row.source,
          submissionId: row.submission_id ?? undefined,
          rollbackToAuditId: row.rollback_to_audit_id ?? undefined,
          fromVersion: asNumber(row.from_version),
          toVersion: asNumber(row.to_version),
          unitsCount: asNumber(row.units_count),
          heroesCount: asNumber(row.heroes_count)
        },
        snapshot
      });
    }
    if (records.length > 0) {
      builder.hydratePublishHistory(records);
    }
  }

  async persistLatestFromBuilder(builder: ContentBuilderService): Promise<void> {
    if (!this.pool) return;
    const latest = builder.getPublishHistoryRecords(1)[0];
    if (!latest) return;
    await this.pool.query(
      `INSERT INTO content_publish_audit (
         audit_id,
         at,
         actor,
         action,
         source,
         submission_id,
         rollback_to_audit_id,
         from_version,
         to_version,
         units_count,
         heroes_count,
         snapshot_version,
         snapshot_updated_at_ms,
         units_json,
         heroes_json
       ) VALUES (
         $1,
         TO_TIMESTAMP($2::double precision / 1000.0),
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         $10,
         $11,
         $12,
         $13,
         $14::jsonb,
         $15::jsonb
       )
       ON CONFLICT (audit_id) DO NOTHING`,
      [
        latest.audit.auditId,
        latest.audit.at,
        latest.audit.actor,
        latest.audit.action,
        latest.audit.source,
        latest.audit.submissionId ?? null,
        latest.audit.rollbackToAuditId ?? null,
        latest.audit.fromVersion,
        latest.audit.toVersion,
        latest.audit.unitsCount,
        latest.audit.heroesCount,
        latest.snapshot.version,
        latest.snapshot.updatedAt,
        JSON.stringify(latest.snapshot.units),
        JSON.stringify(latest.snapshot.heroes)
      ]
    );
  }
}

