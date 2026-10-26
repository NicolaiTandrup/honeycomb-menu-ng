# Development status — v1.9.0-beta.8 PUBLISHED AND VERIFIED

Owner explicitly authorized beta.8 publication only. Published public prerelease:
https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.8

- Exact immutable tag/source: `3c4cad33db8d47f78c3c5673d346fe40eccb8590`.
- Normal HACS JS:270656 bytes, SHA256
  `587ed3389a160bc60c9c8372322bdcd3e43a37fc904e5b730adde4b3bc5f4a15`.
- Provenance SHA256: `f766f91b4478c19ceabcff91af18cbe29cf02a82888865db2ac1e3c9959b9979`.
- SHA256SUMS.txt SHA256: `6edf02ff2091d0bf1d82415869cc0795c1515d40c669a315ca1253aac704b33b`.
- [Guarded publisher40384106919](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40384106919): publish=true; verify AND publish jobs/every
  step successful. Fresh exact head/green CI, version/unused-tag and reproducible
  committed/CI/staged/draft checks passed. No safeguards altered or bypassed.
- All3 assets independently downloaded anonymously from public release; sizes,
  GitHub digests/sums, exact source Git bytes, provenance and normal bundle verified.
  Tag points directly to approved source. HACS root filename/content metadata valid.
- 53 prior API-visible releases/assets and106 prior tags verified unchanged;
  new counts54/107. Historical private beta.5 API-visibility exception below remains
  unconfirmed, not a new disappearance finding. No deletion/overwrite issued.
- Stable remains v1.8.1; master remains c1f178740c8181921033d0d18e0ac8d01afc7ea7.
  PR #142 remains open/unmerged, source branch frozen/clean; no production HA or
  retention change. Handoff-only publication record stays on a separate branch.
- Exact-source CI40377756453/40377766916 and preparation40381755296 remain green:
  398 Node passes/3 stable-only skips,402 Chromium scenarios,6 Sleep contracts;
  docs/HACS/packaging/performance/workflow/reproducibility as archived below.

## HACS installation and stop point

On the development HA instance, HACS → Honeycomb Menu NG → Download/Redownload →
Show beta versions → select **v1.9.0-beta.8**. If needed first add custom repository
NicolaiTandrup/honeycomb-menu-ng, category Dashboard. Keep button-card and exactly
one NG JavaScript Module resource:
`/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js` (retain HACS-managed query).
Disable the optional private DEV loader resource when switching to HACS; do not
load both NG runtimes. Reload dashboard/browser; console
`window.honeycombNG.version` should be `1.9.0-beta.8`, no -dev suffix.
Public release/assets/metadata satisfy HACS beta discovery/install requirements;
no actual HACS/HA device installation test was executed by Codex.

STOP. Await owner real-HA testing; keep #140 open. No additional development,
beta.9, master merge or stable publication is authorized. Existing compact/content
limits and inherited mobile Light clipping remain in archived acceptance notes.
Evidence: /workspace/build-output/v19-beta8/publication/public-verification.json,
publish-inputs.json, before/after inventories and downloaded public assets.

## Archived candidate/preparation evidence

The following was recorded before publication; earlier withheld-approval/absent-tag
statements describe that checkpoint and are superseded by the verified result above.

# Development status — beta.8 candidate VALIDATED; publication NOT authorized

Issue #140; review PR #142: https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/142
Read AGENTS.md and fresh issue/PR/branch state before continuing. This final
publication-readiness handoff is separate from frozen source; source-tagged status
necessarily predates completion of CI/preparation. Owner authorized
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
- Source docs pass: 59 YAML blocks, 44 complete cards +11 fragments, 235 local
  links and18 desktop/mobile interactions (full/docs/documentation-results.json).
  Workflow lint and core benchmark pass; no unrelated dependency allocations.
- 18 synthetic desktop/tablet/mobile reference screenshots +6 before/Info/return
  strips in review/. CI shared-cube-evidence includes full/compact three-cell
  before/Info/return screenshots. No private owner configuration/images committed.
- Local inherited groups began before the final Info-only refinement; final63
  Info cases/docs cover final bytes. Exact-head GitHub CI remains authoritative
  for the entire cumulative tested source. No false exact-local-all-bytes claim.

## Final exact-source CI and preparation — ALL GREEN

- [Push CI40377756453](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40377756453)
  and [PR CI40377766916](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40377766916):
  exact3c4cad3/feature branch, attempt1, every build/lint job and every step successful.
  Matching normal bundle and shared-cube-evidence artifacts present/unexpired.
- [Guarded prepare40381755296](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40381755296):
  explicit workflow_dispatch, publish=false, exact source/tag/branch metadata.
  Verify job/every step successful, publish job SKIPPED. Fresh branch/CI/tag gates,
  CI/staged/committed/rebuilt HACS byte/checksum comparisons pass. Source guards
  were unchanged. No tag, draft or release was created.
- [Prepared artifact12677964330](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40381755296/artifacts/12677964330):
  verified-beta-3c4cad33db8d47f78c3c5673d346fe40eccb8590, 87325-byte archive,
  archive digest dcc74bcce25d5db414cc506809eb8612114cb176e0e4aa18762646630b315f33.
  Contains normal JS, SHA256SUMS.txt and exact source/CI release-provenance.json.
  Archive digest is NOT the JavaScript checksum.
- Public commit-pinned JavaScript independently downloaded and compared with
  local committed/rebuilt bytes; normal version banner and no DEV loader verified.
  Source tree: dad6dceef6facfa5ed4aab5e2b52ab9294962cff.
- Staged private Actions bytes/provenance verified inside the guarded GitHub
  runner. Independent workspace Actions-archive download was not claimed (earlier
  workspace Azure artifact proxy limitation persists). Public pinned-source JS
  verification above succeeded. No release asset is public before authorization.
- Final Markdown-only handoff validation passes:59 YAML,44 cards+11 fragments,
  238 local links and18 desktop/mobile documentation interactions.
- After preparation: beta.8 tag/release still absent; source head3c4cad3 clean,
  beta.7 tag/source/PR#141 and three assets unchanged, stable/master unchanged.

## Next authorized step — STOP for owner review

Candidate is technically ready for guarded HACS prerelease publication, but the
owner explicitly withheld beta.8 publication approval. Do not dispatch publish=true,
merge any PR or publish stable. Do not start beta.9/another feature. #140 stays
open. Review [reference/schema](INFO_CUBE.md) and [owner checklist](V1_9_BETA8_REVIEW.md).

After separate explicit approval, re-verify current branch/PR head, latest matching
CI, unused tag/release, metadata/reproducibility and publisher guards. Publish
v1.9.0-beta.8 from exact3c4cad33db8d47f78c3c5673d346fe40eccb8590 only if still
current/tested; never silently substitute a moved commit or bypass gates. Then
independently verify release/tag/assets/HACS before claiming publication.
Real-HA acceptance follows on the owner's development instance, not production.

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

## Historical beta.7 preservation audit exception — owner confirmation pending

Carried from beta.7 publication, not a fresh beta.8 deletion finding: all 52 prior public release records / 81 public assets and 105 prior tags verified
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
