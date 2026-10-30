# v1.10.0-beta.2 — blocked by active cloud network policy

## Current authorization and source

Owner authorizes cumulative beta.2 development and guarded prerelease publication
for issues #146 (Climate styling), #147 (Sonos Join) and #148 (optional collapsible
Hub/mobile expansion), only after all mandatory validation passes. No master merge,
stable release, unfinished Car work, production HA changes, retention changes or
old release/tag/asset modifications. Full request was supplied in the chat upload.

Exact beta.1 source is 8619c9a74f50ffbbdb6206a45b18e5b81265912d. On 2026-10-30,
normal Git access independently confirmed both refs/tags/v1.10.0-beta.1 and remote
feature/v1.10-climate point to this SHA. Fetched immutable beta.1 and the separate
published handoff. Master remains ba95dade58fa64c5183a312e0d1d00044feeb096.

This branch docs/v1.10-beta2-network-handoff changes documentation only. There are
NO beta.2 implementation changes or new validation results. Do not recreate beta.1
or infer its current GitHub release/API/asset status from historical evidence alone.

## Exact blocker

- Repository and normal git ls-remote/fetch work.
- gh api repos/NicolaiTandrup/honeycomb-menu-ng/releases/tags/v1.10.0-beta.1 returns
  Forbidden. A normal inherited-proxy curl HEAD to the same endpoint fails with
  curl exit 56: CONNECT tunnel failed, response 403; HTTP/1.1 403 Forbidden, envoy.
- The denial is at the outbound proxy before GitHub; it does not establish a
  GitHub token/permission failure.
- /etc/codex/network-policy.json version 1 lists restricted HTTP egress without
  api.github.com. Runtime environment_status independently reports current
  observations, network policy enforced, spec_revision 1, preset package_managers,
  no custom allowed hosts, and effective hosts excluding api.github.com.
- The desired updated settings are therefore not reflected by this running
  instance's observed effective policy. No proxy bypass or credential replacement
  was attempted. An earlier escalation request was aborted; do not repeat it as
  a workaround for this managed destination policy.

Cannot currently read the latest #146/#147/#148 descriptions/comments, inspect
current PR/CI/release records, dispatch mandatory workflows or publish through the
normal guarded API workflow. No application source changed and no tests rerun.
No PR/issue comment can be posted through the blocked API.

## Resume in the corrected environment

1. Restart/recreate the cloud environment with api.github.com explicitly allowed
   in its HTTP network configuration. Keep github.com, raw.githubusercontent.com,
   release-assets.githubusercontent.com and required dependency/browser hosts.
   Never edit the policy snapshot or bypass the inherited proxy.
2. Read AGENTS.md and this handoff; use cloud-environment-runtime and its networking
   reference. Verify current enforced policy actually includes api.github.com.
3. Retry gh api repos/NicolaiTandrup/honeycomb-menu-ng/releases/tags/v1.10.0-beta.1.
   Then independently verify tag/source/public assets/checksum and actual API
   authentication/permissions. None of that can be proved by a proxy 403.
4. Read latest issues #146/#147/#148 and owner comments, open relevant PRs and Git
   branch heads. Check for any progress by another session before editing.
5. Create an implementation branch from the verified beta.1 source. Reuse the
   current shared renderer, paint inheritance, numeric sizing, slot allocation,
   navigation and lifecycle mechanisms. No competing renderer/stack.
6. Implement separate reviewable changes: Climate function cells 1–6 neutral fill,
   no default inner border, standard outer border and explicit overrides; Sonos
   Join truthful per-room metadata before joining and source paint/artwork snapshot
   plus own-room volume/joined indicator afterward; optional collapsed primary
   center, both expanded center policies, validated slots, long-press isolation,
   30s configurable idle collapse and viewport-safe temporary mobile overlay.
7. Add validated YAML/schema/docs; full mandatory Node/Chromium/HACS/package/docs/
   performance/CI and reproducibility gates plus screenshots at phone/tablet/desktop.
   Preserve all beta.1/v1.9 behavior and keep real-HA acceptance distinct.
