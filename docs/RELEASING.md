# Stable publication and verification

Every stable version requires a HACS-installable beta and explicit owner approval
after real Home Assistant testing. Green synthetic CI alone is insufficient.
For v1.7.1, the approval is [Issue #102](https://github.com/NicolaiTandrup/honeycomb-menu-ng/issues/102)
and the exact public beta is v1.7.1-beta.8 at
`c1cdd390bed1c1acfc22b314807ce63050e43248`. Its SHA256 is
`4cb42226324fb001d54c527d63170bfff16b8baabb880d94610b61fa037fbfb5` (196186 bytes).

## Reviewed candidate provenance

Create one cumulative promotion PR to master from the exact approved beta ancestry.
Do not merge historical feature PRs independently or squash away the beta ancestry.
`release-approval.json` pins the stable version, owner approval issue, public beta
tag, commit, `src` Git tree, bundle size/checksum and allowed metadata change.
Future canonical `MAJOR.MINOR.PATCH` stable versions must update this reviewed
manifest for their own approved beta; no historical v1.7.0 baseline is hardcoded.

The source gate requires the approved beta to be an ancestor; identical `src/`,
assets, HACS config and brand generator; unchanged dependency package/lock contents.
Only package/root-lock version and the additive promotion-test command may change.
Webpack may add only the deterministic version-banner plugin. The rebuilt stable
bundle must equal the exact approved beta's executable bytes, with only the known
`/*! Honeycomb Menu NG vVERSION */` comment prefix added/updated. The beta's Git tag,
public prerelease record and uploaded bundle size/SHA256 digest must match the
manifest. Unknown, missing or conflicting provenance stops publication.

Documentation, release metadata, publisher/workflow safety fixes and their tests
are reviewable promotion changes outside runtime source. No new features may be
introduced during promotion. Public examples must remain synthetic.

## Exact-commit workflow

1. Run unit/core contracts, full desktop/mobile browser tests, native Sleep boundary
   model, documentation interactions, YAML/links, performance, workflow lint,
   production build and byte-for-byte reproducibility/checksum validation.
2. Confirm matching push/PR CI is green and merge the cumulative PR with a merge
   commit. Do not force-push, use an admin override or bypass required checks.
3. Wait for the exact final master SHA's push Build CI, including both `build` and
   `workflow-lint` jobs, to complete green. Newer failed/pending runs cannot be
   hidden by an older success; repository, workflow path, event, branch, commit,
   run ID and attempt are pinned in release provenance.
4. Dispatch **Publish verified stable release** (`stable-release.yml`) on **master**
   with that full SHA as `expected_commit`, first `publish=false`. Verify success:
   only verification runs, no tag/Release is created.
5. Dispatch the same workflow/SHA with explicit `publish=true`. A fresh read-only
   verification job repeats source/CI/metadata/unused-version checks, downloads the
   exact master CI artifact, installs locked dependencies, reruns unit/contracts,
   rebuilds and compares committed/rebuilt/CI/staged bundle bytes and SHA256SUMS.
6. The write job re-verifies exact master/CI and staged provenance, creates one
   unused tag and new draft with three assets, downloads/verifies every byte/digest,
   then repeats source/CI/tag/retention/inventory checks before publishing stable
   and latest. It checks the public tag, record and preserved inventory again.

Both dispatches require `workflow_dispatch`, workflow SHA/checkout/master equality,
canonical stable package/lock/title/flag metadata and an earlier valid latest
stable. Unknown/conflicting inventory, duplicate/existing version/tag (including
drafts), absent/failed/skipped CI, changed approved source or any API error blocks.
A newly created draft is located through the complete paginated inventory and its
exact ID, with at most four read-only visibility attempts. Permission errors and
ambiguity fail immediately. Never retry mutations or resume/replace an old draft;
preserve any partial new tag/draft for inspection.

If the integration cannot dispatch or merge, report the actual blocker and provide
these same Actions instructions. Never claim publication from a draft or workflow
request alone. Never fall back to local direct release creation.

## Retention remains disabled

The owner verified `RELEASE_RETENTION_ENABLED=false` in repository Settings. The
workflow reads `vars.RELEASE_RETENTION_ENABLED` directly and requires exact `false`
in both verification and publication. Empty/true/conflicting state blocks. Do not
query/change the inaccessible Variables API or weaken this requirement.

The reusable post-publication retention workflow always receives `dry_run_only=true`
from the stable publisher. It reports fresh inventory; its cleanup job must remain
skipped even if the variable changes externally. The retention policy/enablement
remains independent of stable publication. Never delete a Release/tag/asset/ref,
branch, commit or source history during this procedure. Deleting a Release record
would also delete its uploaded assets; preserving tags alone would not preserve
those assets. The beta.5 private draft and every previous release remain intact.

## Final verification

Independently verify the public release has `draft=false`, `prerelease=false`, is
GitHub latest stable, and resolves to the exact green master SHA. Download all
three assets: `honeycomb-menu-ng.js`, `SHA256SUMS.txt`, `release-provenance.json`.
Compare bytes/checksum with the committed bundle and provenance, including approved
beta identity and master CI attempt. Confirm HACS filename/content-in-root and
all previous releases/assets/tags/branches; only the authorized master merge and
new promotion branch/tag may change refs. Inspect the dry-run/cleanup-skipped result.
Close the release-tracking issue only after successful independent verification.

Browser QA uses the repository Playwright harness at 1100×900 and 390×844 touch
(Browser plugin unavailable), with synthetic HA. Physical HA approval for beta.8
is recorded in #102; automated tests additionally verify page identity, content,
console/overlay health, interactions and screenshots. HACS users can select stable
v1.7.1 without enabling beta versions, retain the module resource and hard-refresh.
