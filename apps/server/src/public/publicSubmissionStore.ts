import { Pool } from "pg";
import type { HeroDefinition, UnitDefinition } from "@runebrawl/shared";

export type PublicSubmissionStatus =
  | "pending_validation"
  | "pending_review"
  | "rejected"
  | "imported"
  | "published"
  | "withdrawn";

export interface SubmissionMetadata {
  packId: string;
  title: string;
  author: string;
  version: string;
  description: string;
  targetGameVersion: string;
  tags: string[];
  notes?: string;
}

export interface PublicSubmissionListRow {
  id: string;
  packId: string;
  status: PublicSubmissionStatus;
  authorDisplay: string;
  title: string;
  description: string;
  validationOk: boolean;
  voteScore: number;
  voteCount: number;
  createdAt: number;
}

export interface PublicSubmissionDetail extends PublicSubmissionListRow {
  metadata: SubmissionMetadata;
  units: UnitDefinition[];
  heroes: HeroDefinition[];
  validationErrors: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.map((e) => (typeof e === "string" ? e : null));
  if (out.some((e) => e === null)) return null;
  return out as string[];
}

const snakeCaseId = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function parseSubmissionMetadata(value: unknown): { ok: true; metadata: SubmissionMetadata } | { ok: false; error: string } {
  if (!isObject(value)) return { ok: false, error: "metadata must be an object" };
  const tags = asStringArray(value.tags);
  if (tags === null) return { ok: false, error: "metadata.tags must be an array of strings" };
  const required = ["packId", "title", "author", "version", "description", "targetGameVersion"] as const;
  for (const key of required) {
    if (typeof value[key] !== "string" || !(value[key] as string).trim()) {
      return { ok: false, error: `metadata.${key} is required` };
    }
  }
  const packId = value.packId as string;
  if (!snakeCaseId.test(packId.trim())) {
    return { ok: false, error: "metadata.packId must be lowercase snake_case" };
  }
  return {
    ok: true,
    metadata: {
      packId: packId.trim(),
      title: (value.title as string).trim(),
      author: (value.author as string).trim(),
      version: (value.version as string).trim(),
      description: (value.description as string).trim(),
      targetGameVersion: (value.targetGameVersion as string).trim(),
      tags,
      notes: typeof value.notes === "string" ? value.notes : undefined
    }
  };
}

function asNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

export class PublicSubmissionStore {
  private readonly pool: Pool | null;

  constructor(connectionString?: string) {
    this.pool = connectionString?.trim() ? new Pool({ connectionString }) : null;
  }

  get enabled(): boolean {
    return this.pool !== null;
  }

  async close(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
  }

