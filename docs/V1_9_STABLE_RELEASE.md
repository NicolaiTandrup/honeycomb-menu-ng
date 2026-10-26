# v1.9.0 stable promotion checklist

Owner explicitly approves stable preparation, validation, master merge and guarded
publication for v1.9.0 ONLY, after real-HA beta.9 acceptance. No production HA
modification, retention setting change or v1.10 development is authorized.

## Exact cumulative reference

Public v1.9.0-beta.9: f95e5fbc7273ae06055bb5f106bdd6a3a82a183d.
Approved normal JS274272 bytes, SHA256
11d9b1911e5889fed5ce43b2cc1a6e148c5594010c009d3962fa4cb58a21c735.
Release approval manifest pins its actual src tree; all application src and build
inputs/dependencies remain identical. Stable bundle may change only the banner
and two build-info version literals. Normal build configuration is unchanged.
The updated guard rejects any other byte, source, dependency, unexpected metadata
module or build input change; old banner-only releases retain their guard.

Do not merge historical beta PRs sequentially. This promotion descends directly
from exact cumulative beta.9, which already contains beta.1–beta.8. Master is its
ancestor. Older candidate PR #132 is superseded; unfinished Climate PR #131 is excluded.

## Mandatory sequence

1. Pin approval/source, build version metadata and release notes; verify immutable
   public beta tag/asset/digest. Compare src/build/dependencies and normalized bundle.
2. Run full Node/contracts, Chromium desktop/mobile including coexistence, Light,
   Sonos/Radio/Join/Sleep, Charger, editor, Info/source paints/pagination/lifecycle,
   docs/YAML/links, HACS/package/GPL, performance, actionlint and reproduction.
3. Required exact candidate push AND promotion-PR CI green; candidate workflow
   verifies RELEASE_RETENTION_ENABLED explicitly false without Variables API access.
4. Merge only the green exact PR head into master (no force/history rewriting).
   Verify actual merge SHA, runtime tree and normalized/reproducible bundle.
5. Full exact merged-master CI must pass; only then dispatch stable-release.yml
   from master with expected_commit set to that actual SHA and publish=true.
6. Publisher rechecks exact master/CI, approval/public beta and artifacts, false
   retention, immutable unused stable tag/release, draft bytes and inventory.
   Post-publication retention is forcibly dry-run-only; never delete anything.
7. Independently download public stable assets, verify tag/master/provenance/sums,
   non-prerelease/latest stable/HACS metadata and all previous release/tag inventory.
   Update final handoff and stop; no next-version work.

## Acceptance boundaries

Owner real-HA acceptance is recorded for beta.9. Synthetic integration/browser
coverage does not imply every hardware model or browser was physically tested.
Known Info bounds and first-stop connector fallback, small/positioned content
limits, visible floorplan anchors and inherited fixed410px Light palette clipping
on390px remain. Chromium desktop/tablet/mobile; no Firefox/WebKit/native-pinch matrix.
No source-level Climate/Car/new roadmap integration enters this stable release.

Current actual results/commit/PR/CI and release evidence are recorded in
[permanent status](DEVELOPMENT_STATUS.md); pending checks must never be called passed.
