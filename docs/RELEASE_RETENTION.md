# GitHub Release retention — maintainer guide

Policy for Issue #83. **Deletion remains disabled for v1.7.0 Stable.** Review the
[read-only inventory](RELEASE_RETENTION_DRY_RUN.md) and synthetic policy tests before
approving future activation. The owner has manually confirmed the repository
variable is explicitly `false`. The v1.7.0 publisher forces its retention call to
remain read-only and does not change the variable or delete any release record.

## Retention rules

Use GitHub's **latest stable release**, re-read at action time. Never use a beta,
release title, branch, tag listing or publication timestamp to choose the version.
The latest endpoint must identify a published, non-draft, non-prerelease release
with a valid SemVer tag. If another valid stable has a higher version, cleanup
blocks until the latest designation is resolved. Latest stable itself is always
preserved, including when a blocked plan cannot establish its version safely.

| Latest stable | Stable records retained | Prerelease trains retained |
|---|---|---|
| v1.5.1 | All v1 and v0 | v1.5, v1.4, plus newer trains such as v1.7 |
| v1.7.0 | All v1 and v0 | v1.7 and v1.6, plus newer trains |
| v1.8.0 | All v1 and v0 | v1.8 and v1.7, plus newer trains |
| v2.0.0 | All v2 and v1 | v2.0 and v1.9*, plus newer trains |
| v2.1.0 | All v2 and v1 | v2.1 and v2.0, plus newer trains |
| v3.0.0 | All v3 and v2 | v3.0 and the last proven stable v2 minor*, plus newer trains |

Stable retention is strictly **current and previous SemVer MAJOR**. Publishing
v1.7.0 never makes stable v1.5.x or v0.x eligible. Stable v0 becomes eligible only
when latest stable reaches major 2. At major 0, retain stable major 0.

Prerelease retention uses the **current and immediately preceding MINOR train**,
independent of patch or alpha/beta/RC suffix. Newer-than-basis trains remain kept:
v1.7 betas cannot be pruned while latest stable is v1.5. GitHub's `prerelease` flag
controls classification, not the display name. A valid tag without a suffix but
flagged `prerelease: true` is still a GitHub prerelease. A tag with a prerelease
suffix but `prerelease: false` conflicts with stable SemVer and is skipped.

Within a major, the predecessor is numeric: v1.8 → v1.7 even if v1.7 has no records;
do not substitute v1.6 merely because it is present. Patch changes do not change
trains. v0.0 has no preceding train.

*At a major rollover, SemVer does not define the previous minor number or limit it
to 9.* Use the highest minor evidenced by **published stable release records** in
the previous major. Thus v1.9 → v2.0 when v1.9 is the last stable v1 train; if the
last proven train is v1.10, preserve v1.10 instead. Missing intermediate minors
are allowed. If previous-major stable evidence is absent, unknown records prevent
safe interpretation, or a higher prior-major prerelease train makes the evidence
ambiguous, **block all deletion and request owner review**. Never infer from beta
publication order or guess that minors stop at 9.

Drafts are always kept. Unknown/malformed tags, missing classification/date data,
conflicting flags and duplicate normalized version aliases are skipped and reported.
Tags accept `v`, `V` or no prefix, strict numeric SemVer, suffixes and build metadata.
Titles are not parsed. Duplicate aliases involving latest stable block apply.

## Workflow and approval gate

`.github/workflows/release-retention.yml` supports:

1. `release: published` for **stable, non-draft** releases. Beta publications skip
   the jobs. Recheck the actual current latest stable before apply; a queued event
   for an older stable cannot authorize deletion using a newer basis.
2. `workflow_dispatch` for a **read-only** dry-run. It has no deletion input.
3. `workflow_call` for a stable publisher that uses `GITHUB_TOKEN` (see below).

The inventory job has `contents: read`. It paginates all records, produces a
sorted keep/delete/skipped inventory, exact reasons, fingerprints and a plan digest,
and uploads `plan.json`, `report.json`, `summary.md` for 90 days. A changing or
invalid inventory fails closed. The write job is separate and checks out the
**same trusted default-branch policy commit** used by inventory, never release-tag
code. Checkout credentials are not persisted. Workflow concurrency queues runs
without cancelling a cleanup halfway through.

The cleanup job only becomes eligible when the owner explicitly sets repository
Actions variable **`RELEASE_RETENTION_ENABLED` to the exact string `true`**, after
reviewing a dry-run. Missing/false/other values keep deletion disabled. This PR
does not set that variable. Its existing value could not be inspected with the
integration (Variables API returned 403); the owner has since verified `false`
directly in repository settings. The v1.7.0 publisher requires the workflow
variable context to expose that exact false value, without calling the Variables API. Manual dry-run stays read-only even when enabled.
The script independently enforces the gate and publication proof; workflow conditions
alone do not authorize writes. Cleanup has `contents: write`; `actions: read` is
used only to verify a reusable caller's running workflow metadata. No PAT, paid
service, Codex API or OpenAI key is needed.

### Review a manual dry-run

Once the reviewed workflow exists on the repository's default branch, choose
**Actions → GitHub Release retention → Run workflow**, or run:

```sh
gh workflow run release-retention.yml
```

No apply input exists. Review the job summary and artifacts: latest stable basis,
previous train/evidence, exact IDs/tags and reasons, skipped records, blocked reasons,
and eligible count. `delete` in a dry-run means **eligible**, not actually removed.
The separate `release-retention-preview.yml` runs for retention-related PR/push
changes with **contents: read only**, using `GITHUB_TOKEN` and a fixed `--dry-run`
command. It supplies a live Actions summary/artifact for owner review before the
cleanup workflow is installed on the default branch. It cannot enable cleanup or
authorize deletion. The checked-in initial snapshot was also reproduced from
read-only inventory in offline mode; no default-branch workflow or destructive
Action was installed/run.

