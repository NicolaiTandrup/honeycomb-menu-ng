# v1.10.0-beta.3 — real-HA stabilization in validation

Owner authorizes focused fixes for #146/#147/#148 and guarded beta.3 publication
only after mandatory gates pass. No master merge, stable release or production HA.
Branch: fix/v1.10-beta3-real-ha. Exact published beta.2 baseline:
8bbc45af72936630c39f87c4697a0148cc38a047 (tag/release and assets independently read).
Previous published handoff c122685 reviewed; no beta.2 work recreated/reapplied.
Read AGENTS.md, current issues/owner comments and PR #149; GitHub API and dry-run
push permission pass. Managed policy explicitly allows api.github.com; normal
inherited-proxy access needs the existing authorized escalated shell.

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

Actual checks so far: 433 Node passes, 3 existing stable-only skips. Existing 20
beta.2 feature cases pass. New 10 regression cases plus 2 supplied-card cases pass
in targeted runs, including shared Climate pixel comparison and explicit overrides.
Full mandatory local suite RUNNING. HACS/package/GPL, pinned actionlint and release
integrity checked; exact-head CI/PR, official HACS and publication are PENDING.
Guarded release.yml, stable/retention workflows and dependencies remain unchanged.

Evidence outside Git: /tmp/honeycomb-beta3/ (Node/build logs, features/, supplied-card
screenshots, full/results.json when complete). Browser plugin absent; repository
Playwright and installed Chromium used. CI downloads checksum-pinned demo image.
Existing local artifact redirect/CDN network limitations do not authorize bypass.

Next: finish mandatory checks, create reviewable development PR and freeze final
head; await green exact-head push/PR CI and official HACS; dispatch unchanged
release.yml with expected_tag=v1.10.0-beta.3, exact expected_commit, publish=true.
Independently download/verify all public assets, source/provenance/HACS metadata,
and prior stable/master/release/tag preservation. Stop after beta.3 verification;
write publication handoff separately without moving released feature head.
