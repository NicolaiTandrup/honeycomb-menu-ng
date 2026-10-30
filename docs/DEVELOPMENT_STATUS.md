# v1.10.0-beta.3 — published and independently verified

Stop point reached on 2026-10-30. Owner-authorized beta.3 was published through
unchanged guarded release.yml after all mandatory gates passed. No master merge,
stable promotion, production HA actions, cleanup or retention changes.

- Development PR: https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/150
  Open/unmerged; released branch fix/v1.10-beta3-real-ha stays frozen.
- Exact tested/released commit: c50890d91b6236bd12ab07c8e0a378d1af0a7548
- Exact published beta.2 baseline: 8bbc45af72936630c39f87c4697a0148cc38a047
- Release: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.10.0-beta.3
  Release ID 429374930; draft=false, prerelease=true; tag is exact source commit.
- Bundle honeycomb-menu-ng.js: 304034 bytes; SHA256
  59fb3fdba40f5f1df7d3ec3362001f693ee4dfae1c5b1da57f62a22942c85d21
- SHA256SUMS.txt: 87 bytes; SHA256
  8f6cfe144a429b954b92e32060977ebd49accc8f9ab3814df2f3fb676937c843
- release-provenance.json: 539 bytes; SHA256
  231209c952e3652ea617883c016804527af813fe5e0b547c71668940f98690f4

Validation complete on exact released source:
- 433 Node passes; 3 existing stable-only skips.
- 480 Chromium/documentation cases; 6 native Sleep Timer contract cases.
- HACS/package/GPL, complete YAML/docs, pinned actionlint, release-integrity and
  deterministic normal bundle reproduction pass.
- Push CI 41106498251 and PR CI 41106508853: success, attempt 1; build and
  workflow-lint jobs green. Both checksum annotations match the bundle above.
- Official HACS 41106505440: success on exact released commit.
- Guarded publisher 41109472721: verify and publish jobs success.
  Run URLs: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/<ID>
- Independently downloaded all three public assets; bytes, GitHub digests,
  checksum file, provenance CI/branch/commit, tagged package/HACS metadata match.
  Public downloaded JS passes all 12 beta.3 desktop/mobile regression cases.
- All 58 previous releases/assets and 114 prior tag refs preserved; exactly one
  release and one tag added. Stable/latest stays v1.9.0. Master remains
  ba95dade58fa64c5183a312e0d1d00044feeb096. Acceptance issues remain open.

Read AGENTS.md, issues #146/#147/#148 and latest owner feedback, PR #149 and prior
published handoff c122685. GitHub API and push permission verified; no network
blocked endpoint repeatedly retried. Browser plugin absent; repository Playwright
and system Chromium used. Local artifact/CDN restrictions were not bypassed.

Focused changes:
- Climate roles reuse actual shared SUBMENU_FILL/SUBMENU_INNER/OUTER, including
  alpha; no invented gray. No default inner width, independent center preserved.
- Join uses each listed room's HA state/metadata/own volume, on separate readable
  status-volume and station/title lines; visible joined checkmark and accessible
  membership/reasons. Opening Sonos source remains visual/artwork inheritance only.
  Missing/unavailable metadata is not substituted with launcher data or zero.
- Collapsible Hub resolves collapsed size from the shared image-sizing result,
  independently of temporary scene size and incidental layout-box widths. Auto
  image updates during mobile expansion refit the overlay, not the floorplan size.
  Both policies and original Back/timeout/anchor/lifecycle paths preserved.
  Shared auto observer reports resolution validity; unsupported-image fallback
  retains existing behavior. Normal non-collapsible sizing remains unchanged.

Data/provenance and acceptance boundary:
- Owner supplied complete picture-elements YAML with the public demo floorplan,
  size:auto, reference 1200, primary center, 100px overlay. Test fixture sanitizes
  private IDs/names and compares an ordinary Hub on the same image. Exact public
  image pinned to frontend commit c695f577ff088e90d83c5bb7482f30f2c5cad7c7, SHA256
  25187fe9fdc4f9d15f28f9f57c4c26a7525c1f979f72eff689d26b0596c449ad.
- Standard beta.2 basic auto fixture initially matched normal size. Additional
  layout-width/containing-block regression exposes conflicting size sources;
  complete supplied card, both center policies, Back, timeout and rotation covered.
  Do not claim the owner's exact Android failure was reproduced from actual DOM.
- Owner supplied a Sonos Jinja template, not its evaluated attribute values.
  Rendered output requested asynchronously; currently unavailable. P4/4% fixture
  is HA-shaped synthetic input based on owner observation, not a captured payload.
  HA core Sonos source reviewed: media comes through coordinator, volume comes from
  individual speaker. Reference commit 2e3af9ead42a9921f41b0e49bfaf5759b466945d.
- No actual HA services/connections or private IDs committed. Fixtures alone do not
  establish real HA/device/Android acceptance. Keep acceptance issues open.

Evidence outside Git: /tmp/honeycomb-beta3/test-results.json, ci-results.json,
public/verification.json, public-smoke.log, comparison/ (exact beta.2 vs beta.3
Climate and Sonos screenshots), public-smoke/ (collapsed/expanded/restored Hub),
ha-test-card.yaml and full/ logs. No screenshots/private IDs committed.
The initial environment restart interrupted remaining local groups; completed
passes were retained and remaining groups rerun to completion (22 groups total).

HACS testing: enable beta versions, redownload v1.10.0-beta.3 and reload the
existing honeycomb-menu-ng.js resource/cache. Synthetic YAML needs test entity IDs.
Official HACS validation and installation payload compatibility do not establish
catalog admission or owner real-device acceptance.

This handoff lives separately on docs/v1.10-beta3-published-handoff so released
feature head is unchanged. No more development/publication is authorized by this
completed task. Wait for owner real-HA feedback and next instructions; do not
reapply fixes, merge historical PRs or publish another version automatically.