After owner approval, merge/install the workflow through normal review, obtain a
fresh dry-run, and only then enable the variable if desired. The next valid stable
publication may apply cleanup. Do not simulate a publication or enable deletion
just to test it. To pause future cleanup, unset/set the variable to `false`; an
already-running job may have taken its environment snapshot, so this is not an
atomic stop switch. Inspect/cancel an active run deliberately and review its
progress/results before doing anything else.

### After v1.7.0: owner activation instructions

1. Keep `RELEASE_RETENTION_ENABLED=false` throughout stable v1.7.0 publication.
2. Review its fresh post-publication report: expected 28 kept (25 stable + 3
   v1.7 prereleases), zero eligible, zero deleted, assuming no unrelated releases.
3. To authorize **future** cleanup, open GitHub Settings → Secrets and variables →
   Actions → Repository variables, edit `RELEASE_RETENTION_ENABLED` to exact `true`
   and save. Automation does not attempt this change through inaccessible APIs.
4. A variable change alone never deletes releases. Manual dispatch remains dry-run;
   only a subsequent approved stable publication can apply eligible deletion.
   Review the future publisher's release-specific guards before using it for a new
   version. Never bypass the v1.7.0 read-only override or force a deletion.

### GITHUB_TOKEN publishing and reusable integration

GitHub suppresses most downstream workflow events caused by `GITHUB_TOKEN`,
including release publication. The repository's current publisher is beta-only
and is deliberately unchanged. A future approved **stable** publisher using that
token must call the reusable workflow explicitly **after successful publication**.
Illustrative caller job (requires an actual stable-publisher job/output first):

```text
retention:
  needs: publish-stable
  permissions:
    contents: write
    actions: read
  uses: ./.github/workflows/release-retention.yml
  with:
    published_release_id: ${{ needs.publish-stable.outputs.release_id }}
```

The stable publisher is now implemented in `stable-release.yml`. For v1.7.0 it
passes `dry_run_only: true`; both the workflow and script reject apply in that
mode even if the owner gate changes externally. The ID must refer to current latest stable. Runtime fetches the current Actions
run and requires the same repository/run ID, an active non-PR publisher on the
default branch with a default-branch workflow ref, and publication time no earlier
than the current run attempt's start (the run ID and attempt must match). It rechecks proof during cleanup. An old release ID, beta ID,
feature-branch caller, completed run or foreign repository cannot authorize apply.
This is not a standalone manual apply path. Do not add the call to the beta publisher.

## Safety and failure handling

- REST writes are allowlisted to **DELETE `/repos/{owner}/{repo}/releases/{numeric_id}`**.
  Read-only endpoints list releases, get latest/individual records and verify the
  current publisher run. There is no Git invocation or tag/ref/branch/file/history
  mutation in the script; no separate release-asset deletion API is used.
- Before the first DELETE, fetch the full inventory/latest again and require the
  exact read-only plan digest. Before **each** DELETE, re-read the complete expected
  inventory/latest, revalidate publication proof, then inspect the individual ID.
  Edits to tags, flags, notes, assets or latest designation stop remaining work.
  Download counters are intentionally excluded from fingerprints.
- Verify absence after each DELETE and verify final inventory. A missing/changed
  record aborts, rather than silently substituting another release/tag.
- Read pagination is bounded at 1,000 pages, rejects duplicate IDs and unsafe/looping
  next links, and never treats a failed page as an empty final page. Exact-full pages
  without a next link are followed by an extra empty-page check.
- Plans over **100 deletions** block for owner review. An available rate-limit
  budget must cover estimated revalidation requests plus a reserve before deletion.
  Large inventories may need a deliberately reviewed limit/batching change; never
  silently truncate the eligible list.
- Reads have bounded network/5xx/short-429 retries and timeouts. Permission/rate-limit
  failures stop with diagnostics. A DELETE is **never blindly retried**. Lost or
  unexpected responses produce an uncertain result with an absence check and stop
  later deletions. Partial progress is saved before/after mutations and uploaded
  even when a run fails. Do not rerun blindly after an uncertain result.
- Job summaries list exact tags/reasons; if GitHub's summary size would be exceeded,
  the summary points to the full inventory artifact instead of truncating silently.
  Tags are escaped to avoid Markdown/log injection. Tokens/response bodies are not
  included in diagnostics.

GitHub has no documented atomic transaction for deleting a release conditional on
its classification. The final GET and DELETE still have a small race window with
external edits/publications; concurrency only serializes this workflow's runs.
Avoid editing releases during apply, and inspect any stopped/partial run. Deletion
is not transactional: confirmed removals cannot be rolled back automatically.

Deleting a GitHub Release record also removes its attached release assets as part
of GitHub's operation. **Tags and source commits remain**, but they are not a backup
of notes/assets, release IDs, URLs, timestamps or download counters. Restoring needs
an independently saved copy and manual owner action; this script never recreates
records or rewrites tags/history.

## Local tests and offline review

No extra runtime dependencies are required (Node 20+). All mutation tests use a
synthetic in-memory GitHub API; tests never contact GitHub to DELETE anything.

```sh
node --test test/release-retention.test.js
npm test
node scripts/release-retention.js --dry-run \
  --inventory /tmp/releases.json --latest /tmp/latest-stable.json \
  --repository example/honeycomb --output /tmp/retention-review
```

Offline files must contain an array of full Release API records and the full
`/releases/latest` object (or JSON null). Offline data cannot authorize apply.
The script defaults to dry-run. Live Actions reads use only `GITHUB_TOKEN` and
`GITHUB_REPOSITORY`. Run actionlint on workflow edits and `git diff --check`.