  async createSubmission(args: {
    metadata: SubmissionMetadata;
    units: UnitDefinition[];
    heroes: HeroDefinition[];
    validationOk: boolean;
    validationErrors: string[];
  }): Promise<{ id: string }> {
    if (!this.pool) throw new Error("PublicSubmissionStore disabled");
    const status: PublicSubmissionStatus = args.validationOk ? "pending_review" : "pending_validation";
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO content_public_submission (
        pack_id, status, author_display, title, description,
        metadata_json, units_json, heroes_json, validation_ok, validation_errors
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10::jsonb)
      RETURNING id::text AS id`,
      [
        args.metadata.packId,
        status,
        args.metadata.author,
        args.metadata.title,
        args.metadata.description.slice(0, 2000),
        JSON.stringify(args.metadata),
        JSON.stringify(args.units),
        JSON.stringify(args.heroes),
        args.validationOk,
        JSON.stringify(args.validationErrors)
      ]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Insert failed");
    return { id: row.id };
  }

  async listSubmissions(options: {
    /** If true, do not filter by status (admin). */
    listAll?: boolean;
    statusIn?: PublicSubmissionStatus[];
    validOnly?: boolean;
    limit?: number;
  }): Promise<PublicSubmissionListRow[]> {
    if (!this.pool) return [];
    const limit = Math.max(1, Math.min(100, options.limit ?? 50));
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (options.listAll) {
      // no status filter
    } else if (options.statusIn && options.statusIn.length > 0) {
      conditions.push(`s.status = ANY($${i}::text[])`);
      params.push(options.statusIn);
      i += 1;
    } else {
      conditions.push(`s.status IN ('pending_review', 'pending_validation')`);
    }

    if (options.validOnly) {
      conditions.push(`s.validation_ok = true`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);
    const limitPlaceholder = `$${i}`;

    const result = await this.pool.query<{
      id: string;
      pack_id: string;
      status: PublicSubmissionStatus;
      author_display: string;
      title: string;
      description: string;
      validation_ok: boolean;
      created_at: Date;
      vote_score: string | null;
      vote_count: string | null;
    }>(
      `SELECT
         s.id::text AS id,
         s.pack_id,
         s.status,
         s.author_display,
         s.title,
         s.description,
         s.validation_ok,
         s.created_at,
         COALESCE(SUM(v.value), 0)::text AS vote_score,
         COUNT(v.id)::text AS vote_count
       FROM content_public_submission s
       LEFT JOIN content_public_vote v ON v.submission_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY COALESCE(SUM(v.value), 0) DESC, s.created_at DESC
       LIMIT ${limitPlaceholder}`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      packId: row.pack_id,
      status: row.status,
      authorDisplay: row.author_display,
      title: row.title,
      description: row.description,
      validationOk: row.validation_ok,
      voteScore: Number.parseInt(row.vote_score ?? "0", 10) || 0,
      voteCount: Number.parseInt(row.vote_count ?? "0", 10) || 0,
      createdAt: row.created_at.getTime()
    }));
  }

  async getSubmission(id: string): Promise<PublicSubmissionDetail | null> {
    if (!this.pool) return null;
    const result = await this.pool.query<{
      id: string;
      pack_id: string;
      status: PublicSubmissionStatus;
      author_display: string;
      title: string;
      description: string;
      validation_ok: boolean;
      validation_errors: unknown;
      metadata_json: unknown;
      units_json: unknown;
      heroes_json: unknown;
      created_at: Date;
      vote_score: string | null;
      vote_count: string | null;
    }>(
      `SELECT
         s.id::text AS id,
         s.pack_id,
         s.status,
         s.author_display,
         s.title,
         s.description,
         s.validation_ok,
         s.validation_errors,
         s.metadata_json,
         s.units_json,
         s.heroes_json,
         s.created_at,
         (SELECT COALESCE(SUM(value), 0)::text FROM content_public_vote WHERE submission_id = s.id) AS vote_score,
         (SELECT COUNT(*)::text FROM content_public_vote WHERE submission_id = s.id) AS vote_count
       FROM content_public_submission s
       WHERE s.id = $1::uuid
       LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;

    const metadata = row.metadata_json as SubmissionMetadata;
    const units = row.units_json as UnitDefinition[];
    const heroes = row.heroes_json as HeroDefinition[];
    const validationErrors = Array.isArray(row.validation_errors)
      ? (row.validation_errors as string[])
      : typeof row.validation_errors === "string"
        ? [row.validation_errors]
        : [];

    return {
      id: row.id,
      packId: row.pack_id,
      status: row.status,
      authorDisplay: row.author_display,
      title: row.title,
      description: row.description,
      validationOk: row.validation_ok,
      voteScore: Number.parseInt(row.vote_score ?? "0", 10) || 0,
      voteCount: Number.parseInt(row.vote_count ?? "0", 10) || 0,
      createdAt: row.created_at.getTime(),
      metadata,
      units,
      heroes,
      validationErrors
    };
  }

  async castVote(submissionId: string, voterAccountId: string, value: 1 | -1): Promise<{ voteScore: number; voteCount: number }> {
    if (!this.pool) throw new Error("PublicSubmissionStore disabled");
    const voter = voterAccountId.trim().slice(0, 128);
    if (!voter) throw new Error("voter required");

    await this.pool.query(
      `INSERT INTO content_public_vote (submission_id, voter_account_id, value)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (submission_id, voter_account_id)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [submissionId, voter, value]
    );

    const agg = await this.pool.query<{ s: string | null; c: string | null }>(
      `SELECT
         COALESCE(SUM(value), 0)::text AS s,
         COUNT(*)::text AS c
       FROM content_public_vote
       WHERE submission_id = $1::uuid`,
      [submissionId]
    );
    const r = agg.rows[0];
    return {
      voteScore: Number.parseInt(r?.s ?? "0", 10) || 0,
      voteCount: Number.parseInt(r?.c ?? "0", 10) || 0
    };
  }
}
