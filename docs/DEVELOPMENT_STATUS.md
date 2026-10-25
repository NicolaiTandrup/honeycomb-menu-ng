# Current handoff — v1.9.0-beta.6-dev ready for owner testing (#137/#138)

Updated 2026-10-25 (Europe/Copenhagen). Read AGENTS.md and live owner comments.

## Exact development candidate (not a public beta)

- Active branch `dev/issue137-light-off`; exact approved public beta.5 foundation
  `21f1e75edd9f5c204b7b10fdb6f964371c7a01d0`. PR #136 and public beta.5 untouched.
- #137 separately committed/pushed as `24b6adedbaa158fb860a50bf16b77a59ee70bd48`.
- #138 separately committed/pushed as `6e03e68ef53843920299f8c3df296df4716ce1c4`,
  then build/source-conflict test follow-up `00c572ea55e8e5850fd2a49c97c437662348f005`.
- **Exact built source:** `00c572ea55e8e5850fd2a49c97c437662348f005`.
  Embedded running version: **`v1.9.0-beta.6-dev+00c572ea55e8`**.
- Runtime: **249568 bytes**, SHA256
  **`8eff8adc2a08572310b8a27771db2f91cc8c01a33ce73d46bf180424ca256f94`**.
  Rebuilt twice byte-identically from that clean committed source. The following
  delivery/handoff commit contains only this generated runtime and this status
  update; its SHA is not the source version embedded into the already built JS.
- Tracked root `honeycomb-menu-ng.js` is the full runtime. Deployable folder uses
  that same byte-identical runtime under an immutable content-hash filename;
  its **permanent resource file is instead the small development loader**.
- Local delivery ZIP:
  `/workspace/build-output/issue137-dev/honeycomb-v1.9.0-beta.6-dev-00c572ea55e8.zip`.
  Contents: `honeycomb-dev/` loader, manifest, hashed runtime, checksum, INSTALL.
  ZIP SHA256 `a3f2cf68227256d9fc5c74e21f1b7b208a1ee61880292d0ac5f699568e5eb20a`.
  No official Release, tag or public publisher invocation requested/performed.

## Implemented and actually validated

- #137: OFF Light Hub launchers use existing item `name` (including templates),
  then HA friendly_name, then readable entity ID, above `OFF`. Short names work;
  long names retain shared ellipsis. Explicit secondary-label overrides retain
  precedence. ON presentation/colors/brightness, standalone/classic controls,
  promoted Back centers, Color/White capability behavior and zoom unchanged.
  Unknown/unavailable remains `Unavailable`, never `OFF`. No new configuration key.
- #138: stable development-only loader at
  `/local/honeycomb-dev/honeycomb-menu-ng.js`; once per document it fetches a
  nonce/no-store manifest and imports an immutable hashed runtime. No polling or
  per-cube fetch. Concurrent loader imports deduplicated. Invalid metadata and
  already-loaded NG runtime fail clearly before importing a second runtime.
- Compiled version and Git source ID are displayed beneath the bee for its
  existing 430 ms flight. Absolute overlay, no extra cube or layout shift;
  keyboard Enter/Space, mouse and touch tested. Label disappears with the flight.
  Missing metadata fallback is graceful; normal releases retain normal version
  strings. Production/HACS resources retain direct-bundle caching behavior.
- **43 targeted Node tests pass**: Light OFF, palette capability/state behavior,
  recursive Hue/Kelvin zoom, dev/release/fallback metadata. Core contracts pass.
- **26 targeted Chromium cases pass**, 1100x900 and 390x844:
  six new OFF-name/transition/fallback/template/refresh/containment/navigation;
  eight bee version/keyboard/touch/no-shift + two-build reload/deduplication/
  invalid-manifest/existing-runtime tests; twelve inherited Light palette,
  protected Hub/Light/Sonos pixel comparisons, Charger/Light/Sonos navigation,
  state/color/animation galleries and dependency-aware update regressions.
- Two **real clean Git builds** A (`6e03e68ef538`, hash `473f6f87...aca8dc3`)
  and B (`00c572ea55e8`, final hash above) loaded consecutively through identical
  resource URL under aggressive one-year HTTP caching. Loader bytes unchanged;
  ordinary reload fetched one new manifest and one distinct runtime per build.
  No custom-element re-registration, no polling or services during navigation.
