# Public content suggestion wizard (spec)

Goal: let anyone **propose** units/heroes in a guided way **without** access to the admin Content Builder or live publish APIs. Output is always **reviewable artifacts** (JSON pack + instructions), aligned with `community/content-pack-template/` and `docs/COMMUNITY_CONTENT_PIPELINE.md`.

## What this is not

- Not a second admin panel: **no** `PUT /admin/content/draft`, **no** publish without admin auth.
- Not a promise that submissions auto-merge: human review + CI (`npm run validate:community-content`) stay mandatory.

## Recommended placement in the app

- **Route:** e.g. `/suggest` or `/contribute` (public, no login).
- **Implementation:** single Vue flow (multi-step) in `apps/client`, or a static page if you want zero game bundle weight—team choice.
- **Validation:** mirror the same allowed enums as `community/validate-content.mjs` and server `ContentBuilderService` (roles, abilities, power keys, tags). Show inline errors before export.

## Screens (5)

### 1) Start — contribution type

- Short intro: “You are creating a **suggestion pack**, not editing the live game.”
- Choices: **Units only** | **Heroes only** | **Units + heroes** (default).
- Link out: `CONTRIBUTING.md`, `docs/COMMUNITY_CONTENT_PIPELINE.md`, `docs/ASSETS.md` (portrait naming).
- Optional: “I only have a **mechanics idea**” → deep link to GitHub Issues / discussion template (no JSON wizard).

### 2) Pack metadata

Fields matching `metadata.json`:

- `packId` (snake_case, validated)
- `title`, `author`, `version`, `description`, `targetGameVersion`
- `tags` (multi-select from a small curated list + optional custom with warning)
- `notes` (design goals, balance intent)

**Actions:** Next. **Persist** draft in `localStorage` (key e.g. `runebrawl.suggest.draft`) so refresh does not lose work.

### 3) Units editor (repeatable rows)

Per unit, same shape as `UnitDefinition` / `units.json`:

- `id`, `name`, `role`, `tier`, `attack`, `hp`, `speed`, `ability` (dropdown = allowed `AbilityKey`)
- Optional: `shopWeight`, `tags` (allowed synergies only)
- Optional trigger fields (when present in shared schema): `castOnDeath`, `castOnKill`, … (dropdown = same `AbilityKey` enum; help text: “event-only until effect wired in code”)

**UX:** Add row / duplicate row / remove. Show a **compact preview** of JSON for power users.

### 4) Heroes editor (conditional)

If flow includes heroes:

- Same as `heroes.json`: `id`, `name`, `description`, `powerType`, `powerKey`, `powerCost`, optional `offerWeight`
- Dropdowns only for allowed enums.

### 5) Review & export

- **Validation summary:** errors blocking export; warnings (e.g. “new mechanic wording—open an issue too”).
- **Download bundle:**
  - `metadata.json`
  - `units.json` / `heroes.json` (omit empty arrays)
  - Optional generated `playtest-notes.md` stub (user can paste into PR)
- **Copy-paste:** single zip is nicer long-term; v1 can be three separate downloads or one JSON blob with labeled sections.
- **Optional “Upload suggestion” (Phase 2):** same payload validated client-side, then `POST` to a public ingest API (see below)—submission lands as **pending**; appears on the public review page.
- **Next steps (static text)** if no upload:  
  “Fork repo → copy into `community/submissions/<packId>/` → run `npm run validate:community-content` → open PR.”

## Mechanics “vorgeben”

- Wizard **only offers** values the engine accepts today (enums from shared types / validator).
- Free-text field **“Mechanic proposal (optional)”** on screen 5 appends to `playtest-notes.md` or `metadata.notes`—does **not** create new `ability` strings in JSON.

## Relation to admin

| Capability              | Public wizard | Public review + votes | Admin builder        |
|-------------------------|---------------|------------------------|----------------------|
| Edit runtime catalog    | No            | No                     | Yes                  |
| Publish to live match   | No            | No                     | Yes (after validate) |
| Submit pack (upload)    | Optional      | — (listing only)       | Import / approve     |
| Community signal        | No            | Yes (votes; advisory)  | Sees counts; decides |
| Import community folder | No            | No                     | Yes (`/admin/content/submissions/...`) |
| Export valid pack files | Yes           | No                     | Yes (draft JSON)     |

**Rule:** votes and comments are **signals only**. **Admin always decides** (reject, request changes, import draft, approve-publish). Nothing auto-merges into live content from vote thresholds alone.

---

## Phase 2 — Public upload + public review page (spec)

### User stories

1. Contributor finishes wizard (or uploads zip) → submission stored server-side as **pending**.
2. Anyone opens **public review** route (e.g. `/review` or `/community/packs`) → list of **pending** (and optionally **under_review**) packs with title, author label, short description, validation status.
3. Logged-in or anonymous visitor (with stable `accountId` cookie) can **upvote** / **downvote** (or single “support”) once per pack; optional short comment later.
4. Admin sees the same packs in admin UI **plus** vote totals and can **import to draft / approve-publish / mark rejected** as today.

### Data model (minimal)

Store submissions in DB (Postgres) or, for an MVP, object storage + metadata table:

