# v1.10.0-beta.4 — mandatory validation in progress

Owner explicitly authorizes focused fixes for #146/#147/#148/#151 and guarded
beta.4 publication after mandatory gates. No master merge, stable promotion,
production HA work, cleanup or unrelated development.

Baseline: exact published beta.3 c50890d91b6236bd12ab07c8e0a378d1af0a7548;
branch fix/v1.10-beta4-defaults. Previous handoff 09af0fa reviewed. GitHub API
and push permissions verified. Read AGENTS.md, PR #150, latest issues/comments.
Owner accepts beta.3 Android sizing; this path is preserved, no acceptance claim
for new beta.4 behavior until owner tests actual devices.

Changes:
- Collapsible opt-in defaults to size:auto/logo:false; requires exactly one hard
  slot-0 primary (no ambiguous first-item inference). Other Hub defaults unchanged.
- Normal auto sizing keeps shared 1536px reference semantics, capped at 82px.
  Explicit numeric sizes remain uncapped; unresolved image fallback stays 82px.
- small_screen defaults true; mobile boolean alias retained; matching duplicate
  settings accepted, contradictions rejected. Expanded overlay remains independent.
- Expanded root center collapses immediately, preserving primary visuals or bee
  policy. Separate rectangular Back removed. Nested Back/Escape follows parent
  before collapse; original floorplan geometry restored on Back/timeout/rotation.
- Climate explicit deltas ±1.0 and ±0.1 in reported HA unit, not step multiples.
  Requested target must be exactly representable on min/step grid and within
  single/dual bounds; otherwise disabled with an explicit precision/limit label.
  Shared neutral fill, center, native services and acknowledgement guards preserved.
- Sonos Join uses trusted existing Favorites/native Browse recognition per room,
  including verified coordinator transport; own room volume never substituted.
  Compact art/name/volume; state/full content accessible; concise fallback when
  unrecognized; opening visual styling inherited, conflicting verified room source
  wins over stale art, hidden icon/background overrides preserved.
- Focus reproduced on exact beta.3: keyboard/programmatic focus then touch/mouse
  on same cube retains focus-visible blue rectangular 2px outline in Chromium.
  New SVG hex ring plus local input-modality cleanup retains keyboard navigation,
  clears pointer focus paint and resets on detach. No global listener lifecycle.

Focused validation: 441 Node passes with 3 existing stable-only skips; new exact
C/F step/representability and alias tests. New 18 browser cases across phone390,
tablet768 and desktop1800; fixed multi-Hub test overlap, focused alias pass.
Existing assertions updated only for intentional labels/deltas/auto cap/center Back;
service identity/group guards retained. Full mandatory local suite RUNNING; no
publication or CI success implied. Browser plugin absent; repository Playwright
and installed Chromium used. Fixtures/services/artwork are synthetic, not actual
HA payloads or physical Android acceptance. Evidence /tmp/honeycomb-beta4/.

Next: finish full local Node/Chromium/native/docs/HACS/actionlint/release-integrity
suite; resolve failures, create development PR, freeze final source, wait for exact
head push/PR CI and official HACS. Dispatch unchanged guarded release.yml for a new
v1.10.0-beta.4 tag only after gates pass. Independently download/verify assets,
commit/provenance/checksums/HACS and prior release/tag/master/stable preservation.
Write publication handoff separately without moving released head; stop afterward.
