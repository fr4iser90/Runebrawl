import { createHash } from "node:crypto";
import { Pool } from "pg";

interface PlayerProfile {
  accountId: string;
  displayName: string;
}

function stableUuidFromString(value: string): string {
  const hex = createHash("md5").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function normalizeAccountId(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDisplayName(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return "Guest";
  return trimmed.slice(0, 24);
}

export class PlayerProfileService {
  private readonly pool: Pool | null;
  private readonly memoryProfiles = new Map<string, string>();

  constructor(connectionString?: string) {
    const normalized = connectionString?.trim() ?? "";
    this.pool = normalized.length > 0 ? new Pool({ connectionString: normalized }) : null;
  }

  async close(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
  }

  async ensureProfile(accountId: string, preferredDisplayName?: string): Promise<PlayerProfile> {
    const normalizedAccountId = normalizeAccountId(accountId);
    const desiredDisplayName = normalizeDisplayName(preferredDisplayName);
    if (!this.pool) {
      const existing = this.memoryProfiles.get(normalizedAccountId);
      const displayName = existing ?? desiredDisplayName;
      this.memoryProfiles.set(normalizedAccountId, displayName);
      return { accountId: normalizedAccountId, displayName };
    }

    const playerUuid = stableUuidFromString(`player:${normalizedAccountId}`);
    await this.pool.query(
      `INSERT INTO players (id, display_name)
       VALUES ($1::uuid, $2)
       ON CONFLICT (id) DO UPDATE
       SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), players.display_name)`,
      [playerUuid, desiredDisplayName]
    );
    const row = await this.pool.query<{ display_name: string }>(
      `SELECT display_name
       FROM players
       WHERE id = $1::uuid
       LIMIT 1`,
      [playerUuid]
    );
    return {
      accountId: normalizedAccountId,
      displayName: row.rows[0]?.display_name ?? desiredDisplayName
    };
  }

  async updateDisplayName(accountId: string, displayName: string): Promise<PlayerProfile> {
    const normalizedAccountId = normalizeAccountId(accountId);
    const normalizedName = normalizeDisplayName(displayName);
    if (!this.pool) {
      this.memoryProfiles.set(normalizedAccountId, normalizedName);
      return {
        accountId: normalizedAccountId,
        displayName: normalizedName
      };
    }

    const playerUuid = stableUuidFromString(`player:${normalizedAccountId}`);
    await this.pool.query(
      `INSERT INTO players (id, display_name)
       VALUES ($1::uuid, $2)
       ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
      [playerUuid, normalizedName]
    );
    return {
      accountId: normalizedAccountId,
      displayName: normalizedName
    };
  }
}