8. Publish ONLY authorized v1.10.0-beta.2 via unchanged guarded release.yml after
   exact-head green CI and immutable tag/assets/provenance checks. Independently
   verify public assets, checksum and unchanged stable/history. Stop afterward.

Historical beta.1 evidence follows; these results were NOT rerun in this session.

---

# Development status — v1.10.0-beta.1 PUBLISHED AND VERIFIED

## Current feature / immutable source

Climate issue #87; PR #131 remains OPEN/unmerged, targeting master.
Feature branch: feature/v1.10-climate.
Exact tested/released source: 8619c9a74f50ffbbdb6206a45b18e5b81265912d.
Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.10.0-beta.1
Normal HACS JavaScript: 292933 bytes; SHA256:
a6b292c1ddb9556de7c07f9cdbcc8cbc3dc8f6e1500ad5f143f2b6caa99ba4ad
Provenance SHA256: efc39b135b9eb60058e7401f9cd7d1ee0821be016cf9080d59cd046aa077684a
Sums SHA256: 2f156f71d308682d7decc4fbc246161f2bc74ff605dfe5f4c4782a49c7407c53

Owner explicitly authorized this beta only. Stop development after verified
publication; no master merge, v1.10.0 stable, Car implementation or live HA command.
This publication-only handoff branch is separate from the frozen feature/tag source.

## Completed integration

Reused reviewed Climate implementation d965f41214085abb1eb52d25948fb5a7d47bd020;
normal merge of current stable ba95dade58fa64c5183a312e0d1d00044feeb096 into the
feature branch, not a replacement of newer stable files. Both are parents of 8619c9a.
All v1.9.0 Light/Sonos/Media/Charger/Info, layout/visibility/allocation, shared
presentation, energy wave, sizing, runtime and Hub source files remain byte-identical.
Only Climate registration, read-only capability utility, nested descriptor expansion
and existing standalone-child bridge differ in runtime source. Dependencies, webpack,
HACS and guarded publication/retention workflows unchanged; all stable browser tests
retained in CI. No duplicate renderer/navigation engine or future Car module.

Climate: current/target, native C/F step/bounds, explicit Low/High ranges; exact
advertised HVAC/preset/fan/swing/horizontal choices and native HA services. Safe
explicit/native/verified-metadata Defrost precedence. Registry denial or ambiguity
never permits guesses. Serialized commands distinguish Sending/Awaiting HA from
failure/unconfirmed; no automatic retries. Child entity/action/style isolation and
Back use the existing shared controller. Optional discovery is deduplicated and
connection-scoped; no per-cube polling.

New integration regressions: Info modal suspends/restores nested Climate exactly;
Light parent opens a different Climate entity, writes to that child only, returns
to Light and keeps Color/White navigation. Desktop 1100/mobile 390 screenshots saved
outside Git; full suite also includes existing tablet/reference-size scenarios.

## Actual validation (completed)

- 427 Node passes / 3 stable-only skips; all core contracts pass. No mandatory failure.
- 448 Chromium scenarios: includes 36 Climate, 69 Info, 22 docs, 8 original Honeycomb
  coexistence. All Light/Sonos/Charger/editor/namespace/navigation/touch/lifecycle,
  responsive sizing, gradients/energy-wave and performance regressions pass.
- 6 native Sonos Sleep device-boundary contracts pass.
- Docs 63 YAML, 52 complete cards + 11 fragments, 250 local links, 22 browser interactions.
- HACS/GPL/package, actionlint, version/checksum checks pass; repeated normal JS build
  is byte-identical. No optional DEV loader published.
- 40 Climate cubes / 1000 unrelated updates: zero rerenders; one related update renders
  one cube; one shared registry read. Actual desktop/mobile measurements retained.
- Exact-source push CI 40459706526 and PR CI 40459711681: all jobs/steps successful.
- Official HACS readiness 40459897791: successful.
- Guarded manual release.yml publish=true run 40461706534: verify and publish jobs,
  every step successful. Rebuilt committed/CI/staged bytes/checksums match. Normal
  immutable tag and public prerelease verified, provenance pins both CI attempts.
