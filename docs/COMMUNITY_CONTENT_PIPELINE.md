# Community Content Pipeline (v1)

This document defines how contributors can submit new Runebrawl gameplay content.

## Scope

Accepted contribution types:

- New units
- New heroes
- Synergy/tag proposals
- Balance tuning proposals
- Mechanical proposals (small, testable)
- Art and UI assets

Out of scope for this pipeline:

- Deck/hand/draw card systems
- Large architecture rewrites in a content PR

## Submission Structure

Create a folder under:

- `community/submissions/<pack-name>/`

Use this baseline:

- `metadata.json`
- `units.json`
- `heroes.json`
- `playtest-notes.md`

Start from:

- `community/content-pack-template/`

## Validation Expectations

Each submission should satisfy:

- IDs are stable, lowercase snake_case
- No duplicate IDs across entities in same pack
- Numeric fields are valid (e.g. positive weights)
- Roles/abilities/power keys match supported enums
- Rationale is included (why this is fun/balanced)

Local command:

- `npm run validate:community-content`

CI:

- GitHub Action `Community Content Validation` runs automatically on PRs touching community content files.

## Review Stages

1. **Format review**
   - naming, structure, required fields
2. **Gameplay review**
   - role clarity, counterplay, pacing impact
3. **Balance review**
   - shop/offer weights and early game pressure
4. **Technical review**
   - typecheck/tests, regressions
5. **Art review** (if provided)
   - sizing, naming, style consistency

## Merge Strategy

- Prefer small PRs: one content pack per PR
- First merge to test environment/beta branch if available
- Promote to main after playtest checks pass

## Admin Import (v1.2)

After a submission pack is present under `community/submissions/<pack-name>/`, admins can:

- List available packs via `GET /admin/content/submissions`
- Inspect pack payload and validation status via `GET /admin/content/submissions/:submissionId`
- Import validated pack into builder draft via `POST /admin/content/submissions/:submissionId/import-draft`
- Approve and publish directly via `POST /admin/content/submissions/:submissionId/approve-publish`

Audit/rollback support:

- List publish/rollback history via `GET /admin/content/publish-history`
- Roll back runtime content to a prior audited snapshot via `POST /admin/content/publish-history/:auditId/rollback`
- With `DATABASE_URL` configured and migration `003_content_publish_audit.sql` applied, publish audit snapshots are persisted in PostgreSQL and restored on server startup.

Then use the existing builder publish flow to push runtime content.

## Versioning Note

When gameplay behavior changes significantly:

- Update `docs/CHANGELOG.md`
- Mention expected impact in PR body
- Include rollback approach (remove pack / revert IDs)

## Future Extensions (v2+)

- Automated schema validation job
- CI content-lint for submission folder
- In-admin import and preview of submission packs
- Contributor leaderboard and pack ownership metadata

