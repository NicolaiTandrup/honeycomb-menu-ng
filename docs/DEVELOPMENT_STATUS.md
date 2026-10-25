# Development status — cumulative v1.9.0-beta.6 candidate (unpublished)

Updated 2026-10-25 (Europe/Copenhagen). Read AGENTS.md, latest PR/issue comments
and live Git/CI before changes. Do not restart completed #137/#138 work.

## Source and authorization

- Active branch `fix/v1.9-beta6-ux-hardening`, based on exact private delivery
  `a712fb95bbea2e5ac59956735391f975d808111f`, itself cumulative public beta.5
  `21f1e75edd9f5c204b7b10fdb6f964371c7a01d0` plus #137/#138 development work.
- Public beta.5/PR #136 remain immutable/unmerged. Original development branch
  `dev/issue137-light-off` preserved. Master/latest stable v1.8.1 remain at
  `c1f178740c8181921033d0d18e0ac8d01afc7ea7`. No production HA change.
- Owner authorizes candidate implementation, full tests, PR and private package;
  **no beta.6 publication, master/stable merge, tag or retention change**. Owner
  has verified prior dev OFF names/cache refresh on development HA; the corrected
  contained bee/version and cumulative candidate still need actual-HA acceptance.

## Implemented checkpoints

- Preserved #137 `24b6ade`: OFF Hub-only existing name/friendly/entity + OFF;
  ON/unknown/unavailable/standalone/promoted centers unchanged. Existing templates
  and explicit secondary labels retain precedence; no new YAML key.
- `afda315`: short computed version inside the golden bee cell, not an external
  technical overlay. Stable/future beta/dev formatting; technical version/source
  remain in diagnostics. Text measured within all six fill edges at 41/60/82/110px.
- `606a46b`: atomic one-command development installer, runtime+loader checksums,
  source identity, immutable files, manifest last, conflict/symlink/lock refusal.
  Normal candidate package is beta.6; child-only private flag derives dev+commit.
  Public version/provenance guards and production caching remain unchanged.
- `6590c11`: reproduced reduced-motion flight and late disconnected rAF/timer;
  now respects motion preference and cancels pending animation on repeat/detach.
  No other module/render/navigation redesign. New measured performance/capacity
  tests supplement inherited regressions.
- README/AI guide now document short names/capability matrix, cube 3, styling,
  source/visible version distinction, fixed resource, installation/cache failures
  and unpublished status. Future-module review remains documentation only.
- CI test additions cover OFF naming, contained bee/motion/lifecycle, throttled
  updates and anchors. `pipefail` makes checksum-validator pipeline fail closed;
  no publisher guard is relaxed or release workflow changed.

## Actual validation so far / current work

- Complete initial Node run: **380 passed, 3 stable-only skipped**. New checksum
  pipeline test and installer tests pass locally; rerun full final suite next.
- Bee current build: **8 desktop/mobile cases pass**, including keyboard/touch,
  repeat/detach/reduced-motion and frame-by-frame six-edge text containment.
- New hardening: **4 desktop/mobile cases pass**. At 4x Chromium CPU throttling,
  50 Light cubes/1000 unrelated updates cause zero renders; one relevant update
  renders one cube. This is a lab proxy, not actual Raspberry Pi hardware proof.
- Core benchmark passes. Public beta.6 build/HACS package checks pass; latest
  bundle 250854 bytes, SHA256
  `707350de766c562ed95ba37246cb75f377a9a29e91b2b37043c5f5da5b72d42f`.
- Full final browser/docs/YAML/reproducibility/workflow/CI and private A/B package
  installation/reload validation are now in progress. Do not mark complete until
  actual results are recorded. Evidence `/workspace/build-output/v19-beta6/`.
- Browser plugin unavailable; existing Playwright Chromium harness used. Do not
  claim Firefox/WebKit, real HA, hardware video replay, charger or Sonos acceptance.

## Known measured limitation / future boundaries

Fixed 82px 19-cell palette spans 410px: centered in 390px view, 10px each side
clips. Preserve selected anchor/Back and numeric size; no paging/shrink redesign
was authorized implicitly. Future viewport policy needs owner agreement.
Ordinary submenu gray fill/inner/dark outer with explicit/semantic exceptions
and root Hub black/status colors are existing beta.5 code: test, do not duplicate.

Climate PR #131 is independent at `d965f41214085abb1eb52d25948fb5a7d47bd020`,
CI green but not imported or authorized for publication here. Car #86 blocked on
validated Climate reuse; #126/#129 forecast/guest redesign deferred v1.12+.
HACS #92 is independent; no external catalog submission. See BETA6_REVIEW.md.

## Next steps in priority order

1. Finish full final local suite; fix only reproduced defects, document counts.
2. Commit/push reviewable checkpoint, open cumulative beta.6 PR against beta.5
   source branch, verify exact matching push/PR CI and uploaded evidence.
3. Build private A and final B from clean committed source with build:dev;
   test atomic installer plus two ordinary reloads using the permanent URL.
   Package B and checksum; full public runtime stays normal beta.6 metadata.
4. Freeze tested source/head. Record final CI/artifact/private checksums in a
   docs-only handoff if needed so exact CI remains reviewable. Update #137/#138.
5. Deliver install instructions + HA checklist and stop before publication/merge.

## Commands / environment

```sh
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
node test/performance/hub-benchmark.js --output /tmp/beta6-performance.json
npm run build:dev -- --out-dir /tmp/honeycomb-dev
# Owner runs installer only against development HA filesystem:
node /tmp/honeycomb-dev/install-dev.cjs --www /config/www
```

Browser suites are all commands in `.github/workflows/build.yml`; local Python
`/tmp/honeycomb-beta-venv/bin/python`, button card
`/workspace/build-output/test-dependencies/button-card.js`, actionlint
`/tmp/honeycomb-actionlint-bin/actionlint`. node_modules is a shared symlink;
do not npm ci through it. No live HA commands, deployment, tag/release mutation
or retention API calls are needed. Previous validated reports remain in Git history.
