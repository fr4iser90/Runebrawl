import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UNIT_ID_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Max width/height after resize; matches portrait-style assets (see docs/ASSETS.md). */
const PORTRAIT_MAX_EDGE = 768;

export function getPublicSubmissionUploadRoot(): string {
  const raw = process.env.PUBLIC_SUBMISSION_UPLOAD_DIR?.trim();
  if (raw) return path.resolve(raw);
  return path.resolve(process.cwd(), "data/public-submissions");
}

export function submissionPortraitDir(submissionId: string): string {
  return path.join(getPublicSubmissionUploadRoot(), submissionId);
}

export function portraitFilenameForUnit(unitId: string): string {
  return `unit_${unitId}.webp`;
}

export function isValidPortraitUnitId(unitId: string): boolean {
  return UNIT_ID_RE.test(unitId);
}

function allowedMime(mimetype: string | undefined, filename: string | undefined): boolean {
  const mt = (mimetype ?? "").toLowerCase();
  if (mt === "image/jpeg" || mt === "image/png" || mt === "image/webp") return true;
  const name = (filename ?? "").toLowerCase();
  return /\.(jpe?g|png|webp)$/.test(name);
}

export async function convertAndSaveUnitPortrait(
  submissionId: string,
  unitId: string,
  fileBuffer: Buffer,
  mimetype: string | undefined,
  filename: string | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidPortraitUnitId(unitId)) {
    return { ok: false, error: "Invalid unit id" };
  }
  if (fileBuffer.length === 0) return { ok: false, error: "Empty file" };
  if (fileBuffer.length > MAX_UPLOAD_BYTES) return { ok: false, error: "File too large (max 5MB)" };
  if (!allowedMime(mimetype, filename)) {
    return { ok: false, error: "Unsupported image type (use JPEG, PNG, or WebP)" };
  }
  try {
    const webp = await sharp(fileBuffer)
      .rotate()
      .resize(PORTRAIT_MAX_EDGE, PORTRAIT_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const dir = submissionPortraitDir(submissionId);
    await mkdir(dir, { recursive: true });
    const outPath = path.join(dir, portraitFilenameForUnit(unitId));
    await writeFile(outPath, webp);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not process image" };
  }
}

export async function readPortraitFileIfExists(submissionId: string, unitId: string): Promise<Buffer | null> {
  if (!isValidPortraitUnitId(unitId)) return null;
  const p = path.join(submissionPortraitDir(submissionId), portraitFilenameForUnit(unitId));
  try {
    return await readFile(p);
  } catch {
    return null;
  }
}

export async function listPortraitUnitIdsForSubmission(submissionId: string, validUnitIds: Set<string>): Promise<string[]> {
  const dir = submissionPortraitDir(submissionId);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const prefix = "unit_";
  const suffix = ".webp";
  const out: string[] = [];
  for (const name of names) {
    if (!name.startsWith(prefix) || !name.endsWith(suffix)) continue;
    const id = name.slice(prefix.length, -suffix.length);
    if (validUnitIds.has(id)) out.push(id);
  }
  return out.sort();
}
