# Development status — v1.9.0-beta.7 Info Cube IN PROGRESS

Updated 2026-10-26 (Europe/Copenhagen). User authorized implementation, tests,
docs, PR and an independently installable development package, NOT a public
beta.7 release, stable merge or production HA commands.

- Baseline: published v1.9.0-beta.6, exact `68bf88fe07aae0892705f2680a82f38c0e78848d`.
- Active branch: `feature/issue140-info-cube-beta7`; issue #140; draft PR #141 (https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/141).
- First checkpoint: generic `honeycomb-info` action, shared CubeElement shell,
  analytic per-line hex containment, pagination, plain entity bindings, fixed
  30-second close-all, modal input blocking, exact caller preservation/cleanup.
- Geometry audit: literal slot 7 is outer-left, NOT part of the inner six. Default
  enclosure is 328 x 378.7416 px at size 82, center offset -41/-0.205 px. A
  owner explicitly confirmed this literal enclosure. Screenshot/real-HA acceptance
  remains pending; no alternate silently substituted footprint.
- Actual validation: current full Node run passed (393 passes, 3 stable-only skips);
  seven new pure geometry/text/config tests passed. First browser iterations found
  a missing shared-shell host width and clipped footer; corrected, current 30-case
  desktop/tablet/mobile iteration passed 30 cases; final targeted 45-case run is
  passing as it completes. Inherited core 136 browser cases plus coexistence,
  presentation and native Favorites pass; remaining full groups/CI underway. Eight Info core and eight installer contracts
  pass, including real local-TLS package download. Docs: 59 YAML / 234 links /
  18 desktop/mobile interactions pass. No claim of completed CI/hardware tests.

## Remaining priority

1. Complete the running full suite and fix only validated failures; source work
   already includes fixed geometry, top-modal keyboard ownership and safe bindings.
2. Three-mode examples, module/AI/geometry docs and mock plan implemented;
   finalize evidence, exact SHA and PR readiness after regression completion.
3. Terminal installer implemented/tested; after clean committed code, build and
   deliver immutable dev package on a separate branch, with pinned command/checksums.
4. Run full inherited browser/regression/docs/HACS/build/performance/CI checks;
   commit/push checkpoints and prepare reviewable PR and testable dev package.
5. Post issue/PR evidence and exact next steps. No public beta.7 publication until
   separate owner authorization and real-HA acceptance; no merge/stable/Info-next work.

## Commands / evidence

```sh
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
python test/browser/info_cube.py --bundle honeycomb-menu-ng.js --button-card /workspace/build-output/test-dependencies/button-card.js --evidence-dir /workspace/build-output/v19-beta7/info
```

Evidence: `/workspace/build-output/v19-beta7/` (outside Git). Read AGENTS.md and
latest Git/issue/PR before resuming; preserve all beta.6/master/releases, private
beta.5 draft and retention settings. No live HA installation performed.

## Final Info lifecycle refinement

Preserve the original opener focus across replacement Info views. Observe actual
caller geometry while open so `size: auto` changes update the Info footprint
without polling, idle extension or duplicate text measurement. Targeted tests
include a 450px -> 900px rendered-image resize and focus return after reopening.
The original 136-case inherited local browser group ran against the preceding
checkpoint; only these Info-scoped lifecycle refinements follow it. Final exact-
head GitHub CI must validate every group before claiming full candidate readiness.
