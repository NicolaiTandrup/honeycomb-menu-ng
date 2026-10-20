# Manually authorized beta publication

The **Publish manually authorized beta** workflow (`release.yml`) works from
**any Git branch**, including `feature/*`, `fix/*`, `restart/*`, maintenance
branches and `master`. It never requires merging an unmerged branch into master.
No historical commit ancestry or branch prefix controls beta eligibility.

## Version and authorization contract

- `package.json` and `package-lock.json` must agree on a valid SemVer
  `MAJOR.MINOR.PATCH-beta.N` version, for example `1.7.1-beta.1`, `1.8.0-beta.1`
  or `2.0.0-beta.12`. Zero-valued numeric identifiers are valid; leading zeros
  are not. Optional SemVer build metadata is accepted. The tag is exactly `v`
  followed by that version. Stable, alpha, rc and malformed versions are rejected.
- `release.json` must contain `prerelease: true` and a title containing the exact
  version prefixed by `v`. HACS must point to the root `honeycomb-menu-ng.js`.
- A repository collaborator with workflow-dispatch permission selects the branch
  and supplies `expected_commit` (full lowercase 40-character branch-head SHA),
  `expected_tag`, approved `release_notes`, and explicitly sets `publish=true`.
  The default `publish=false` only verifies and prepares assets; it creates no tag
  or Release. Pushes and PR events cannot authorize beta publication.

## Required CI and source identity

Build CI runs on **every branch push**, including bundle-only changes. Publication
requires the latest matching push Build run at the exact repository, branch and
SHA to be complete and green. If the branch has open same-repository PRs, each
must match that head and have a green matching PR Build run too. A branch without
an open PR requires push CI; a PR is not mandatory for a beta.

Both `build` and `workflow-lint` jobs must succeed, and no CI job may be failed,
skipped, pending or cancelled. An older successful run cannot conceal a newer
failed/pending run. CI rerun attempts are pinned in provenance. Inventory and CI
queries paginate; missing information or an API/permission error stops the run.

The selected workflow revision, checkout, input SHA and current remote branch
head must be identical. The branch and CI gates run again before publication.
Branch movement or a new CI attempt requires a fresh verification run.

## Artifact and publication sequence

1. The read-only verification job validates metadata and CI, and rejects any
   existing exact tag or matching Release record (including drafts).
2. Download the matching push CI artifact. Install locked dependencies, rerun
   unit/contracts and build, and compare the committed, rebuilt, CI and prepared
   JavaScript bundles and SHA256SUMS byte-for-byte. Full browser/docs/performance
   and workflow checks already ran in the required green Build workflow.
3. Upload verified assets for the separate publication job. Only that job receives
   `contents: write`, and only with explicit manual `publish=true`.
4. Recheck source, branch, CI, staged bytes and tag/release absence. Create a new
   lightweight beta tag at the exact tested commit. Never force or update a tag.
5. Create a **draft prerelease**, upload `honeycomb-menu-ng.js`, `SHA256SUMS.txt`
   and `release-provenance.json`, then download and compare every byte. Validate
   asset names, sizes, available GitHub digests, tag SHA and metadata. Provenance
   identifies branch, source SHA, version, bundle SHA256 and CI run attempts.
6. Recheck branch/CI/tag and existing release inventory, then publish with
   `prerelease=true` and `make_latest=false`. Verify that the latest stable and
   every existing Release/asset remain unchanged.

A failure stops without rollback or deletion. Any newly created tag/draft remains
for inspection; rerunning cannot silently reuse it. Resolve failures with the
owner and a new beta version rather than moving tags or replacing assets.
The workflow never modifies retention variables or invokes release cleanup.

For CLI dispatch, write the exact inputs as JSON to a file and use:

```sh
gh workflow run release.yml --repo NicolaiTandrup/honeycomb-menu-ng \
  --ref YOUR_BRANCH --json < approved-beta-inputs.json
```

Use GitHub Actions or authenticated release assets to inspect verification evidence.
For v1.7.1 owner installation and smoke tests see [the HACS guide](V1_7_1_BETA.md).

## Owner approval before stable

**Every future version must first ship an installable beta and receive explicit
owner approval after real Home Assistant testing before merge/promotion or stable
publication.** Green synthetic CI does not replace that approval. This workflow
cannot publish stable releases. It leaves PRs unmerged and master unchanged unless
master itself was the selected source branch; even then it changes no source.
