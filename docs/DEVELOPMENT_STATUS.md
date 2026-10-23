# Development status — continuation checkpoint

Updated: 2026-10-23. Read `AGENTS.md`, then verify live GitHub state before acting.
This file is a checkpoint, not a substitute for CI/release verification.

## Protected baseline and active branches

- Latest stable/master: **v1.8.1**, master
  `c1f178740c8181921033d0d18e0ac8d01afc7ea7`. No master/stable promotion authorized.
- Published cumulative beta.2: `b25164f025129d257e6700e7029d114ce9a0bba5`,
  [release](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.2),
  [PR #127](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/127), unmerged.
- Tested beta.3 source: **`8a57ccd225cf95a22685c86fafda1a674bd649d2`**,
  branch `fix/issue125-radio-beta3`,
  [PR #130](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/130), unmerged.
  Its publication is independently verified; preserve the immutable tag/assets.
- Current feature/handoff branch: **`feature/v1.10-climate`**, based on exact
  tested beta.3. Permanent handoff instructions are committed at `5320ea2`.
  Last validated functional commit: **`ea64da63823edc7b9ba0dffd9aeeae3a56b9e27d`**
  (`79f172e` implementation, `720f0fd` browser/docs, `ea64da6` late-ACK feedback).
  All local suites pass; follow-up handoff/test-report changes do not change runtime. [Climate PR #131](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/131)
  is draft while exact-head CI runs; mark ready only after every required check passes. No Climate
  tag/release has been published or is authorized by this task.
- Relevant issues: [#125 artwork acceptance](https://github.com/NicolaiTandrup/honeycomb-menu-ng/issues/125),
  [#87 Climate](https://github.com/NicolaiTandrup/honeycomb-menu-ng/issues/87),
  [#106 roadmap](https://github.com/NicolaiTandrup/honeycomb-menu-ng/issues/106).

## Completed — do not repeat

Owner real-HA beta.2 acceptance confirms Charger two-row labels, editor overlay
positioning, simultaneous charging, individual/aggregate power/counts and pulse.
The remaining owner-reported defect was Sonos radio logo containment.

Beta.3 implementation is committed in `ad3bc39` + release metadata `8a57ccd`:

- Shared Sonos safe-area policy for launcher, promoted center and Radio favorites;
  aspect-contained square/wide/tall images, sloping-edge padding and text space.
- Regression measures actual painted corners against all six inner-fill edges.
  Square-logo clearance in the synthetic 82px fixture: player 1.8px -> 7.9px;
  favorite 8.2px -> 12.0px. No actual owner device/video test is claimed.
- Charger source, editor controller, numeric sizing and wave logic unchanged.
  Sonos recognition/order/native Browse Media/Join/Sleep and Light retained.
- **Actual validation:** 341 Node cases passed, 3 stable-only skips; 6 Sleep Timer
  boundary contracts; **286** desktop/mobile Chromium cases (278 existing + 8 new).
  Docs/YAML/links, performance, HACS packaging/license, actionlint and repeated
  byte-identical production builds passed locally.
- Both exact-head CI runs passed:
  [push 39950584897](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39950584897),
  [PR 39950638026](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39950638026).
- Tested bundle: **244847 bytes**, SHA256
  `29879439c38eb46c95cb0fd6f87407e5dd4c33d182aef7318748ca1a7c2a415b`.

## Completed — beta.3 publication independently verified

[Public beta.3](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.3)
is published from exact tested source `8a57ccd225cf95a22685c86fafda1a674bd649d2`.
[Guarded publisher 39991372795](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39991372795)
passed. All three assets downloaded without authentication; bundle bytes,
SHA256SUMS, provenance, tag, asset digests and prerelease/public flags matched.
Inventory: all 49 earlier releases/assets and 101 earlier tags preserved; now
50 releases / 102 tags. Private beta.5 draft/assets, master/latest stable v1.8.1
and retention unchanged. PR #130 is open/unmerged; #125 awaits owner logo acceptance.
Do not dispatch this beta again or modify its tag/assets.

Permanent continuation instructions committed/pushed at `5320ea2` on the current
feature branch. Documentation contracts, YAML/links and all 16 desktop/mobile docs
checks passed after adding the handoff. No runtime changes in that checkpoint.

## Active priority — Climate v1.10.0 (separate review candidate)

Current branch: `feature/v1.10-climate`, based on exact published beta.3. Candidate
metadata is `1.10.0-beta.1` solely to distinguish its test bundle; **unpublished**.
[Review PR #131](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/131) targets
`fix/issue125-radio-beta3`; it remains draft until full regression/CI completion. No Climate publication/merge/stable is authorized here.

Implemented:

- Shared module/renderer for Hub and Control, 82px default and existing auto sizing.
- Main slots: 0 live current/target/status; 1 +2 native steps; 2 advertised HVAC
  chooser; 3 capability categories; 4 −2 steps; 5 −1 step; 6 +1 step.
- Owner-approved HVAC chooser (no guessed power restoration), explicit Low/High
  range selection, native units/steps/bounds and exact advertised services/choices.
- Preset/fan/swing/horizontal capabilities, truthful unavailable/read-only states.
- Exact-target serialized command bridge; Sending/Awaiting HA vs failed/unconfirmed,
  15-second acknowledgement/timeout and no automatic retry or service-on-render.
  HA state acknowledgement wins over a late transport rejection; a missing value
  cannot falsely acknowledge a legitimate zero-degree target. Both are unit tested;
  late response feedback is also exercised on desktop/mobile.
- Native Defrost first unless explicit switch mapping overrides; optional read-only
  registry lookup requires exact semantics + unambiguous same-device/platform/config
  entry. Denied/missing/ambiguous metadata never guesses from names or areas.
- Generic `honeycomb-open-nested` child descriptor with explicit `module`/`entity`;
  real center/Back context works from ordinary parents and standalone Control.
- New Climate unit/browser tests, mandatory CI browser step, synthetic complete YAML,
  README and precise versioned AI/Climate guide. No Car or Charger redesign.

Research: HA core `ebea8e72ef5ac27b24ac5c1bf051cab46fa48dd0` climate const/entity/
services + registry, current HA frontend temperature control and research PR #112.
HA fallback step is 0.5°C / 1°F only if the attribute is absent. HA metadata does
not universally identify switch purpose; explicit user-confirmed mapping is required
when discovery cannot prove it. No helper/backend/real HA configuration is modified.

Actual local validation at this implementation checkpoint:

- Full Node suite: **366 passed / 3 stable-only skips** (369 total), including
  **25 new Climate cases**; no failures.
- Climate browser suite: **28 desktop/mobile cases passed**, including standalone/
  generic child centers, command failure/unconfirmed/reconnect, Light alignment,
  explicit ranges, capability changes/Back, auto sizing, idle and lifecycle.
  Forty-cube/1000 unrelated state updates: zero rerenders; one relevant update
  rerenders one cube; one deduplicated registry read. This is synthetic Chromium,
  not a real-HA hardware claim.
- Documentation: **61 YAML blocks**, 44 complete cards + 11 contextual fragments,
  217 local links; **20 desktop/mobile documentation interactions passed**.
- Full inherited + Climate browser validation: **325 scenarios passed**: core 136,
  shared presentation 10, native Favorites 22, original-bundle coexistence 8,
  gradients/auto sizing/hex pulse 26, reference/power 21 (including 7 tablet), wave
  color 12, Charger 20, editor/labels 14, artwork 8, Climate 28, documentation 20.
  This is 318 desktop/mobile + 7 additional tablet scenarios; no Firefox/WebKit or
  real HA hardware is covered. Screenshot evidence was visually inspected.
- Six native Sleep Timer contracts, HACS packaging, core allocation/performance,
  actionlint and `git diff --check` passed. No required local suite was omitted.
- Candidate bundle: 263348 bytes, SHA256
  `9f4c7888538c1336f9e29c77df8abde39ac9f109eac75e7b7a71ba45ab9b0c8d`.
  Repeated production build is byte-identical; the source bundle matches the
  rebuilt production artifact. Exact-head remote CI is still pending at this checkpoint.
- Local QA evidence is outside Git under `/workspace/build-output/beta3-climate/`.
  Full unit log `climate-all-unit.log`, docs `climate-docs.log`, new browser
  `climate-browser.log`, inherited `climate-core.log` and per-suite logs are complete.
  `climate-local-validation.json` records counts; `climate-artifact.json` records
  reproducible checksum/size. Screenshots and synthetic performance data are outside Git.
  Browser plugin is unavailable; tests use the existing real Chromium harness.

[Meaningful #87 progress](https://github.com/NicolaiTandrup/honeycomb-menu-ng/issues/87#issuecomment-6370807828)
was posted after implementation/PR creation. Exact runtime-head CI for `ea64da6`:
[push 39996150619](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39996150619) /
[PR 39996159306](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39996159306).
Both are still in progress at this checkpoint. This handoff/test-report commit
requires checking its own final push/PR CI too; use the current PR head, not older
CI, as proof of final validation. No Climate publisher dispatch has occurred.

## Precise continuation point

1. **Do not reimplement or republish beta.3, Climate or handoff.** Check current
   `git status`, branch/head, PR #131 and its exact-head push/PR CI. All local suites,
   docs, package, lint and reproducibility checks above already passed.
2. Wait for all final-head required CI. If any failure appears, inspect the actual
   failed step/annotations, fix narrowly and rerun the affected check plus required
   CI. Do not bypass checks. Mark PR #131 ready only when green; leave it unmerged.
3. Update PR #131 with exact final head/checksum, CI links and results. Post one
   concise meaningful completion/blocker comment and push any handoff checkpoint.
   If a future session finds CI has since completed, verify rather than repeat it.
4. Owner reviews the Climate candidate and authorizes an installable Climate beta
   before any tag/publication. Then perform the existing exact-head guarded beta
   workflow. No automatic Climate release is authorized in this implementation task.
5. Keep #87 open for real HVAC acceptance, #125 for beta.3 logo acceptance. Do not
   start Car, Charger Level B/guest authorization or master/stable promotion.

Recommended next commands (after reading this document and `AGENTS.md`):

```sh
git status --short
git branch --show-current
git log -5 --oneline
gh pr view 131 --repo NicolaiTandrup/honeycomb-menu-ng --json url,headRefOid,baseRefName,isDraft,state,statusCheckRollup
gh pr checks 131 --repo NicolaiTandrup/honeycomb-menu-ng
gh run list --repo NicolaiTandrup/honeycomb-menu-ng --branch feature/v1.10-climate --limit 6
```

Known limits: no real HVAC hardware tested; registry permissions/semantics vary.
Newly advertised choices appear on category reopen; removed ones disable live so
placement never changes during an active gesture. Commands already sent to HA can
complete after closing; an unresolved timeout is not proof of device failure.
Initial scope excludes humidity/auxiliary heat/vendor-specific controls. Larger
anchored menus retain existing viewport/capacity limitations. Webpack reports its
standard bundle-size advisory; no renderer duplication or runtime dependencies added.

## Deferred / separate tracks

- #126 Charger Level B, #129 guest authorization and new native EV Charge Manager:
  **v1.12.0+**, do not implement in beta.3 or Climate. Existing standalone Charger
  must continue working. [Contract proposal PR #128](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/128)
  is review-only, not a shipped forecast UI or agreed producer interface.
- #86 Car v1.11: future consumer of Climate, no implementation now.
- #92 HACS: [PR #123](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/123)
  refreshed/CI green at `3aa75de85858f275bd1cc1990c3bba05eac06fc8`; stable v1.8.1
  package, official validation evidence and exact catalog entry prepared. No external
  submission made or authorized. Do not repeat preparation or close #92 prematurely.
- Retention remains disabled; no settings changes, deletions, tag/asset rewrites,
  master merge, stable release or production HA/charging commands.

## Test commands (from repository root)

Use installed dependencies if valid. If node_modules is a shared worktree symlink,
do not run npm ci through it; install into an isolated real directory if needed.

```sh
npm ci
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
node --test test/climate.test.js
python3 -m pip install -r test/browser/requirements.txt
python3 -m playwright install --with-deps chromium
curl --fail --location https://github.com/custom-cards/button-card/releases/download/v7.0.1/button-card.js --output /tmp/honeycomb-button-card.js
python3 test/sleep_timer/run.py
node test/performance/hub-benchmark.js --output /tmp/honeycomb-evidence/core-performance.json
python3 test/browser/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/core
python3 test/browser/radio_artwork.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/radio
python3 test/browser/climate.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/climate
python3 test/browser/charger.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/charger
python3 test/browser/track3.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/editor
python3 test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/docs
actionlint -shellcheck="" -pyflakes=""
```

Full CI `.github/workflows/build.yml` also runs browser `coexistence.py` (downloads
pinned original bundle), `presentation.py`, `native_favorites.py`, `beta5.py`,
`beta6.py`, `wave_color.py`. Run all mandatory jobs on the exact candidate; targeted
checks do not replace release CI. On hosts with system Chromium, CHROMIUM_PATH can
select it; do not commit host-specific paths or QA outputs.

For continuation diagnostics:

```sh
git status --short
git branch --show-current
git log -6 --oneline
gh pr list --repo NicolaiTandrup/honeycomb-menu-ng --state open
gh run view 39991372795 --repo NicolaiTandrup/honeycomb-menu-ng
gh pr checks 131 --repo NicolaiTandrup/honeycomb-menu-ng
```