- `submission_id` (uuid)
- `pack_id` (from metadata; unique among **active** pending)
- `status`: `pending_validation` | `pending_review` | `rejected` | `imported` | `published` | `withdrawn`
- `created_at`, `updated_at`
- `author_display` (string; no trust)
- `payload_json` or blob paths: `metadata.json`, `units.json`, `heroes.json`, optional `playtest_notes.md`
- `validation_errors` (json array; filled by server validator mirroring `validate-content.mjs`)
- `vote_score` (integer, maintained) or derive from `votes` table

**`votes` table**

- `submission_id`, `voter_id` (e.g. hash of `accountId` + server secret, or raw `accountId` if you accept it)
- `value`: `+1` | `-1` or boolean `support`
- Unique constraint `(submission_id, voter_id)` so one vote per voter per pack
- Optional: `created_at` for audit

### Public API (implemented with Postgres)

Apply migration: `db/migrations/004_public_content_submissions.sql` (requires `DATABASE_URL` on the server).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/public/submissions` | List open packs (`pending_review` / `pending_validation`). Query: `validOnly=1`, `limit` |
| `GET` | `/public/submissions/:id` | `{ submission, portraitUnitIds }` — full detail plus unit ids that have a stored WebP portrait |
| `POST` | `/public/submissions` | JSON body `{ metadata, units, heroes }`; returns `{ ok, id, validation }`. Unique open `pack_id` → `409` + `PUBLIC_DUPLICATE_PACK_ID` |
| `POST` | `/public/submissions/:id/vote` | Body `{ value: 1 \| -1 }`. Ensures player session cookie (`createOrRefreshSession`); one vote per account per submission (upsert) |
| `GET` | `/public/submissions/:id/portraits/:unitId` | Serves `image/webp` if a portrait was uploaded for that unit |
| `POST` | `/public/submissions/:id/portraits/:unitId` | Multipart field **`file`** (JPEG/PNG/WebP, max 5MB). Converts to WebP (max edge 768px), stores under `PUBLIC_SUBMISSION_UPLOAD_DIR` or `./data/public-submissions/<submissionId>/`. Only while status is `pending_validation` or `pending_review`. Sets session cookie like vote. |

### Unit `race` (optional, lore/UI)

- Allowed values (shared with `community/validate-content.mjs` and server `ContentBuilderService`): **`HUMAN`**, **`ORC`**, **`ELF`**, **`DWARF`**, **`UNDEAD`**.
- **No combat rules** use `race` yet; it is for wizard/review/admin and future theming. Omit the field for legacy packs.

**Admin (review DB submissions):**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/content/public-submissions` | All statuses by default; optional `?status=pending_review,pending_validation` |
| `GET` | `/admin/content/public-submissions/:id` | Same payload as public detail |

**Admin** still decides publish path via existing builder / folder flow; votes remain advisory.

Optional later: `POST` `/public/validate-pack` (validate without storing).

### Public review UI (screens)

1. **List:** cards sorted by `vote_score` desc or `created_at`; badge “Valid” / “Has errors”; filter tabs (All / Valid only / Mine if logged in).
2. **Detail:** metadata summary, expandable JSON preview, vote buttons, static disclaimer: “Votes do not guarantee inclusion.”
3. **Submit success:** “Your pack is visible after validation passes” or “Fix errors and resubmit.”

### Abuse & integrity

- Rate limit: uploads per IP + per `accountId`; max body size (e.g. 2 MB for JSON packs).
- Reject executable content in zip; only allow `.json` / `.md` with strict names.
- Sybil votes: soft mitigation via `accountId` + IP bucket limits; stronger = future auth (OAuth) or CAPTCHA on vote/upload.
- Moderation: admin can `rejected` + hide from public list; optional report button later.

### Sync with repo-based flow

- **Either** submissions live only in DB until admin exports to git **or** CI job writes to `community/submissions/` from approved IDs.
- Today’s **folder-based** `CommunityContentService` can stay; admin “import from DB submission” would copy into the same shape the builder expects.

---

## Security & abuse

- **v1 (wizard only):** no server write path; lowest risk.
- **v2 (upload + votes):** rate limit, size caps, validation on server, store as **pending** only, **never** auto-publish from vote counts.
- Optional: CAPTCHA on upload/vote, virus scan on zip, admin-only visibility for invalid packs.

## Implementation checklist (when you build it)

1. Share enum lists: import from `@runebrawl/shared` or duplicate a single `suggestAllowedValues.ts` kept in sync with `validate-content.mjs`.
2. Step state machine + `localStorage` autosave.
3. Zip download: optional dependency (e.g. `jszip`) or three file downloads for v1.
4. i18n: English first; German strings can mirror `apps/client/src/i18n/messages.ts` patterns.
5. **Phase 2:** DB migration for `submissions` + `votes`; Fastify routes + Vue `/review`; wire admin read-only vote stats into existing admin content views.

## Future enhancements

- “Compare to current catalog” (read-only `GET` public catalog endpoint—only if you are OK exposing unit/hero list without auth).
- Comments thread per submission (moderated).
- Notify submitter when status changes (email/webhook—optional).
