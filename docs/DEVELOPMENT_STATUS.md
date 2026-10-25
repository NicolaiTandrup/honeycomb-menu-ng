# Development status — cumulative v1.9.0-beta.6 candidate, NOT PUBLISHED

Updated 2026-10-25 (Europe/Copenhagen). Read AGENTS.md and latest PR/issues;
verify actual Git/head/CI before work. Do not repeat completed implementation.

## Exact review candidate and private package

- [PR #139](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/139), branch
  `fix/v1.9-beta6-ux-hardening`, base `fix/v1.9-beta5-palette-theme` (PR #136),
  **unmerged**. Tested/frozen source **`68bf88fe07aae0892705f2680a82f38c0e78848d`**.
- Foundation: immutable public beta.5 `21f1e75edd9f5c204b7b10fdb6f964371c7a01d0`
  plus existing private #137/#138 delivery `a712fb9`. Original
  `dev/issue137-light-off` branch remains intact. No v1.6 code imported.
- Normal candidate version `1.9.0-beta.6`; root HACS runtime **250854 bytes**,
  SHA256 **`707350de766c562ed95ba37246cb75f377a9a29e91b2b37043c5f5da5b72d42f`**. Repeated production build byte-identical.
- Separate private artifact **`1.9.0-beta.6-dev+68bf88fe07aa`**, exact same source,
  **250943 bytes**, SHA256 **`14b4fe0039c1368b85f69a3620471dfd76e1558ea7c4c223d55b8fd34c7e3abf`**. Rebuilt byte-identically.
  Normal/private JS compare byte-identically after normalizing ONLY exact version
  and commit constants; no different module functionality/private cache rules.
- Dev ZIP `honeycomb-v1.9.0-beta.6-dev-68bf88fe07aa.zip` in `/workspace/build-output/v19-beta6/`;
  SHA256 `9b0a325b64e7978093fc92bb48388a53a4de8a06565a333653ad410116b17de5`. Contains loader, manifest, immutable hashed runtime,
  checksums, INSTALL and self-contained installer; never rename runtime to loader.
- This documentation-only follow-up is on `docs/v19-beta6-validated-handoff` so
  the exact tested source and its required CI remain frozen. Final results live
  here/PR comments; source-branch status necessarily predates final CI.

## CI / preparation status

Push CI [40236365304](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40236365304) and PR CI [40236370674](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40236370674) are verified green at exact source below: all jobs/steps successful, both checksums match.

Read-only guarded publisher [run 40237969423](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40237969423) succeeded: verify green, publish SKIPPED, publish=false; exact branch/CI/tag-absence/metadata/rebuilt/committed/CI/staged bytes and prepared checksums/provenance validated. It created NO tag or Release. Separate owner publication approval remains mandatory.

No public beta.6 release URL exists. Do not describe staging artifacts/private ZIP
as an official GitHub/HACS release. Do not merge master or publish stable/beta.6
without separate applicable explicit owner authorization. Retention stays disabled.

## Actual completed work

- Preserve #137 OFF Hub identity: existing configured name (including templates),
  HA friendly name, readable entity fallback, above OFF. Short names supported,
  long names use existing ellipsis. ON/unknown/unavailable/standalone/promoted Back
  centers and explicit label precedence unchanged. No new YAML key.
- #138 correction: short derived release text (e.g. `v1.9.0 beta 6`) **inside the
  same golden cell** during original 430ms feedback, then normal bee restored.
  No external floating hashes/dev suffix, extra cube or Hub geometry change.
  Full version/commit remain runtime diagnostics. Stable/future beta formatting,
  actual six-edge containment at 41/60/82/110px and keyboard/touch tested.
- Measured bee defects fixed narrowly: reduced-motion flight, stale rAF creating
  a timer after detach, and rapid-trigger cleanup. Preserve normal flight.
- Existing dev loader remains byte-identical through A/B: one nonce/no-store
  manifest/document, one immutable runtime import; no polling/per-cube requests
  or duplicate registration. Normal HACS resource caching is unchanged.
- Verified one-command local static-file installer: runtime+loader SHA, source
  identity, immutable file conflicts, symlink/lock refusal; old runtimes retained,
  manifest atomically replaced last. No HA API/config/services, SSH or deployment
  executed against real HA. Builds derive private metadata only in child compiler.
- Shared gray submenu defaults, status/identity/semantic colors, explicit nested
  overrides, Root Hub black base, selected physical anchor/Back are beta.5 code
  reused and fully regression-tested, not duplicated or redesigned.
- README/AI guide cover short names, actual capability matrix/cube 3, styling,
  version/diagnostics, one-command installation and cache troubleshooting.
  CI adds new regressions and pipefail for checksum failure propagation; no
  publisher gate/workflow is weakened.

## Actual validation results

- **381 Node passes, 3 stable-only skips, zero failures**; core contracts.
- **337 full Chromium cases pass**: core 136, original coexistence 8,
  presentation 10, native Favorites 22, sizing/gradient/pulse 26, power/reference
  21 (includes seven tablet cases), wave 12, Charger 20, editor 14, artwork 8,
  beta.4 navigation 12, beta.5 defaults/pixels 14, OFF naming 6, bee 8,
  throttled/anchor 4, docs 16. No failed/skipped browser scenarios.
- **14 extra private-build browser cases** pass: real clean builds A `6590c114d002`
  and final B `68bf88fe07aa` installed by the packaged CLI into the same temporary
  www directory and loaded through identical permanent URL on ordinary reload.
  Aggressive HTTP caching, one manifest/runtime per build, no duplicate elements,
  accurate technical identity, invalid manifest and existing-runtime failures.
- Six native Sleep service-boundary contracts pass. Docs **58 YAML blocks,
  38 complete cards + 11 fragments, 217 links, 16 interactions** pass.
- Public HACS package/GPL attribution, actionlint, repeated builds, SHA/ZIP checks
  pass. New checksum-pipeline test proves validator failure cannot hide behind tee.
- 4x CPU-throttled lab: 50 cubes/1000 unrelated updates -> zero renders; one
  relevant state update -> one cube render. Current Node allocator 50-item p95
  about 0.058ms; lab-only metrics, not a historical speedup or Pi hardware proof.
- Unicode Latin/CJK/Arabic short names retained with bounded text/zero services
  in supplemental desktop/mobile QA. Existing built-in labels remain English;
  no new localization API is claimed.
- Screenshot ZIP `beta6-review-screenshots.zip` covers all eight requested surfaces,
  with full local logs/evidence under `/workspace/build-output/v19-beta6/`.
  CI `shared-cube-evidence` also includes desktop/mobile new/inherited screenshots.
- Browser plugin unavailable; existing Playwright Chromium harness used. Actual
  HA, Firefox/WebKit, real Raspberry Pi, Sonos/charger hardware not exercised.
  Owner confirmed only prior OFF names/cache refresh; new UX still needs acceptance.

## Known limit / future boundaries

At fixed 82px, a 19-cell palette spans 410px. Centered on 390px viewport it clips
10px each side. Anchor/Back preserved; no unapproved auto-shrink/paging/panning
redesign claimed. Existing numeric size/size:auto remain available. Future viewport
policy requires owner design agreement. No new module defect found by full suite.

Climate PR #131 remains separate at `d965f41214085abb1eb52d25948fb5a7d47bd020`,
CI green but not imported/published. Car #86 blocked on validated Climate reuse;
Charger #126/#129 forecast/guest redesign deferred v1.12+. HACS #92 is independent;
no catalog submission. See BETA6_REVIEW.md. Master/latest stable v1.8.1 remain at
`c1f178740c8181921033d0d18e0ac8d01afc7ea7`; all previous releases/tags/assets,
private beta.5 draft and production HA are preserved. No retention API calls.

## Owner install / next session

1. Extract the private ZIP on Node.js 20+ with access to development HA filesystem:
   `node honeycomb-dev/install-dev.cjs --www /config/www` (or actual mounted www).
2. Keep exactly one NG JavaScript Module resource:
   `/local/honeycomb-dev/honeycomb-menu-ng.js`. Resources are instance-wide; do
   not change production HA or combine two NG versions. One-time cache refresh
   can be needed only when replacing an old direct runtime with the loader.
3. Ordinary full-page Reload/F5 after future installs; no URL/query edits. Bee
   shows short version; console `.version`/`.commit` on `window.honeycombNG`
   identifies exact B. Open pages keep their code until reload.
4. Owner validates contained bee, normal/reduced motion, sizes/keyboard/touch,
   OFF names/ON/unavailable, cube-3 Color/White/White-only/zoom/Back, neutral nested
   defaults/overrides/root black, Sonos Radio/Join/Sleep, Charger/editor/multiple
   instances. Keep #137/#138 open for acceptance; no automatic issue closure.
5. Fresh session first checks PR #139/live CI/publisher status/handoff. Finish only
   pending validation/acceptance, do not repeat completed code or publish/reuse a
   tag. A later authorized publication must freshly verify exact branch/CI,
   unused tag/Release, reproducibility/provenance and set publish=true only with
   explicit owner approval. Stable/master authorization is separate again.

## Commands

```sh
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
node test/performance/hub-benchmark.js --output /tmp/beta6-performance.json
npm run build:dev -- --out-dir /tmp/honeycomb-dev
# Owner only, development filesystem; not executed against live HA in this run:
node /tmp/honeycomb-dev/install-dev.cjs --www /config/www
```

All browser/doc commands are in `.github/workflows/build.yml`; extra A/B uses
`test/browser/dev_build.py --package-a <A> --package-b <B>` plus usual bundle,
button-card/evidence args. Local Python `/tmp/honeycomb-beta-venv/bin/python`,
button card `/workspace/build-output/test-dependencies/button-card.js`, actionlint
`/tmp/honeycomb-actionlint-bin/actionlint`. Shared node_modules symlink: never npm ci
through it. Read-only publisher inputs are `/workspace/build-output/v19-beta6/prepare-inputs.json`
with publish=false; never silently change to true.
