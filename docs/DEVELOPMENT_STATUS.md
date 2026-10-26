# Development status — v1.9.0-beta.9 PUBLISHED AND VERIFIED

Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.9
Exact immutable tag/source: f95e5fbc7273ae06055bb5f106bdd6a3a82a183d.
Frozen source branch fix/issue140-info-source-beta9; PR #144 open/unmerged, based
on published beta.8. Publication authorized for this beta ONLY; no stable authority.

Normal HACS JavaScript274272 bytes, SHA256:
11d9b1911e5889fed5ce43b2cc1a6e148c5594010c009d3962fa4cb58a21c735
Provenance SHA256:91c739179a5d317b67144dece2af51dc48c4aa059c36925b2dcaed36d1949902
Sums SHA256:a51b6494932ef17ce2e182bfd14afd940d9dd5e20bbca0313832f409e55976b3

Implemented Info-only source snapshots independently on center/inner/outer layers:
actual rendered SVG solids/alpha or linear/radial gradients, direction/transforms,
all stops/opacity; mix explicit colors/CSS gradients. Safe missing/cyclic/unsupported
fallback, no external fetching/raw markup evaluation. Connector stays live, with
documented first-stop COLOR fallback for gradients, not full gradient/stop-opacity.
Geometry/text/navigation/30s lifetime and other modules preserved. New source
styling appears on reopen; snapshots do not change on subsequent HA updates.

Validation:400 Node passes/3 stable-only skips, six focused paint browser cases.
No optional local exhaustive browser run. Required full CI40387739619(push) and
40387750886(PR) passed every job/step, including inherited408 Chromium cases,
docs/YAML/links, Sleep contracts, packaging/HACS/GPL, performance/workflow lint.
Reproducible normal HACS build; not the DEV loader.
Publisher40390512256: explicit publish=true; verify AND publish jobs successful.
Fresh branch/head/CI/version/unused-tag guards and committed/CI/staged/rebuilt/draft
checks passed, no bypasses. All3 public assets anonymously downloaded and verified
against GitHub digests/sizes, sums, exact Git bytes and source/CI provenance.

54 prior API-visible releases/assets and107 tags verified unchanged (new55/108).
Historical private beta.5 visibility uncertainty is not a new finding; no deletion
or overwrite issued. Stable remainsv1.8.1, masterc1f178740c8181921033d0d18e0ac8d01afc7ea7.
No merges, retention changes, production HA/device commands or live HACS tests.

HACS: Honeycomb Menu NG → Download/Redownload → Show beta versions → select
v1.9.0-beta.9; reload. Keep one normal NG resource, button-card and HACS-managed
resource URL/query. Console version should be1.9.0-beta.9, no -dev.

STOP after publication. Await owner real-HA visual acceptance; keep #140 open.
Do not begin additional development, merge master or publish stable. Source stays
frozen; this publication-only handoff is on docs/v19-beta9-published-handoff.
Evidence outside Git:/workspace/build-output/v19-beta9/ (CI JSON, focused logs/
screenshots, reproducible build, publisher.json, public-verification.json, downloaded
assets and before/after inventories). Read AGENTS.md and fresh Git/issue/PR state
before any newly authorized work. No full real-hardware acceptance claimed.
