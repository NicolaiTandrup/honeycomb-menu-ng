# Current development checkpoint — Issue #137 / #138 private dev build

Updated 2026-10-25 (Europe/Copenhagen). Read AGENTS.md and live issue comments.

- Active branch `dev/issue137-light-off`, exact base public beta.5 commit
  `21f1e75edd9f5c204b7b10fdb6f964371c7a01d0`; no unrelated work imported.
- #137 implemented: only Light Hub OFF launchers show existing configured name,
  else friendly_name, else readable entity ID; secondary `OFF`. Existing name
  templates evaluated through the same renderer helper. Explicit label overrides
  retain their precedence. No new configuration key. ON, unknown/unavailable,
  standalone/classic controls and promoted submenu Back centers are unchanged.
- Actual validation: 40 Light unit/palette/Hue/Kelvin tests; six Chromium cases
  (1100x900 and 390x844) for simultaneous OFF names, short/long names/ellipsis,
  live transitions/color retention, reload/template/friendly-name fallback,
  palette/Back/service isolation; core contracts and build/syntax passed.
  Browser plugin unavailable; existing Playwright Chromium harness used.
- Public HACS packaging validator rejects this private dev suffix as Unsupported
  release version, as intended by public publication guards. No guard modified.
- Evidence outside Git: `/workspace/build-output/issue137-dev/`.
- #137 source checkpoint `24b6adedbaa1`, pushed. #138 follow-up now implements
  separate dev loader + nonce/no-store manifest + immutable hashed runtime;
  normal stable/HACS resources do not use it. Build-time version/source commit
  shown beneath bee only during its existing 430 ms flight; no layout movement.
- Actual #138 draft validation: 43 targeted Node tests (including build metadata),
  core contracts, build/syntax, six Light OFF browser cases and two desktop/touch/
  keyboard clock-controlled bee-version cases passed. Draft build explicitly
  marked `.dirty`, not delivered as an exact-source artifact.
- #138 implementation checkpoint `6e03e68ef53843920299f8c3df296df4716ce1c4`
  pushed. Clean source A built successfully: 249568-byte runtime, SHA256
  `473f6f87c8721c71219b32abb1c0ee344304a235f1bd5566f04b0e272aca8dc3`,
  embedded version `1.9.0-beta.6-dev+6e03e68ef538`.
- Next: build this second checkpoint B, which adds an unchanged-source-during-build
  check and existing-runtime conflict regression. Exercise both real builds
  through the same permanent URL under aggressive HTTP caching. Verify no duplicate registration, no polling,
  accurate loaded version and corrupt-manifest fail-closed behavior. Only then
  package final clean-source runtime/loader/manifest and commit generated bundle.
  No public release CI/provenance or real-HA acceptance claimed.
- No release/tag/merge/retention/live HA changes. User explicitly waived release
  CI and provenance for this private candidate. Real HA acceptance still pending.

Commands run:
```sh
node --test test/light-off.test.js test/light-palette.test.js test/color-zoom.test.js test/kelvin-zoom.test.js
node test/run-tests.js
NODE_OPTIONS=--openssl-legacy-provider npm run build
node --check honeycomb-menu-ng.js
/tmp/honeycomb-beta-venv/bin/python test/browser/light_off.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/issue137-dev/browser
```

---

# Development status — v1.9.0-beta.5 published and verified

Updated: 2026-10-25 (Europe/Copenhagen). Read AGENTS.md and verify live Git/CI/issue/PR state.

## Exact completed release — do not repeat publication

- Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.5
- Immutable tag/source: `21f1e75edd9f5c204b7b10fdb6f964371c7a01d0`; source tree
  `44a79e37ca074e4a4725b28d178e4f9c9cabeab1`. Source branch
  `fix/v1.9-beta5-palette-theme`, unmerged [PR #136](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/136),
  targeting the unmerged beta.4 branch/PR #135, not master.
- Bundle: 248286 bytes; SHA256
  `42853c775b8715c9df4ff72a3f73a5f44fe5a271394321cc79aa467381d21dab`.
- Complete final-head push CI [40177945615](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40177945615)
  and PR CI [40177949328](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40177949328):
  all jobs/steps successful. Guarded manual publisher [40179109115](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40179109115)
  completed verify + publish successfully. No guard or test was disabled/bypassed.
- Independently downloaded JS, SHA256SUMS and provenance without authentication;
  all match tagged Git bytes, sizes/digests and exact CI/source/branch/version pins.
  Tag is exact commit, Release public/prerelease=true, latest stable unchanged.
- Preservation audit: 51 prior releases and 103 prior tags retained unchanged;
  only beta.5's new release/tag added. Zero deletions/overwrites. All old assets,
  including the private v1.7.1-beta.5 draft, remain intact. Retention untouched.

This documentation-only handoff is on `docs/v19-beta5-published-handoff` after
verified publication. It does not move the tested source branch or immutable tag.
The tagged handoff necessarily predates publication; use this follow-up plus live
PR/issue/release evidence for continuation. Never republish/reuse beta.5.

## Implemented and actual tests

- `5022e51` (#133): Color/White viewed/alternative labels and switching live on
  cube 3. Slot 0 restores original entity/name/brightness/colors and Back. Existing
  capability/current-mode rules, off/null session memory, White-only restrictions,
  service isolation and Color/Kelvin recursive zoom remain intact.
- `abdcbf3` (#134): ordinary submenu fill and inner border share the existing
  Light neutral theme at every depth. Dark outer border retained. Root Hub black/
  dark base and status colors, meaningful module/center/palette colors and explicit
  center/inner/outer/card-background overrides remain supported. No second renderer,
  numeric sizing or navigation engine. Root precedence/82px geometry unchanged.
- Test/docs follow-ups `a8db4ef`, `eded401`, `21f1e75` do not change runtime.
  Superseded CI found an old opaque-gray expectation; it now tests approved Light
  alpha fill, both borders, no inherited parent tint, and Back restoring explicit
  parent styling. An added selector was corrected and passed locally in both views
  before final matching CI passed. Superseded failures do not authorize publication.
- **357 Node passes, 3 stable-only skips, zero failures**; core contracts pass.
- **319 complete Chromium scenarios pass** (desktop/mobile, 7 tablet cases,
  original coexistence and docs), plus six native Sonos Sleep service contracts.
  This includes the new 14-case beta.5 suite and preserved 12-case beta.4 navigation
  suite, all Light/Sonos/Charger/editor/Radio/auto-size/pulse/visibility/touch tests.
- Pixel comparison with immutable beta.4 preserves Hub/Light/Sonos root/main
  surfaces; only approved cube 3 is masked in the Light comparison. Computed SVG
  fills test Charger, three generic depths, root black, active center and explicit
  overrides. Transparent custom content preserves gray; explicit card styles work.
- Docs: 57 YAML blocks, 37 complete cards + 11 fragments, 213 local links, 16
  desktop/mobile interactions pass. HACS/package/GPL attribution, actionlint,
  performance and repeated reproducible build/byte comparisons pass.
- Mandatory publisher compares committed, rebuilt, CI, staged and downloaded
  assets. Local private CI artifact download is Forbidden; Actions' authorized
  download/compare passed, followed by independent public asset verification.
- Evidence outside Git: `/workspace/build-output/v19-beta5/` (including `before`,
  `release-candidate`, `public`, verified CI and preservation reports). CI artifact
  `shared-cube-evidence` contains synthetic desktop/mobile screenshots/diffs.
  Browser plugin unavailable; repository Playwright Chromium used.

## Protected and independent work

- Master/latest stable stays v1.8.1 at `c1f178740c8181921033d0d18e0ac8d01afc7ea7`.
  No master merge, stable publication, live HA command or production configuration
  change occurred. No release-retention setting or external HACS submission changed.
- PR #135 (beta.4) remains unmerged at `8f9b1c003529b1df0db08058d26691995f3e9afe`;
  its public release stays immutable. Don't merge historical beta snapshots in sequence.
- PR #132 stays an unmerged beta.3-based stable proposal at
  `7d46be37e3a538b65542719d60ea0a3157ba4c44`; its old approval manifest is a proposal,
  not acceptance of beta.5 or permission to merge/publish stable. Any future stable
  promotion must use the newest explicitly owner-accepted beta and exact source pin.
- Climate PR #131 remains separate at `d965f41214085abb1eb52d25948fb5a7d47bd020`.
  Do not reimplement/import it here. Car, future Charger redesign/guest authorization
  and EV manager integration remain deferred; no premature implementation.

## Next priority — owner real-HA acceptance

Automated success/public beta publication are not actual device acceptance.
No real HA hardware, Firefox or WebKit validation is claimed. Existing anchored
large-palette small-screen clipping remains unchanged; no redesign was authorized.

1. Owner installs beta.5 via HACS Redownload with beta versions enabled, retains
   current resource path, refreshes dashboard/cache. No new YAML keys/migration.
2. Verify cube 3 mode/alternative/tap/hold; slot 0 original brightness/name/Back;
   off/null and unavailable/group cases; White-only has no Color hint/action.
3. Verify Color/Kelvin zoom/Back and deliberate swatch application. Navigation and
   holds alone must send no light commands.
4. Verify gray Charger/generic submenus at multiple depths, dark outer border,
   root black/status styling, functional center colors and explicit overrides.
   Smoke-test Sonos artwork/Radio/Join/Sleep, presets, auto sizing/editor and pulse.
5. Keep #133/#134 and related real-device acceptance issues open until feedback is
   documented. If defects remain, start from this exact published source and use a
   NEW cumulative beta; never overwrite a tag/release or merge/publish stable.
6. Climate preparation resumes independently only when requested; Car remains
   planning-only until Climate acceptance and implementation authorization.

## Commands / continuation

```sh
git status --short
git log -5 --oneline
gh pr view 136 --repo NicolaiTandrup/honeycomb-menu-ng --json headRefOid,state,url
gh release view v1.9.0-beta.5 --repo NicolaiTandrup/honeycomb-menu-ng
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
python test/browser/beta5_ui.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta5-ui
python test/browser/beta4_navigation.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta4-regressions
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta5-docs
node test/performance/hub-benchmark.js
```

First verify release/PR/owner feedback and reuse successful exact-source evidence;
do not repeat completed implementation/publication. Complete gates are in
`.github/workflows/build.yml`, beta contract in `docs/BETA_RELEASES.md`.
Local Python `/tmp/honeycomb-beta-venv/bin/python`, button card
`/workspace/build-output/test-dependencies/button-card.js`, actionlint
`/tmp/honeycomb-actionlint-bin/actionlint`. Never npm ci through shared symlink.
Old gh CLI needs string `"publish":"true"` for `workflow run --json`; boolean
JSON fails locally before dispatch. This is client formatting, not a guard bypass.
