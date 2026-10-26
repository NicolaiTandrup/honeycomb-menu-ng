# Development status — v1.9.0-beta.8 Info visual correction IN PROGRESS

Baseline published beta.7 `63a9619d27fe503919389f1a51090a2a01193f80` (PR #141).
Active branch: `feature/issue140-info-cube-beta8`; issue #140; review PR #142
(https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/142), targeting frozen
beta.7 branch for a scoped diff. Owner authorized
implementation, testing, candidate PR/preparation only; NOT beta.8 publication,
stable merge or production Home Assistant changes. Read AGENTS.md before resuming.

## Current implementation / validation

- Owner final inner-notch clarification and all current issue comments read;
  three annotated reference images reviewed in the user conversation. Synthetic
  fixtures compare full/compact compositions without copying private names.
- Shared CubeElement shell retained. Foreground now centered, maximum computed
  from actual shared six first-ring cell intersections/notch half-planes.
  At 82px: 163.1443 × 188.3827px. Smaller scale/viewport constraints never move
  caller/center or grow with payload. Transparent shield; surrounding cells inert.
- Actual source passed by common cube action/event path; source-facing border
  segment inherits resolved source inner color, supports override/disable.
- Title/body/blocks retain binding/wrapping; custom footer supports the same
  contract. Position observer handles responsive anchor updates; all observers
  disposed on close. Tiny panels avoid empty-page loops; report content limits.
- 398 Node passes /3 stable-only skips; 63 targeted Info Chromium cases pass
  across desktop/tablet/mobile. Full inherited suite remains in progress.
  First targeted browser pass identified old
  enclosing-footprint assumptions, a responsive observation timing bug and
  overlapping fixture instances; corrected. A source-update ordering test also
  verifies live source color without remeasuring unrelated text. Complete inherited validation still
  PENDING. Do not claim completed CI or hardware tests.

## Recoverable checkpoints

- `0b02e10`: centered notch geometry, shared three-layer shell, actual source path,
  source-facing connector, safe footer/compact text handling and broad regressions.
- `868d785`: schema/AI/reference/README and initial handoff; PR #142 created.
- `707edb4`: source colors resolve before Info on the same HA update; targeted
  desktop/tablet/mobile transition passes. Normal HACS bundle never uses DEV loader.
- Follow-up before final freeze: reserve measured footer gutter while using
  available body area, add source-color transition to full Info suite, style/scale/
  footer YAML examples. Final source checksum recorded after full checks below.
- 18 dedicated reference screenshots and six before/Info/return comparison strips
  outside Git (`review/`); screenshot assertions prove text bounds, exact caller
  geometry, no services and clean console. Browser plugin unavailable.
- Local runner: `/tmp/honeycomb-beta-venv/bin/python /workspace/build-output/v19-beta8/run-full.py`.
  Earlier local inherited groups began before the final Info-only refinement;
  exact-head GitHub CI is authoritative for the final cumulative bytes.

## Remaining priority

1. Finish targeted Info tests, screenshots/geometry/text/footer containment and
   module/source-slot return. Fix only genuine defects.
2. Run complete existing unit/contracts/browser/docs/performance/lint/HACS suite,
   build reproduction/checksum. Commit/push tested milestones; open beta.8 PR.
3. Verify exact push/PR CI, guarded `publish=false` preparation and staged source/
   asset provenance. No `publish=true` dispatch without new owner approval.
4. Record exact commit/checksum/CI/screenshots here and in issue/PR, then stop for
   owner review. #140 stays open for actual HA acceptance.

## Commands

```sh
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-beta.js
node scripts/check-hacs-package.js
node test/performance/hub-benchmark.js
python test/browser/info_cube.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v19-beta8/info
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v19-beta8/docs
```

Browser plugin unavailable; repository Playwright/Chromium used. Python environment
`/tmp/honeycomb-beta-venv/bin/python`. Evidence outside Git:
`/workspace/build-output/v19-beta8/`. Full inherited runner will be recorded here.
No Firefox/WebKit/live HA/real HACS install or physical charging commands claimed.
Stable v1.8.1/master and all previous release/tag history remain protected;
retention untouched. No Climate/Car/CM implementation or unrelated design work.

## Preservation audit exception — owner confirmation pending

All 52 prior public release records / 81 public assets and 105 prior tags verified
unchanged. Publisher's own before/after preservation assertions passed. No
release/tag delete, overwrite or force command was issued; old Git history/branches
remain. Source branch and every existing PR were left unmerged.

However, local authenticated REST now returns 404 and GraphQL null for the private
v1.7.1-beta.5 draft ID 419308278 (initial inventory included it and three assets).
Its independent preservation cannot be confirmed from this token/API result.
This does not establish deletion or its cause. Owner UI confirmation was requested.
Do not assert it retained/deleted, recreate it, change it, or issue further release
mutations to hide the discrepancy. Record the owner's confirmation when available.


[Candidate review and acceptance checklist](V1_9_BETA8_REVIEW.md).
