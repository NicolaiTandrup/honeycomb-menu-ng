# Development status — v1.9.0-beta.4

Updated: 2026-10-24 (Europe/Copenhagen). Verify live Git/CI/PR/release state before work.

## Active work and protected baseline

- Active branch `fix/v1.9-beta4-palettes-navigation`, review PR targets unmerged
  `release/v1.9.0-stable-candidate` (PR #132), not master.
- Authoritative runtime baseline: public beta.3 `8a57ccd225cf95a22685c86fafda1a674bd649d2`.
  Candidate parent `7d46be37e3a538b65542719d60ea0a3157ba4c44` only prepared stable
  metadata/docs; beta.4 metadata now supersedes that on this separate branch.
- Master/latest stable v1.8.1 `c1f178740c8181921033d0d18e0ac8d01afc7ea7` is protected.
  PR #132 is unmerged. Climate stays separate on `feature/v1.10-climate` PR #131;
  do not import it. Car, Charger Level B redesign/guest UI and EV manager deferred.
- Owner authorizes immutable beta.4 publication through the normal guarded manual
  beta workflow only after all exact-head CI/reproducibility/publication gates pass.
  No stable merge/publication, retention mutation, old tag/release/asset modification
  or live HA commands are authorized. Preserve private beta.5 draft and assets.

## Completed implementation and actual validation

- `439e907`: #133 capability/current-mode Light navigation; dual-mode tap/hold,
  displayed/alternative labels, bounded per-connection/entity off-mode memory,
  no-service navigation, live capability guards, fixed-white brightness preset.
- `0c7c39e`: #134 shared promoted-child anchors at meaningful depths and exact Back
  snapshots; neutral Charger detail inner borders; explicit overrides preserved.
  Existing Light zoom/Sonos siblings retain their module anchors and defaults.
- Local Node: **357 pass, 3 stable-only skips, zero failures**. Stable-only tests
  intentionally do not apply to this prerelease; no mandatory gate disabled.
- Local targeted Chromium: **12 desktop/mobile tests pass** with real pointer/touch;
  synthetic before fixtures reproduce beta.3 dual-mode default and deeper anchor
  lock (4 baseline cases pass). A root-Hub Charger already anchored correctly;
  the navigation defect requires a deeper level. Tests compare physical centers,
  allowing existing hover scale instead of mistaking it for anchor movement.
- Evidence outside Git: `/workspace/build-output/beta4/{before,after}`. Browser
  plugin unavailable; repository Playwright Chromium harness used. No real HA,
  Firefox or WebKit acceptance is implied.
- Local reproducible production build passed: 247895 bytes; SHA256
  `3ac96d191f56c3d86a6dbf81e8189a875defd8be6d26b92654e28f7a1a82e84f`. HACS package/license, workflow lint, 57 YAML
  blocks/37 complete cards/11 fragments/213 links and 16 docs interactions pass.
- Full regression caught and fixed an overbroad default promotion: unmarked custom
  Light children must retain their named center. Promotion now requires explicit
  `promote_to_center: true`; the existing unchanged regression passes desktop/mobile.
  Complete earlier CI runs are superseded by the corrected final head.
- Live on/off capability changes now suppress stale detail launchers, including
  unavailable entities with explicit onoff capability (missing capabilities remain
  conservative). Added real touch/pointer and unit regressions. SVG computed fills
  verify neutral/detail overrides at multiple depths, not just model data.
- Full mandatory exact-head CI and publisher are pending at this
  checkpoint. Latest PR comments and Actions are authoritative for later results.
  Do not mark a dispatch, prepared tag or written code as a published release.

## Remaining tasks, in order

1. Verify final-head mandatory push/PR Build jobs including new beta4-navigation
   suite; inspect full browser/docs/performance/HACS/workflow results/artifacts.
2. Verify reproducible production bytes/checksum. Run normal manually authorized
   beta publisher for NEW `v1.9.0-beta.4` with exact tested head and `publish=true`
   only after all gates pass. Freeze this branch while verifying/publishing.
3. Independently check public exact tag/JS/checksums/provenance and preservation of
   master/latest stable/previous releases/assets; report any access blocker precisely.
   Do not bypass a failed gate or reuse an existing tag/draft.
4. Record actual final outcomes in PR/issue progress and a separate handoff branch
   after publication (do not move the verified source during publication).
5. Owner real-HA acceptance checklist is in RELEASE_NOTES.md. Leave #133/#134 open;
   stable #125/#105 acceptance remains separate. Update PR #132 with beta.4 status,
   not a merge or unapproved source pin. A future stable candidate must pin the
   newly owner-tested beta, never silently reuse the old beta.3 approval proposal.
6. Climate preparation on PR #131 resumes independently after this release mission.
   Do not repeat existing implementation. Car #86 remains planning-only until
   Climate acceptance and owner implementation authorization.

## Commands

```sh
git status --short
git log -5 --oneline
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
python test/browser/beta4_navigation.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta4-navigation
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta4-docs
node test/performance/hub-benchmark.js
# Complete browser/contract/coexistence/release commands: .github/workflows/build.yml
# Publication input contract: docs/BETA_RELEASES.md; never weaken guards.
```

Local Python environment `/tmp/honeycomb-beta-venv/bin/python`; button-card fixture
`/workspace/build-output/test-dependencies/button-card.js`; actionlint
`/tmp/honeycomb-actionlint-bin/actionlint`. Do not run npm ci through the shared
node_modules symlink. CI uses a clean locked install normally.