- Build syntax, repeated byte comparison, SHA256 verification, ZIP integrity and
  new YAML example passed. Screenshots reviewed: OFF names, ON unchanged, bee
  version overlay; computed bounds/pixels confirm no protected layout changes.
- Browser plugin unavailable; repository Playwright Chromium harness used.
  Evidence/logs outside Git `/workspace/build-output/issue137-dev/`.
- **Full public release CI/provenance/publisher intentionally not required** by
  this task. Automatic push CI at source B
  https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40231237840
  reports successful core-tests/build/workflow-lint steps, then HACS package
  validation failure; downstream browser jobs skipped. Local validator confirms
  `Unsupported release version` for private `-dev`. No release guard/workflow
  changed or bypassed; do not report this branch as public-release CI-green.
  Private Actions logs download is Forbidden; jobs/steps API inspected instead.

## Owner deployment / remaining acceptance

See [DEVELOPMENT_BUILDS.md](DEVELOPMENT_BUILDS.md) for full instructions.

1. Only the independent development HA instance: copy complete ZIP contents to
   `/config/www/honeycomb-dev/`, immutable runtime first, manifest last/atomically.
   Use exactly one NG resource (JavaScript Module):
   `/local/honeycomb-dev/honeycomb-menu-ng.js`. Never point it directly at the
   runtime under the loader's filename. Lovelace resources are instance-wide.
2. First installation replacing a cached direct-runtime file at the same URL
   can need a one-time cache refresh; subsequent loader-based updates require
   ordinary full-page Reload/F5 only, no URL/query changes. Soft dashboard
   navigation is not a full document reload. Leave open pages on their old build.
3. Real HA/proxy acceptance still pending. Proxy must honor cache bypass or
   distinct manifest query nonces; deliberate stale responses ignoring both
   cannot be repaired by client JS. Firefox/WebKit and actual HA/Sonos/charger
   hardware have not been tested. No deployment/live HA commands performed.
4. Owner checks: multiple OFF lights/short/friendly/long names, ON/OFF/unavailable,
   reload; cube 3 Color/White tap/hold, White-only, Hue/Kelvin zoom/Back; bee flight
   version/disappearance/no movement; ordinary reload after next deployed build;
   Sonos Radio/Join/Sleep and Charger/root Hub smoke tests. Keep #137/#138 OPEN.
5. Next session: read the issue results/feedback, inspect this branch and its
   artifact/source distinction, then fix only validated defects. Do not repeat
   implementation/publication or create a competing OFF-label/loader engine.
   Public beta/stable work still requires its normal exact-source gates and
   separate applicable owner authorization. Climate remains independent, Car
   and future Charger redesign remain deferred.

## Commands used

```sh
node --test test/light-off.test.js test/dev-build.test.js test/light-palette.test.js test/color-zoom.test.js test/kelvin-zoom.test.js
node test/run-tests.js
npm run build:dev -- --out-dir /workspace/build-output/issue137-dev/build-b
# Above ran at clean source 00c572e. A fresh commit intentionally gets a new ID.
node --check /workspace/build-output/issue137-dev/build-b/honeycomb-build-8eff8adc2a08572310b8a27771db2f91cc8c01a33ce73d46bf180424ca256f94.js
/tmp/honeycomb-beta-venv/bin/python test/browser/light_off.py --bundle /workspace/build-output/issue137-dev/build-b/honeycomb-build-8eff8adc2a08572310b8a27771db2f91cc8c01a33ce73d46bf180424ca256f94.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/issue137-dev/final-light
/tmp/honeycomb-beta-venv/bin/python test/browser/dev_build.py --bundle /workspace/build-output/issue137-dev/build-b/honeycomb-build-8eff8adc2a08572310b8a27771db2f91cc8c01a33ce73d46bf180424ca256f94.js --button-card /workspace/build-output/test-dependencies/button-card.js --package-a /workspace/build-output/issue137-dev/build-a --package-b /workspace/build-output/issue137-dev/build-b --evidence-dir /workspace/build-output/issue137-dev/final-loader
/tmp/honeycomb-beta-venv/bin/python /workspace/build-output/issue137-dev/targeted-smoke.py
```

Protected: master/latest stable remains v1.8.1 at
`c1f178740c8181921033d0d18e0ac8d01afc7ea7`; no PAHA01/production HA modification,
release/tag/asset deletion/overwrite, merge or retention changes.

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
