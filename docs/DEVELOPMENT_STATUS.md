# Development status — beta.8 candidate IMPLEMENTED; final CI in progress

Issue #140; review PR #142: https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/142
Read AGENTS.md and fresh issue/PR/branch state before continuing. Owner authorized
beta.8 development and preparation ONLY. No beta.8 publication, merge or stable
promotion. Do not modify live HA, retention or existing release/tag/asset history.

## Exact frozen candidate

- Baseline: published beta.7 `63a9619d27fe503919389f1a51090a2a01193f80` (PR #141).
- Feature branch: `feature/issue140-info-cube-beta8`.
- Exact candidate/source: `3c4cad33db8d47f78c3c5673d346fe40eccb8590`.
- Normal HACS JS: 270656 bytes, SHA256
  `587ed3389a160bc60c9c8372322bdcd3e43a37fc904e5b730adde4b3bc5f4a15`.
- Package/lock/release/banner all v1.9.0-beta.8. Normal module, NOT the optional
  development loader; no -dev/hash banner. Independent production rebuild is
  byte-identical. HACS/package/GPL/attribution and beta metadata checks pass.
- PR #142 targets frozen beta.7 branch for a scoped follow-up diff; cumulative
  code retains all beta.7 modules. PR #141 stays open/unmerged/head unchanged.
- Source worktree stays clean/frozen. This handoff is on separate
  `docs/v19-beta8-validation-handoff`; do not move source during gate preparation.

## Implemented and validated locally

Owner's latest text/annotated designs reviewed in conversation. The requested
hex is now centered at caller slot 0 and bounded by actual natural inward notch
junctions of shared first-ring cells. Maximum at 82px: 163.1443 × 188.3827px.
Smaller scale/viewport fitting never translates it, changes underlying layout or
grows with content. Shared CubeElement keeps independent existing colors.center
(center fill), inner_border, outer_border; no renderer/numeric-engine duplication.
Transparent input shield, stationary visible/inert original cubes, source-facing
border-gutter connector inherits actual source inner color (override/disable).
Every source slot 0–18 and promoted/nested module centers covered. Same-update
source color resolves before Info; unrelated text is not remeasured.

Automatic hex-aware wrapping, stack/positioned, static/live scalar title/body/
blocks and optional custom footer; prefixes/suffixes/fallback. Fixed readable
fonts, bounded pagination/limits; tiny sizes report content limits rather than
empty-page loops. Existing exact tap/keyboard return and fixed 30-second close-all
preserved. Resize/position observers dispose on teardown; no polling/services.

- 398 Node passes /3 stable-only skips; core contract groups pass.
- Complete local 402 Chromium scenarios including63 Info and18 docs interactions;
  eight additional coexistence checks included. Six native Sonos Sleep contracts.
- Full suite protects Light/Hue/Kelvin/capabilities/OFF, Sonos native Favorites/
  Radio/Join/Sleep, Charger/editor/labels, 82px geometry, gradients/pulse/color/
  power, autosize/numeric sizes, navigation/touch/allocation, lifecycle/performance.
- Docs/YAML/examples/links pass (exact count in full/docs/documentation-results.json).
  Workflow lint and core benchmark pass; no unrelated dependency allocations.
- 18 synthetic desktop/tablet/mobile reference screenshots +6 before/Info/return
  strips in review/. CI shared-cube-evidence includes full/compact three-cell
  before/Info/return screenshots. No private owner configuration/images committed.
- Local inherited groups began before the final Info-only refinement; final63
  Info cases/docs cover final bytes. Exact-head GitHub CI remains authoritative
  for the entire cumulative tested source. No false exact-local-all-bytes claim.

## Required next steps — do not repeat completed implementation

1. Await exact-head push CI40377756453 and PR CI40377766916. Both presently running;
   workflow-lint green, push through full base and subsequent module groups,
   PR browser installation completed and base scenarios running. Verify every
   job/step success; do not dispatch against stale earlier868d785/707edb4 runs.
2. If green, run unchanged guarded release.yml with publish=false, expected_commit
   3c4cad33db8d47f78c3c5673d346fe40eccb8590, expected_tag v1.9.0-beta.8,
   ref feature/issue140-info-cube-beta8. Inputs prepared outside Git; verify fresh
   branch head/CI, staged bundle/provenance/sums and immutable unused tag/release.
   Never publish=true: separate owner approval required.
3. Record CI/preparation/artifact/checksum evidence in this handoff and PR #142;
   post concise final issue #140 comment, validate Markdown/examples and push
   handoff branch. Then stop for owner review; do not close #140 or start beta.9.

## Commands / evidence

```sh
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-beta.js
node scripts/check-hacs-package.js
node test/performance/hub-benchmark.js
python test/browser/info_cube.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v19-beta8/info
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v19-beta8/docs
```

Python: /tmp/honeycomb-beta-venv/bin/python. All evidence outside Git:
/workspace/build-output/v19-beta8/; run-full.py, full/validation.json and logs,
review/, info-final.log, repro-approved/, preparation-notes.md, prepare-inputs.json.
Browser plugin unavailable; repository Playwright Chromium fallback used.
Source bundle link: feature/issue140-info-cube-beta8/honeycomb-menu-ng.js.

## Limits / acceptance / protected state

No actual HA/HACS/Terminal/device test or physical charging command was executed.
Owner earlier Light/bee and beta.7 dynamic text feedback is separate from beta.8
acceptance. Chromium desktop1100/tablet768/mobile390 only; no Firefox/WebKit/native
pinch/physical Pi claim. Fixed30s,128blocks,32768chars,64pages; positioned overflow
explicit; very small panels can limit content. Keep floorplan anchor visible.
Existing fixed410px Light palette clipping on390px remains inherited.
No Climate/Car/CM expansion. #140 stays open for real-HA acceptance.

Latest stable v1.8.1 and master c1f178740c8181921033d0d18e0ac8d01afc7ea7 verified
unchanged. Beta.7 source/tag and all3 assets' digests/sizes unchanged. No release/
tag writes occurred; beta.8 tag and release absent. Private beta.5/retention never
modified; historical API visibility exception below still needs owner confirmation.

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



[Candidate schema/reference](INFO_CUBE.md) · [review and owner checklist](V1_9_BETA8_REVIEW.md).
