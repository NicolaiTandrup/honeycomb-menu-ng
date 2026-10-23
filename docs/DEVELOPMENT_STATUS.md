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
  Do not change that branch during its publisher run.
- Current feature/handoff branch: **`feature/v1.10-climate`**, based on exact
  tested beta.3. First checkpoint adds continuation documentation only; Climate
  implementation is not yet present. No Climate PR/release exists at this checkpoint.
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

## In progress — beta.3 publication has been dispatched, not yet verified

Owner explicitly authorized immutable beta.3 after green CI. Fresh preflight
passed source/head, both CI attempts/checksums, unused tag/release and unchanged
master/latest stable. Normal manual publisher was dispatched once with publish=true:

[Run 39991372795](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39991372795).

**Next step:** inspect this run. Do not dispatch a second publication blindly.
If successful, independently download all three public assets and verify bytes,
SHA256SUMS, release-provenance.json, tag SHA, prerelease=true/draft=false and latest
stable v1.8.1. Refresh the inventory: all prior 49 releases/101 tags and private
v1.7.1-beta.5 draft/assets must be preserved. If a tag/draft exists after failure,
preserve it and report the precise blocker; never delete/reuse/force it.

## Next priority — Climate v1.10.0 (separate PR, not in beta.3)

After beta.3 publication verification, implement generic `type: climate` / standalone
`module: climate` on this feature branch and open a reviewable unmerged PR targeting
`fix/issue125-radio-beta3`. No Climate release is authorized by the current task.

Owner decisions confirmed in chat:

- Slot 2 opens **advertised HVAC modes**, not a guessed power/restore toggle.
- Dual-setpoint devices require **explicit Low/High selection** before +/− writes.

Planned scope: shared-renderer current/target temperature, HVAC action/mode, native
unit/step/min/max validation, capability-aware modes/presets/fan/swing, truthful
read-only/unavailable states, safe exact-target actions and genuine cross-entity
nested navigation with correct one-level Back. No Car implementation.

Research reviewed: [PR #112](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/112),
HA core `ebea8e72ef5ac27b24ac5c1bf051cab46fa48dd0` climate const/entity/services and
entity registry; current HA frontend climate temperature control. HA frontend uses
reported target_temp_step, otherwise 0.5 Celsius / 1 Fahrenheit. Do not convert
one unit's numeric increment into another silently.

Discovery constraints: native exact Defrost preset first; generic optional registry
resolution requires unambiguous same-device metadata with verified function semantics,
not names. HA does not universally describe switch purpose; require explicit mapping
when unknown/ambiguous/denied or for user-confirmed cross-device topology. Do not
hardcode brands. Keep discovery bounded/event-driven and actions serialized with
HA confirmation/errors; no polling or service calls on navigation/render.

Reuse existing nested action/menu structure and shared controller where possible;
retain separate parent/child module/entity/config/Back identity. Do not create a
second renderer or duplicate temperature controls for a future Car module.

Remaining implementation order:

1. Verify beta.3 publication and update this checkpoint/PR #130/#125.
2. Implement Climate capability model, exact-target action/feedback bridge and
   narrow generic cross-entity nested module resolution.
3. Unit tests for C/F, steps/bounds/ranges/choice validity, discovery/duplicates,
   service errors/pending/expiry and entity isolation.
4. Desktop/mobile scenarios for rich/simple/display-only devices, range selection,
   parent -> different Climate entity -> Back, live updates, touch, resizing,
   editor preview and lifecycle; side-by-side against Light.
5. Complete synthetic YAML, capability/migration limitations and AI documentation;
   run complete inherited CI, build/reproducibility/package checks.
6. Commit/push, open/update Climate PR, record exact validated code head/CI results
   and handoff before stopping. Leave real HA/HVAC acceptance and all merges stable
   gated on owner approval.

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
python3 -m pip install -r test/browser/requirements.txt
python3 -m playwright install --with-deps chromium
curl --fail --location https://github.com/custom-cards/button-card/releases/download/v7.0.1/button-card.js --output /tmp/honeycomb-button-card.js
python3 test/sleep_timer/run.py
node test/performance/hub-benchmark.js --output /tmp/honeycomb-evidence/core-performance.json
python3 test/browser/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/core
python3 test/browser/radio_artwork.py --bundle honeycomb-menu-ng.js --button-card /tmp/honeycomb-button-card.js --evidence-dir /tmp/honeycomb-evidence/radio
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
gh pr checks 130 --repo NicolaiTandrup/honeycomb-menu-ng
```
