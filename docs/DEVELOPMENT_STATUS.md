# v1.10.0-beta.4 — published and independently verified

Owner-authorized stop point reached on 2026-10-31. Guarded prerelease only; no
master merge, stable promotion, production HA actions, cleanup or retention change.

- Development PR: https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/152
  Open/unmerged; source branch fix/v1.10-beta4-defaults stays frozen.
- Exact tested/released commit: d1afadf02b4f328ad92f6514faf206485686a507
- Baseline beta.3: c50890d91b6236bd12ab07c8e0a378d1af0a7548
- Release: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.10.0-beta.4
  Release ID 429798520; draft=false, prerelease=true; immutable tag targets exact commit.

- honeycomb-menu-ng.js: 305585 bytes; SHA256
  4cc52803086394695356f2bec7eac8e5bbac5c49d842796cafa8d33f44349ba4
- release-provenance.json: 540 bytes; SHA256
  970b5a78b1c512f44154340fbda263e4552887aeda53f4ffb4f61851b3f8e055
- SHA256SUMS.txt: 87 bytes; SHA256
  65a95d3e0c6cacf150ad74bea8d480f10d7f552d3584a934005a4792a19e6c2e

Validation: 441 Node passes, 3 existing stable-only skips; 498 Chromium/docs
cases; 6 native Sleep Timer contracts; HACS/package/GPL, workflow lint, docs/YAML,
release-integrity and deterministic normal build checks pass. All 23 mandatory
local groups complete; a stale missing-volume expectation was corrected, then the
entire 136-case shared suite reran cleanly. Final exact-head CI runs every group.
Push CI 41181147555 and PR CI 41181151044: success, attempt 1; build and workflow
lint green; checksum annotations match the public bundle. Official HACS 41181161271
passed on exact head. Publisher ID: 41182593420. Verify and publish jobs passed.
Run URLs: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/<ID>

Independent public verification: all three assets downloaded without auth, bytes
and GitHub digests match; checksum/provenance/CI/source and tagged package/HACS
metadata match. Public downloaded JS passes 18 beta.4 cases across phone/tablet/
desktop, plus minimal demo-floorplan collapsed/expanded/restored/timeout proof.
All 59 prior releases/assets and 115 prior tag refs retained;
exactly one new tag/release added. Stable/latest remains v1.9.0; master stays
ba95dade58fa64c5183a312e0d1d00044feeb096. Acceptance issues remain open.

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

Evidence outside Git: /tmp/honeycomb-beta4/ (full/ logs, shared-final.log,
node-final.log, focus-before.json/png from exact beta.3, minimal-demo/, public/,
public-smoke/, public-minimal-demo/, verification and provenance). No private IDs,
owner production YAML, screenshots or debugging artifacts committed.

Browser plugin absent; repository Playwright/system Chromium used. Synthetic HA
states/services/thumbnail fixtures are not physical Android/actual HA acceptance.
Owner accepted beta.3 Android sizing; beta.4 changes still need actual device
acceptance. Trusted Sonos thumbnails require corroborating Favorites/native Browse
metadata and browser image access. Unrepresentable temperature deltas intentionally
disable controls. Modern Popover API, ordinary anchored-menu and very-large-Hub
limits remain. No new backend/helpers/Car/roadmap features.

HACS testing: enable beta versions, redownload v1.10.0-beta.4, reload existing
honeycomb-menu-ng.js resource/cache. Minimal complete card:
examples/collapsible-picture-elements.yaml (replace synthetic entities). Legacy
mobile alias and explicit numeric sizing remain supported; non-collapsible Hub
defaults unchanged. Official HACS validation/payload compatibility do not imply
catalog admission or real-HA/hardware acceptance.

This handoff is on separate docs/v1.10-beta4-published-handoff. Released source
head is unchanged. Task complete: wait for owner feedback/next instructions.
Do not reapply work, merge historical PRs or publish another version automatically.
