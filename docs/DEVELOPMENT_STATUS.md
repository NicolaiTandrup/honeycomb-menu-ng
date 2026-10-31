# v1.10.0-beta.5 — focused geometry and shared Bee, validation in progress

Owner explicitly authorizes beta.5 publication only after all mandatory gates.
No master merge, stable promotion, production HA changes or unrelated features.
Issue #154 repository-wide review is explicitly DEFERRED until beta.5 acceptance.

Baseline: exact published beta.4 d1afadf02b4f328ad92f6514faf206485686a507;
branch feature/v1.10-beta5-geometry. Prior published handoff 317f6fe reviewed.
Read AGENTS.md, latest issues #148/#153/#134 (including latest owner comments),
PR #152 and relevant guides. API and push dry-run pass; managed runtime/network
policy current, connected, API allowed, no VPN. Existing PRs/releases untouched.

Implementation:
- Expanded default sizing now targets 100px on every screen, independent of the
  collapsed shared auto result/max82 or numeric override. Image/anchor watchers
  cannot shrink or snap an expanded desktop scene back to floorplan geometry.
- Extend the existing shared image observer (also for numeric collapsible Hubs)
  with visible image rectangle from object-fit/position, clipped to image/card.
  No competing image observer. Scroll/load/resize and cleanup remain shared.
- Small expanded-layout helper consumes actual visible slot coordinates from
  existing layout engine, including asymmetric/extended layouts and XY scene.
  Enumerates below/above/left/right regions outside image with 12px separation;
  rejects regions below 80% target or normal 80px usability threshold; deterministic
  size/area selection plus retention hysteresis; center0 clamped near region center.
  Safe viewport fallback includes visualViewport, safe insets and measurable fixed/
  sticky header/sidebar geometry. Header resize/style observers clean up on close.
- Shared nested navigation preserves selected center when full child fits; then
  root anchor, usable image-free or safe viewport fitting. Saved parents keep
  independent sizes; Back restores exact anchor/size. Resize reevaluates safely.
- Backdrop collapse requires pointerdown to originate outside controls, preventing
  post-resize synthetic clicks from dismissing a newly fitted child.
- src/core/bee.js centralizes preset, colors, canonical asset/version references,
  dimensions and reveal/flight timing. Existing renderer/formatter/asset pipeline
  retained; no mascot redesign. Standard Bee tap/hold version; expanded root tap
  Back, hold/Shift+Enter version (3 seconds). Alt+V supports functional Bee icons
  without replacing their module actions/styles. Explicit styling retained.
- Radio/Climate production modules unchanged. Exact beta.4/new-bundle pixel
  comparisons at phone390 and desktop1440 pass for Climate and Radio.

Compatibility clarification pending async optional user answer: beta.5 universal
expansion conflicts with beta.4's explicit small_screen:false phone opt-out.
Provisional assumption stated in commentary: retain explicit legacy false up to
600px while default expansion and all desktop expansion remain universal. Legacy
mobile alias/conflict validation preserved. Do not silently ignore a later reply.

Validation so far: Node 449 passes / 3 existing stable-only skips; focused pure
geometry/image clipping/Bee tests pass. Initial beta.4 reproduction recorded 27px
expanded desktop cubes and selected Sonos anchor snap; current desktop test shows
100px, exact promotion and Back. Existing Bee tests pass with 3s readable version.
49-case geometry matrix rerun passes; additional stacked header/footer, shadow
scroll/clipping and Info-rotation focused reruns pass. Explicit Bee background
forwarding failure was resolved and all seven focused viewport cases pass.
New seven-viewport matrix: 390x844,430x932,800x1280,1280x800,1440x900,1920x1080,
650x900; default placement, modules, Radio, Bee and lifecycle tests in progress.
Added sparse hard/soft/priority and nested-rotation checks. Full mandatory local
suite completed (24 groups); all pre-existing groups pass. The original geometry
group captured the resolved background failure; the complete rerun passes. Final
exact-head CI and official HACS are PENDING; no publication implied.

Evidence outside Git: /tmp/honeycomb-beta5/ (before/, before.json, current/,
features*, radio/promotion reruns, comparison/verification.json, full/ logs).
Browser plugin absent; repository Playwright/system Chromium. All services/states/
thumbnail data are synthetic; no physical Android/PC or actual HA acceptance claim.

Next: finish mandatory local suites, resolve failures, review source/docs together,
create development PR and freeze final commit; green exact-head push/PR CI plus
manual HACS readiness; unchanged guarded release.yml for new v1.10.0-beta.5 only.
Independently verify public tag/source/assets/digests/provenance/HACS and all prior
release/tag/stable/master preservation, smoke public bundle, record final handoff
on separate docs branch without moving released head. Stop for owner acceptance.