- Public JS/provenance/sums independently downloaded anonymously and verified against
  GitHub digest/size, tagged source, local reproduced bytes and exact source metadata.

CI:https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40459706526
PR CI:https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40459711681
HACS:https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40459897791
Publisher:https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40461706534
Screenshots: CI shared-cube-evidence artifact, climate/1100-climate-main-C.png,
climate/ 390-climate-main-C.png, range/capabilities/errors/Light comparison and Info
suspension. Browser plugin not available; repository Playwright used. Each browser
case checks page identity, meaningful screen, no error card, JS/console health and
actual interactions. No real HA installation, thermostat/HVAC operation, exhaustive
hardware matrix, Firefox or WebKit testing is claimed.

## Preservation / known limits

Master unchanged at ba95dade58fa64c5183a312e0d1d00044feeb096; latest stable remains
v1.9.0. 56 prior API-visible release records/assets and 109 tags preserved exactly;
new totals 57/110. No old asset edit/delete, tag overwrite, history rewrite, branch
deletion, production HA modification or retention setting change. Retention remains
disabled; beta workflow does not invoke cleanup. Historical private beta.5 API
visibility uncertainty from the stable handoff remains separate; no action on it.

Real HVAC acceptance is PENDING. Registry metadata/service permissions differ among
integrations. Explicit mapping may be required for a separate Defrost switch; no
helpers/backend required for native Climate. Humidity, auxiliary heat/vendor-only
controls are not in this beta. Menus retain actual source anchors; near-edge/deep
menus can clip under existing shared viewport/capacity limits. Choice lists freeze
when opened; removed values immediately inert, reopen for newly advertised choices.
Commands accepted by HA do not establish physical success; 15s confirmation timeout
and no automatic retry. Keep issue #87 open pending owner device verification.

## Owner HACS testing / next session

HACS -> Honeycomb Menu NG -> Redownload -> enable beta versions -> select
v1.10.0-beta.1. Keep one normal NG module resource plus button-card, reload. Do not
load the optional DEV loader alongside HACS. Copy examples/climate-hub.yaml or
examples/climate-control.yaml; replace synthetic climate.room_a/b with verified
entities. Docs/CLIMATE_MODULE.md covers capabilities, range, errors and nesting.

Owner acceptance: native units/increments/bounds, supported modes/preset/fan/swing,
Low/High preservation, actual heating/cooling, unavailable/reconnect/error states,
correct explicit/native/discovered Defrost target, child Back, touch/resize/idle,
existing Light/Sonos/Charger/Info. Never send live commands from Cloud tests.

No unfinished coding task remains in this authorized beta publication. STOP and
wait for owner real-HA feedback; fix validated defects only under subsequent scope.
Do not repeat completed integration or republish beta.1; all tags/assets immutable.
Do not start Car or stable promotion without authorization. Fresh session reads
AGENTS.md, this handoff, issue #87, PR #131, current Git and exact CI before changes.

## Exact commands / evidence

npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-beta.js
node scripts/check-hacs-package.js
python test/browser/climate.py --bundle honeycomb-menu-ng.js --button-card /path/to/button-card.js --evidence-dir /tmp/climate-evidence
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /path/to/button-card.js --evidence-dir /tmp/docs-evidence

Full mandatory suite commands are in .github/workflows/build.yml. Existing local
runner /workspace/build-output/v110-beta1/run-full.py uses installed browser venv.
Evidence outside Git: /workspace/build-output/v110-beta1/ contains full/validation.json,
all group logs/screenshots, source preservation preflight, exact CI/jobs/artifacts,
beta-inputs, publisher-final.json, downloads/public-verification.json and unchanged
release/tag inventories. Release branch stays clean/frozen at 8619c9a; final handoff
is committed/pushed separately on docs/v1.10-beta1-published-handoff.
