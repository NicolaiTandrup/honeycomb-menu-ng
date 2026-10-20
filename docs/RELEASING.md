# Stable publication and verification

**Owner gate for every future version:** publish a HACS-installable beta first,
then wait for explicit owner approval after real Home Assistant testing before
merge/promotion or stable publication. Green synthetic CI alone is insufficient.
PR #91 stays unmerged; its v1.7.1 beta flow is [pending publisher approval](V1_7_1_BETA.md).
The v1.7.0 procedure below records the already-completed stable promotion.

v1.7.0 is promoted from `restart/v1.5.1` after PR #88 merge
`7706859016872ee95bde4299b10a07c072fa38b6`. Master's older v1.6 ancestry is preserved
without importing its implementation. The release source under `src/` must match
that approved baseline exactly. Unfinished #85/#86/#87 are excluded.

## Exact-commit workflow

The promotion PR updates stable package/release metadata, README/release notes,
the generalized artifact validator and the new `stable-release.yml` publisher.
Existing beta publication keeps its beta-only guards. Build CI stages a flat bundle
and checksum artifact and runs all tests plus pinned/checksum-verified actionlint.
The obsolete stale workflow runner is upgraded with explicit minimum permissions.

After promotion, wait for **the exact master SHA's push Build workflow** to finish
successfully. That workflow includes unit/core contracts, performance, 54 desktop/
mobile regressions, 12 docs example interactions, YAML/links and workflow lint.
Dispatch **Publish verified stable release** on `master`, supplying its full
40-character SHA as `expected_commit` and `publish=true`. Default publish=false
only reproduces verified local workflow artifacts; it does not create a tag/release.

Before mutation the publisher requires:

- workflow ref and checkout on the expected master SHA; latest master unchanged;
- approved restart baseline ancestry and no runtime-source changes from that baseline;
- `RELEASE_RETENTION_ENABLED` visible as exact `false` in workflow context;
- successful master push CI for that exact commit; matching downloaded, committed
  and freshly rebuilt HACS bundle and SHA256SUMS; stable version/flag/title metadata;
- no existing v1.7.0 tag or Release record. Existing tags/releases are never replaced.

It creates a **new** tag pointing to that commit, creates a draft Release, uploads
`honeycomb-menu-ng.js`, `SHA256SUMS.txt`, `release-provenance.json`, downloads and
compares every byte, verifies metadata/digests/filename, then makes it public with
`draft=false`, `prerelease=false`, `make_latest=true`. It checks latest/tag/commit,
old Release records and assets again. A failure stops; partial tag/draft state is
retained for inspection, never automatically removed or forced.

## Read-only retention for this release

The owner has manually verified `RELEASE_RETENTION_ENABLED=false` in GitHub repository
settings. Integration Variables API access is limited; no API read/write is attempted
and no permission safeguard is bypassed. If workflow context is empty, true or another
value, publication stops. The reusable post-publication workflow additionally receives
`dry_run_only=true` for v1.7.0: its cleanup job is skipped and script-level apply is
forbidden. This release cannot intentionally trigger deletion through that call.

GitHub suppresses release-event workflows caused by `GITHUB_TOKEN`; the explicit
reusable call produces the fresh inventory report without relying on that event.
Expected inventory after v1.7.0: **28 kept (25 stable + 3 prereleases), 0 eligible,
0 skipped, 0 deleted**, absent unrelated concurrent releases. All stable v0/v1 and
v1.7 prereleases stay. The policy also preserves future prerelease trains and drafts.

See [the retention guide](RELEASE_RETENTION.md#after-v170-owner-activation-instructions)
for the owner's later manual Settings change to exact `true`. Changing the variable
alone does not clean anything; manual runs stay read-only and a subsequent stable
publication is required. Do not republish v1.7.0 or bypass its override to force cleanup.
Deleting a Release record removes its uploaded assets; retained Git tags and tagged
source remain. Tags, refs, branches, commits and source history are never cleanup targets.

## Final verification

Confirm the promotion/master merge SHAs, all master CI checks, published version and
stable/latest flags. Resolve v1.7.0 to the exact tested master commit. Download the
HACS bundle and compare its SHA-256/size to CI, committed source, checksum asset and
provenance commit/version. Confirm every earlier Release ID/tag is retained and
all pre-existing Git tags/branches remain; expected branch advances are limited to
authorized merges. Attach the fresh retention summary and publication evidence.

Browser QA uses the repository Playwright harness at 1100×900 and 390×844 with
synthetic HA. Browser plugin not available. It verifies page identity, meaningful
content, absence of runtime overlays/console errors, interaction/state updates,
geometry/navigation, screenshots and mobile touch. Physical HA devices and other
browser engines remain installation-time checks; no new runtime behavior is added.
