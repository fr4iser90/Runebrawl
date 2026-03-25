import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HeroDefinition, UnitDefinition } from "@runebrawl/shared";
import type { ContentBuilderService, ContentValidationResult } from "./contentBuilderService.js";

interface SubmissionMetadata {
  packId: string;
  title: string;
  author: string;
  version: string;
  description: string;
  targetGameVersion: string;
  tags: string[];
  notes?: string;
}

export interface CommunitySubmissionSummary {
  submissionId: string;
  metadata: SubmissionMetadata | null;
  unitsCount: number;
  heroesCount: number;
  updatedAt: number;
  validation: ContentValidationResult;
  readErrors: string[];
}

export interface CommunitySubmissionDetail extends CommunitySubmissionSummary {
  units: UnitDefinition[];
  heroes: HeroDefinition[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.map((entry) => (typeof entry === "string" ? entry : null));
  if (normalized.some((entry) => entry === null)) return null;
  return normalized as string[];
}

function parseMetadata(value: unknown): SubmissionMetadata | null {
  if (!isObject(value)) return null;
  const tags = asStringArray(value.tags);
  if (tags === null) return null;
  const required: Array<keyof SubmissionMetadata> = ["packId", "title", "author", "version", "description", "targetGameVersion"];
  for (const key of required) {
    if (typeof value[key] !== "string" || !(value[key] as string).trim()) {
      return null;
    }
  }
  return {
    packId: value.packId as string,
    title: value.title as string,
    author: value.author as string,
    version: value.version as string,
    description: value.description as string,
    targetGameVersion: value.targetGameVersion as string,
    tags,
    notes: typeof value.notes === "string" ? value.notes : undefined
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export class CommunityContentService {
  private readonly submissionsRoot: string;

  constructor(private readonly contentBuilder: ContentBuilderService) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    this.submissionsRoot = path.resolve(here, "../../../../community/submissions");
  }

  async listSubmissions(): Promise<CommunitySubmissionSummary[]> {
    const entries = await this.readSubmissionFolderNames();
    const summaries = await Promise.all(entries.map((entry) => this.readSubmission(entry, false)));
    return summaries
      .map((result) => ({
        submissionId: result.submissionId,
        metadata: result.metadata,
        unitsCount: result.unitsCount,
        heroesCount: result.heroesCount,
        updatedAt: result.updatedAt,
        validation: result.validation,
        readErrors: result.readErrors
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getSubmission(submissionId: string): Promise<CommunitySubmissionDetail | null> {
    const entries = await this.readSubmissionFolderNames();
    if (!entries.includes(submissionId)) return null;
    return this.readSubmission(submissionId, true);
  }

  private async readSubmissionFolderNames(): Promise<string[]> {
    try {
      const entries = await readdir(this.submissionsRoot, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch {
      return [];
    }
  }

  private async readSubmission(submissionId: string, includeContent: boolean): Promise<CommunitySubmissionDetail> {
    const base = path.join(this.submissionsRoot, submissionId);
    const readErrors: string[] = [];
    let updatedAt = Date.now();

    try {
      const info = await stat(base);
      updatedAt = info.mtimeMs;
    } catch {
      // keep fallback
    }

    let metadata: SubmissionMetadata | null = null;
    let units: UnitDefinition[] = [];
    let heroes: HeroDefinition[] = [];

    try {
      const metadataRaw = await readJson<unknown>(path.join(base, "metadata.json"));
      metadata = parseMetadata(metadataRaw);
      if (!metadata) {
        readErrors.push("metadata.json is invalid.");
      }
    } catch {
      readErrors.push("metadata.json is missing or invalid JSON.");
    }

    try {
      const unitsRaw = await readJson<unknown>(path.join(base, "units.json"));
      if (Array.isArray(unitsRaw)) {
        units = unitsRaw as UnitDefinition[];
      } else {
        readErrors.push("units.json must contain an array.");
      }
    } catch {
      readErrors.push("units.json is missing or invalid JSON.");
    }

    try {
      const heroesRaw = await readJson<unknown>(path.join(base, "heroes.json"));
      if (Array.isArray(heroesRaw)) {
        heroes = heroesRaw as HeroDefinition[];
      } else {
        readErrors.push("heroes.json must contain an array.");
      }
    } catch {
      readErrors.push("heroes.json is missing or invalid JSON.");
    }

    const validationFromBuilder = this.contentBuilder.validateContent(units, heroes);
    const validation: ContentValidationResult =
      readErrors.length > 0
        ? { ok: false, errors: [...readErrors, ...validationFromBuilder.errors] }
        : validationFromBuilder;

    const detail: CommunitySubmissionDetail = {
      submissionId,
      metadata,
      unitsCount: units.length,
      heroesCount: heroes.length,
      updatedAt,
      validation,
      readErrors,
      units: includeContent ? units : [],
      heroes: includeContent ? heroes : []
    };

    return detail;
  }
}

