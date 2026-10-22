# v1.7.1 — Stable

## v1.8.0-beta.7 — resolved energy-wave contour color

Approved functional source: PR #120 commit
`ad057f7133871826cab631b7a0f5e78fdb63dc2a`, directly on immutable published
beta.6. Release preparation changes version metadata, documentation and the
generated version banner only; every source and test file is unchanged.

- Omitted `energy_wave.color` inherits the final resolved inner-border color,
  including live Light/Sonos status/station colors and user border overrides.
- Optional color overrides use safe CSS color syntax and the existing frontend
  HA JS template evaluator. Invalid literals reject in-browser; missing,
  invalid or throwing template results suppress only the contour until valid.
- Same renderer/model, SVG contour and alpha/opacity. No geometry, timing,
  phase, scheduler, visibility/reduced-motion/health or performance-budget change.
- Complete cumulative beta.6 functionality remains: owner-approved 40%/logo
  gradients, display-reference auto sizing and fixed numeric sizes, power/fixed
  speed, native-only Sonos, Light zoom/presets, all navigation and coexistence.

[Complete no-hardware green/blue example](examples/energy-wave-color.yaml),
[color contract](docs/ENERGY_WAVE.md#contour-color--v180-beta7),
[sizing guide](docs/FLOORPLAN_SIZING.md). Full exact-release-head CI,
reproducible HACS bundle/checksums and the normal manually authorized publisher
must pass. This is a prerelease from an unmerged PR; installed HA and other
browser engines remain owner acceptance. Existing image-frame/touch-size and
Sonos/Sleep limits remain. No future Charger/Climate/Car modules, master merge,
stable promotion, retention changes or old release/tag/asset edits/deletions.

## v1.8.0-beta.6 — stable display baseline and power-responsive pulse

Cumulative on exact published beta.5 `ece8f9e5af7e92b1629cfe164cf000028b0b1068`.
The accepted40% gradient, logo gradient, all existing modules/actions, native-only
Sonos, numeric sizing, navigation and original coexistence are retained.

- `size: auto` now uses rendered image width / stable **display reference**,
  default1536 CSS pixels. Optional positive `auto_reference_width: 1500` makes
  1500px →82px,750px →41px regardless of bitmap1500/3000/6000px. This corrects
  beta.5's tiny baseline; never infer the reference separately on each client.
- Existing energy_wave defaults to fixed3000ms. Explicit power mode requires a
  per-cube max_power_w, with default900–2200ms bounds; fixed cycle_ms is supported.
  Effective cycles500–10000ms, safe validation and runtime static fallback.
- Hex contour/keyframes unchanged. One shared350ms playback-rate transition
  preserves animation phase/node identity; no per-cube timer, polling or DOM
  rebuild per power update. All health/visibility/reduced-motion gates and
  24-visible-motion budget remain. No Charger adapter or HA commands.

[Copy/paste sizing and migration](docs/FLOORPLAN_SIZING.md),
[rate mapping and sensor prerequisites](docs/ENERGY_WAVE.md),
[no-hardware power demo](examples/energy-wave-power.yaml). The19400W aggregate
reference is illustrative theoretical3×28A/400V capacity, not actual measured
power or a limit for all users. Individual references remain independent.

Full exact-head CI and manually authorized publisher must pass before an unused
immutable prerelease tag. #115/#117 remain open for owner real-HA verification.
Known static-image DOM/fallback/touch-size and native Sonos/Sleep limits remain;
HACS catalog and stable SemVer/migration review are separate owner gates.
No master/stable/retention change or prior release/tag/asset overwrite/deletion.


## v1.8.0-beta.5 — cumulative floorplan and shared presentation beta

Starts from the exact owner-accepted beta.4 commit
`355caa680ada9c38f7562fbc3a4df8344068140a`. Native-only Sonos, namespace
isolation, recursive Light zoom and existing actions/navigation are retained.

- Opt-in `size: auto` derives an effective numeric size from the actual floorplan
  image; contain/cover offsets, shared lifecycle observation, live menu geometry.
  Numeric sizes and omitted fixed-82 default remain. Unsupported frames safely
  fall back to 82px. No additional scaling engine or YAML dimensions.
- Default active gradient edge darkening is 40% with softer visible spread;
  decorative Hub logos receive shared depth. Independent borders, explicit
  styling precedence and solid inactive physical fills remain.
- Optional normalized `energy_wave` draws a genuinely six-sided expanding SVG
  contour in the existing renderer, with healthy positive-power/motion/visibility
  gates, one shared observer and a 24-animation budget. No Charger module.
- Consolidated reviewed English terminology/dark anatomy diagram/stable badge,
  complete GPL/NOTICE/SPDX metadata, local HACS payload validation and manual
  official catalog readiness review. No upstream listing submission.

See [floorplan YAML/limits](docs/FLOORPLAN_SIZING.md),
[synthetic no-device wave demo](examples/energy-wave.yaml),
[shared visual policy](docs/CUBE_PRESENTATION.md),
[Sonos migration](docs/SONOS_NATIVE_FAVORITES.md) and
[HACS readiness](docs/HACS_SUBMISSION.md). Small auto-scaled touch targets,
HA DOM compatibility, non-Chromium hardware and GPU/battery behavior still
need owner real-HA testing. HACS topics/default-branch license/fork admission
remain owner/external gates; local checks do not certify catalog approval.
Beta.4's intentional Sonos cache removal and NG namespace migration still
require SemVer/stable review. No master merge, stable promotion, retention
change, existing tag/asset overwrite or mutation of private v1.7.1-beta.5.


Owner-approved on 2026-10-21 after real Home Assistant testing of cumulative
v1.7.1-beta.8 at `c1cdd390bed1c1acfc22b314807ce63050e43248` (Issue #102).
Issues #90, #97 and #99 are completed. Functional source is exactly that beta;
the rebuilt stable JavaScript adds only a `v1.7.1` version comment. All earlier
releases/tags/assets, including beta.5's unpublished private draft, are preserved.

- Sonos controls match Light's icon/text layout at the shared 82 CSS-px size.
  Slots: 1 Radio, 2 Play/Pause, 3 Join, 4 Sleep, 5 Volume Down, 6 Volume Up.
- Known Radio favorites propagate cached artwork and deterministic station colors
  to Hub launchers and promoted centers; playing fill is station-colored,
  paused/idle fill is neutral gray with compact artwork. Existing favorites sensor
  and template-cache YAML, ordering, artwork and playback remain compatible.
- Join supports real group membership, room discovery and configured member/script
  overrides. Radio, Join and Sleep are siblings: switches replace the active view,
  one Back returns to Sonos main. Idle-close inherits the configured timeout
  (8 seconds default, intentional zero preserved). Passive HA updates/discovery
  do not extend it, and late responses cannot resurrect abandoned menus.
- Native Sonos Sleep uses `sonos.set_sleep_timer` / `sonos.clear_sleep_timer` on the
  selected group's coordinator: 15/30/45/60/90 minutes and Cancel/OFF. The speaker
  owns the timer; no HA helper/script/automation setup. Remaining time is a local
  estimate, not device readback. See [timer limitations](docs/SONOS_SLEEP_TIMER.md).
- Recursive Hue and bounded linear Kelvin zoom preserve the exact selected slot
  and value. Holds never apply a Light service; Back restores exact palettes and
  full close resets. White swatches are filled hexagons without visible dots or
  values, with screen-reader labels. Native Kelvin bounds are required; client
  precision is 1 K and devices can quantize more coarsely.
- Accessible responsive SVG layout model, canonical terminology and versioned
  human/AI guides ship with all existing Light presets, media controls, dynamic
  Hub allocation and drag-select behavior.

Stable publication requires a reviewed beta-approval manifest, exact unchanged
runtime/dependencies, a reproducible bundle, matching green CI on the exact master
commit and explicit manual authorization. Version/title gates support future
canonical stable SemVer releases. Retention must remain explicitly false; the
post-publication retention call is forced read-only. No releases, assets, tags,
refs, branches or source history are cleanup targets during this release.

HACS: Redownload Honeycomb Menu NG and select v1.7.1 stable, then hard-refresh all
clients. Keep the existing `honeycomb-menu-ng.js` JavaScript module resource.
Existing HA Sonos services and optional favorites/cache setup remain prerequisites;
no new helpers or configuration keys. Car/Charger, Climate and unrelated
#83/#92/#93/#87/#86 work are excluded. Existing mobile outer-menu edge cropping
and native Sleep readback limitations are unchanged. Future stable versions still
require beta testing and explicit owner approval.

---

# v1.7.1-beta.7 — cumulative Sonos visuals and Kelvin zoom

## v1.7.1-beta.8 — cumulative Sonos navigation and idle-close

Based on exact published beta.7 `737a13c8f1a1020db18e14325a40240708dc2706`.
Radio, Join and Sleep are sibling views: direct switches and repeated opens replace
rather than push; Back once returns to Sonos main. All inherit the configured
module idle timeout (8 seconds default, intentional zero preserved). Passive HA
updates and asynchronous discovery do not renew the deadline. Late responses are
scoped to their originating view and cannot resurrect abandoned menus. Genuine
children and recursive Light Hue/Kelvin zoom keep their exact Back history.

Preserves all beta.7 features and visuals, native Sonos Sleep services without
helpers, Join discovery/grouping, Radio recognition/cache, 82 CSS-px geometry,
Light presets and dynamic placement. Clock-controlled desktop/mobile regressions
cover sibling permutations, deadlines/interaction, pending discovery, native Sleep
selection/cancel and overlay cleanup. See [HA checklist](docs/V1_7_1_BETA.md).

One cumulative HACS prerelease only after full matching CI and normal manual
publisher gates. Real HA/device confirmation remains required; no stable/master
merge or issue closure. Prior beta tags/assets and beta.5's unpublished private
draft stay immutable; retention settings and excluded issues are untouched.


Based on exact published beta.6 `214443460f827c05f977a8aaeefe48f71a7216b6`.
Sonos/Light work is isolated in reviewable commits; no PR or master merge.

- Sonos function icons and labels inherit ordinary Light's shared hierarchy.
  Playing station artwork shifts down with volume text unobstructed; paused/idle
  artwork stays compact at 62% of usable fill, retaining gray cube fill, station
  inner border, aspect ratio and exact 82 px geometry. Radio behavior is unchanged.
- White outer-menu swatches are solid Kelvin fills without dots/icons/visible
  codes. Screen-reader names preserve exact values. Tap sends one validated native
  temperature; hold/Shift+Enter/Shift+Space opens bounded linear Kelvin refinement
  with no HA service call. Preserve exact selected slot/value and Back snapshots;
  full close resets to native bounds. Existing Color interpolation is unchanged.
- Keep native device-owned Sonos Sleep without helpers, Radio recognition/cache,
  Join Back/grouping, light presets, dynamic placement and terminology.

Limits: native numeric Kelvin bounds are mandatory, with no invented range or
mired conversion. Client precision is 1 K because HA has no standard hardware
Kelvin-step attribute; lamps can quantize more coarsely. Zoom stops before duplicate
or identical refinements. Original ranges with fewer than twelve integer values
keep twelve legal sampled cells with unavoidable repetitions and no zoom. Kelvin
RGB is approximate. Real HA/Sonos/lamp validation and non-Chromium testing remain
necessary; existing narrow-screen outer-menu cropping is unchanged. Sleep labels
are estimates, not hardware status/readback.

[HA beta checklist](docs/V1_7_1_BETA.md), [Kelvin rules](docs/LIGHT_MODULE.md#recursive-white--kelvin-zoom--issue-99-beta7),
[Sonos reference](docs/SONOS_MODULE.md), [terminology](docs/TERMINOLOGY.md).
Existing beta tags/assets and beta.5's unpublished draft stay immutable. No stable
release, master merge, retention changes or issue closure. #90/#97/#99 require
owner validation; #83/#92/#93/#87/#86 are excluded.

---

# v1.7.1-beta.6 candidate — native Sonos device Sleep Timer

Unpublished candidate from cumulative beta.5 source, preserving beta.4 recognition
and Light Zoom, beta.5 artwork scaling/Join Back and PR #96 terminology. Replaces
the rejected helper/script/automation timer with official `sonos.set_sleep_timer`
(seconds, maximum 7200) / `sonos.clear_sleep_timer`. No manual HA setup. All five
choices and Cancel/OFF target the freshly validated current coordinator.

Speaker owns expiry; browser/HA restart should not stop a powered speaker's timer.
Real HA/Sonos confirmation is still required. Remaining-time display is explicitly
a local estimate, not device readback; reload/reconnect/group changes show unknown.
Failures/timeouts never claim OFF or retry playback. Native group changes follow
Sonos semantics, without extra Honeycomb cancellation. See
[native API/limitations and checklist](docs/SONOS_SLEEP_TIMER.md).

Beta.5 tag, unpublished draft and assets remain immutable historical artifacts.
New-release publication lookup uses bounded paginated inventory reads for a missing
draft, then exact-ID draft/asset validation before public PATCH. There is no
existing-draft resume or mutation retry; permission failures still stop.
Separate owner approval plus exact head/CI/metadata/reproducibility/checksum guards
are required for a NEW beta.6 publication; no release was published by this change.
No stable/master merge, retention setting change or release/tag deletion.

---

> Historical beta.5 notes below describe the rejected helper implementation in
> its frozen **unpublished draft**, not the beta.6 native device timer.

# v1.7.1-beta.5 — cumulative Sonos Sleep, artwork and navigation

Based on exact immutable beta.4, preserving its Radio recognition/cache behavior,
Join/grouping, media controls and the owner-tested recursive Light Color Zoom.
Documentation-only terminology PR #96 is deliberately integrated into this branch;
no review PR or master is merged by publication.

- Compact playing artwork leaves room for 0/2/42/100% volume labels. Paused artwork
  expands within clipped cube fill, retaining gray fill, station-colored inner
  border and shared 82 px geometry. Both module launcher and promoted center tested.
- Fix repeated Join reentry stacking identical views and stale asynchronous
  discovery after navigation. Accessible center Back returns one level; room
  discovery, native grouping and configured scripts/members remain working.
- Replace Sonos slot 4 Browse with native **Sleep**: 15/30/45/60/90 minutes plus
  Cancel/OFF. Radio, Play/Pause, Join and volume retain their slots and handlers.
  Explicit custom HA Browse navigation remains supported.
- **Sleep requires the optional HA package**: two helpers, one queued script and
  one automation per selected player. HACS frontend cannot create these. HA owns
  the persisted deadline and expiry; there is no browser-only countdown/action.
  Commands bind to one selected player, reject stale expiry and recheck the group.
  Any group change/unavailability cancels; unrelated rooms are never targeted by
  a global pause. Errors are surfaced without delayed playback retries.
- **Browser closure/reload preserves the job; HA restart, automation reload and
  state-helper reload cancel it safely. It does not resume across HA restart.**
  Separate instances remain independent; overlapping timers have no global arbiter.

See [HA setup / test checklist](docs/SONOS_SLEEP_TIMER.md),
[HACS beta instructions](docs/V1_7_1_BETA.md) and [terminology](docs/TERMINOLOGY.md).
Package YAML/Jinja service contracts and browser tests are not a running HA Core
or physical Sonos installation. Real HA group/event behavior, artwork access,
external setup and non-Chromium still require owner validation. Unsupported station
formats fall back; very long helper payload identifiers fail closed. Existing
narrow-screen outer-menu cropping is unchanged. #83 stays independent dry-run only;
#92/#93/#87/#86 are excluded. No stable publication, master merge or deletion of
releases/tags/branches/history is authorized. Owner approval after HA testing is
required before stable promotion.

---

# v1.7.1-beta.4 — cumulative Sonos radio artwork and Light Zoom

Continues from immutable cumulative beta.3 (`b61374e6589111642768b305724d52c385eccfa6`),
retaining all Sonos beta.2 fixes and recursive Light Color Zoom. No stable/master
merge is authorized.

- Recognize the owner's real-HA-shaped `Station Alpha · programme text` channel
  using an exact, unique station prefix corroborated by the favorite map and
  typed cache title. Also accept HA's spaced bullet format. No fuzzy names,
  arbitrary suffixes, track-title matching or inferred stream-session mapping.
- Compare plain radio channels against unique exact favorite-map OR cache labels,
  normalizing case/whitespace/NFC and rejecting conflicts. Existing FV IDs,
  four-field caches, sensors, playback actions and favorite order are unchanged.
- Preserve logo, hue inner ring and playing fill on parent Hub ring launchers,
  promoted Sonos centers and deeper Radio/Join centers. Artwork no longer vanishes
  solely because the navigation icon is `mdi:arrow-left`; Back still works.
  Pause/stop stays neutral; unknown content/failed artwork falls back safely.
- Add explicit privacy-safe diagnostic inspection, realistic FV/stream fixtures,
  unit and desktop/mobile transition regressions, and immutable beta.3 before
  screenshots. No automatic logging, polling or identifier/URL disclosure.

Known limitations: only exact identifiers/labels and the two validated structured
channel formats identify stations. Ambiguous names, unverified suffixes and
unavailable artwork fall back. Actual HA/HACS, group metadata, artwork access,
non-Chromium and external automation require owner testing; the existing 82 px
outer ring can crop at narrow viewport edges. Stable v1.7.1 requires explicit
approval after real HA beta testing. No retention settings, releases, tags,
branches or history are deleted/replaced.

See [diagnostics](docs/SONOS_MODULE.md#station-recognition-diagnostics) and
[HACS / real HA checklist](docs/V1_7_1_BETA.md).

---

# v1.7.1-beta.3 — cumulative Sonos and Light owner test

One HACS bundle combining **all tested Sonos beta.2 code** from PR #91 at
`282794d3650951d7bc7fd9ce514069ca68fcd121` with isolated Light PR #94 at
`7c7ee3e7ebc528f0aeaa07243631f09ed8d67bd6`. Both original branches remain
unmerged. This integration does not change master or authorize stable publication.

- Preserve Sonos slot/alignment, exact/validated station recognition, cached
  artwork, station/paused colors, native discovery/grouping, script overrides,
  actual HA Browse Media route, Radio behavior and all beta.2 regression tests.
- Add recursive Light Color Zoom: tap applies once; hold refines around the fixed
  selected physical slot/HS without HA calls. Current neighbors bound the new
  palette, with five clockwise and six counterclockwise samples, circular hue
  interpolation, linear saturation and exact endpoints.
- Back restores each complete palette; close/reopen resets. Live HA updates keep
  history. Keyboard Shift+Enter/Space zooms; Escape closes/resets focused swatches.
- Preserve 82 px renderer, inner controls, White/Kelvin, presets, on/off-only
  lights, generic Media, dynamic visibility, nested anchors and gestures.

The isolated Light branch is not published as a competing module-only HACS beta.
No v1.7.2 release is used. Beta.1/beta.2 tags and assets stay immutable. #83 remains
an independent read-only retention audit, with the enable gate false and no deletion.

Known limitations: exact Sonos radio-channel/cache/name matches may not identify
all streams; registry/grouping services and Media panel availability depend on HA.
Browse uses the supported Media panel route rather than a private lazy dialog.
The existing 82 px outer ring may crop at very narrow viewport edges. Physical HA,
external scripts, non-Chromium browsers and actual HACS installation require owner
validation. Stable v1.7.1 requires explicit approval after cumulative beta.3 testing.

See [combined HACS smoke tests](docs/V1_7_1_BETA.md) and
[Color Zoom semantics](docs/LIGHT_MODULE.md#recursive-color-zoom-issue-85-beta3).

---

# v1.7.1-beta.2 — Sonos real-HA corrections

Sonos-only follow-up on unmerged PR #91. Beta.1 remains immutable. Stable and
master promotion require owner real-HA approval. Cumulative beta.3 will add Light
Color Zoom only after its isolated PR and combined regression suite pass.

- Bridge FV favorite IDs to Sonos radio stream URIs through a unique exact
  radio-channel/favorite-name/cache-title correspondence, preserving exact ID/URI
  matching, original cache compatibility and all Radio playback/order/artwork.
- Treat legacy `active_color` as fallback; recognized stations provide their
  accent while explicit `colors` still win. Paused/stopped center remains neutral.
- Discover registry-confirmed Sonos players on Join open and use supported native
  join/unjoin without mandatory member/script keys. Preserve manual/script overrides,
  live group visuals, safety checks and explicit metadata/feature/error states.
- Browse opens HA's selected-player Media panel rather than more-info. No private
  dialog loader, invented events or new backend helper is used.
- Generalize the optional HA cache recipe to centrally configured source players,
  failover/startup refresh and source/schema diagnostics. Existing templates work.

Known limits: exact channel names may not identify every stream; ambiguous or
partial names fall back safely. HA registry access, GROUPING features/services,
Media panel availability and browser-accessible logos are external prerequisites.
Actual HA hardware and UI behavior require the owner's beta testing.

See [Sonos details](docs/SONOS_MODULE.md) and [HACS test guide](docs/V1_7_1_BETA.md).

---

# v1.7.1-beta.1 — Sonos owner test

PR #91 remains unmerged. This is beta metadata, not stable v1.7.1 approval.

- Preserve Light-aligned Sonos controls, corrected inner slots, actionable Join
  candidates, accurate HA membership/setup/error states and external script contract.
- Add deterministic Light-wheel Radio accent rings without changing order,
  favorite playback, thumbnails, cache recipe, geometry or navigation.
- Use cached artwork and station accents on reliably identified Sonos launchers
  and main selected centers. Pause/stop restores neutral fill; unknown/invalid or
  inaccessible artwork falls back. Explicit styling precedence is documented.
- Replace README ASCII layout with a checked-in accessible responsive SVG matching
  physical slots 0–18. Retain machine-readable AI mapping and semantic tables.

Known limits: real HA Sonos usually exposes a playback URI rather than a favorite
ID. Exact matching needs an ID or a unique explicit URI in existing external cache
metadata; the shipped recipe is unchanged. No title guessing. Twelve hues can be
shared in larger lists. Chromium/synthetic HA tests do not replace owner hardware
validation. Car, Climate and recursive Color Zoom remain out of scope.

Beta publication supports any branch and SemVer beta train, with explicit manual
authorization, exact branch-head and green CI gates, immutable tags/releases,
reproducible HACS assets and verified draft uploads. Stable publication remains
forbidden in that workflow. See [beta publishing](docs/BETA_RELEASES.md) and
[HACS test instructions](docs/V1_7_1_BETA.md).

---

# v1.7.0 — Stable

Honeycomb Menu NG v1.7.0 promotes the tested restart/v1.5.1 line: Phase 1 PR #77,
Phase 2 PR #81, documentation PR #84 and retention PR #88. No v1.6 implementation
is imported. The versioned JS asset remains `honeycomb-menu-ng.js` for HACS.

- Shared full-cell Hub/Control renderer, default 82 CSS px, consistent icons,
  labels, center fill, rings, colors, actions and anchored nested navigation.
- Preserved Light brightness, capability-aware Color/White palettes, numeric presets
  on separate devices/helpers, explicit on/off-only behavior, Media/Sonos group
  volume, favorites/artwork, Join, Browse and drag-select.
- Issue #78 fixes the disappearing Light launcher/preset after nested navigation;
  the six-action Light layout and working Color action remain unchanged.
- Dynamic HA-state/attribute/numeric AND/OR/NOT visibility on Hub items. Hard
  reservations, priority reclaim and stable soft placement; `logo: false` frees
  slot 0. Structural changes defer during menus, gestures and delayed actions.
- Restored verified Layout model, human onboarding, versioned AI guide and complete
  synthetic examples, including external HA Sonos cache/grouping prerequisites.
- Release retention based on latest stable: stable current/previous MAJOR,
  prerelease current/previous MINOR, future prerelease trains and all drafts kept.
  **Retention remains disabled for this release** (`RELEASE_RETENTION_ENABLED=false`,
  owner-verified); publication forces a fresh read-only report, with no deletion.
- Exact-master stable publisher verifies CI, committed/rebuilt artifact checksums,
  new tag, draft assets, stable/latest flags, HACS filename and retained versions.

Control migration: use explicit `module:` and shared keys; `size: 82` is full-cell
width. Older inset/Menu-size Control YAML may require adaptation. Static Hub layout,
legacy media→Sonos alias and classic popup center/slot semantics remain supported.

Known limits: 217 physical positions (additional configured dependencies are tracked
with overflow diagnostics); no paging/auto-shrink; anchored layouts can clip at
viewport edges; only the documented condition subset; intentional structural deferral;
conservative JS templates; 12 Radio/Join outer choices. Automated browser tests use
Chromium and synthetic HA; actual HA integration setup still requires configuration
checks and device validation. Owner has validated beta.3 visibility/deferred placement
in real HA. Future recursive palette (#85), native Car (#86), Climate/Thermostat (#87)
and Charger modules are not implemented. Charging automation remains external.

Validation suite: **127 unit tests** (including 79 retention and 29 publisher cases),
13 core contract groups, **54 desktop/mobile regressions + 12 documentation
interactions**, 54 YAML blocks, 22 complete cards + 14 contextual fragments and
75 local links. All workflow lint and production/checksum gates are required.

Verification: all unit/contract, desktop/mobile, docs/YAML/link, production-build,
workflow-lint and checksum gates must pass on the exact tagged master commit.
Published `SHA256SUMS.txt` and `release-provenance.json` record bundle checksum,
byte size and source commit. Deleting a Release record in a future approved cleanup
also removes its uploaded assets; Git tags, branches, commits and tagged source
remain permanently. See [publication](docs/RELEASING.md) and
[retention](docs/RELEASE_RETENTION.md) guides.

---

# Honeycomb NG v1.7.0-beta.3 — Dynamic Hub visibility and stable slots

Phase 2 of #76 / #79 starts from merged PR #77 on restart/v1.5.1 at
`697dec5846fc6b73199fb39562eef5a733ba49c5`. No v1.6 code is used.

- Live HA-style state/numeric_state/and/or/not visibility on Hub items; precise
  dependency snapshots handle same-object state/attribute changes.
- Pure hard/priority/soft allocation with hidden hard reservations, preferred
  priority preclaims, deterministic fallbacks/collision diagnostics, stable soft
  positions and ordinary slot 0 when logo:false.
- Preserve old automatic layouts, the shared 82 px renderer, Light/Media/Sonos,
  presets/favorites/navigation and the beta.2 missing-Light fix.
- Defer structural transitions through menus, touch/pointer/drag and delayed taps.
  Commit the latest desired state atomically at an on-demand frame boundary.
- Cover conditions, collisions, overflow, deferred navigation/gestures, multiple
  Hubs, availability/show compatibility and current 5/20/50-item performance.
- Current physical capacity is 216 ring slots plus center. Configured items beyond
  capacity remain evaluated and report overflow; no silent truncation/wrapping.

The pre-release is tagged at the verified tested feature commit. The Phase 2 PR
is **not merged** into restart/v1.5.1; master and stable v1.5.1 are unchanged.
Exact test results, artifact checksum and commit are in the GitHub release notes.

Known limits: the documented condition subset only; arbitrary JS show/presentation
is conservative; no paging/auto-shrink; anchored menus can clip near viewport edges.
Actual HA devices/other browsers and long-term memory need owner validation.
Car/Charger modules and charging automations are not implemented.

[Current Phase 2 contract and YAML](docs/V1_7_PHASE2.md).

---

# Honeycomb NG v1.7.0-beta.2 — Light navigation fix

Fix #78: menu-owned cubes no longer hide themselves when opening nested menus.
Lit reuses those cells during in-place navigation; the old dashboard-launcher
hide/restore logic left a preset and the returned Hub launcher invisible.
Standalone launchers retain their normal hide/restore behavior.

The v1.5.1 Light mapping is unchanged: 100%, brightness preset, Color/White,
standard color/Kelvin preset, −5%, +5%. Color was already present. The reported
empty position is the reused hidden preset cell (physical slot 2 for the first
Light; slot 4 for the second Light in the three-item fixture).

- Preserve the shared 82 px renderer, all Light/Media/Sonos features and drag-select.
- Add desktop/mobile repeated nested/back/close/reopen, preset/capability and
  standalone restore regressions, including Chromium touch input.
- Validate unit/contract tests, production build and the complete browser suite
  before publication; exact results/commit are recorded in the GitHub release.
- Generalize the guarded manual publisher to validated v1.7.0 beta tags, retaining
  exact tag/commit/CI/artifact checks and prerelease=true/latest=false.

This beta is published from PR #77's tested feature commit, **not merged into
restart/v1.5.1**. Master and stable v1.5.1 remain unchanged. Dynamic visibility,
priority placement and Car/Charger are not implemented. Existing narrow-screen
outer-ring clipping and simulated-HA/Chromium-only test limitations still apply.

See [the investigation and slot map](docs/ISSUE_78.md) for details.

---

# Honeycomb NG v1.7.0-beta.1 — Shared Hub and Control Engine

Phase 1 of #76, developed exclusively from `restart/v1.5.1` at
`c1d9507ee48e65b951f6302c668dadf17043c195`. No v1.6 implementation was merged,
cherry-picked or ported.

**This pre-release is published from the tested feature-branch commit. Its PR is
not merged into restart/v1.5.1. Master and latest stable v1.5.1 are unchanged.**

- Hub, standalone Control and managed menu cubes share one full-cell renderer,
  proportional content metrics, configurable fills/rings and action handling.
- Both public components default to a physical width of 82 px. Control selects
  the same modules with `module: light`, `media`, `sonos` or `generic`.
- Preserve logo:auto count behavior. logo:false removes branding while allowing
  ordinary cubes at center slot 0. Empty Hubs do not invent a fallback control.
- Preserve Light palettes/preset apply/store, Media/Sonos playback, group volume,
  grouping, favorites/cache artwork and anchored nested navigation.
- Expandable axial ring geometry removes the seven-item Hub truncation and the
  fixed 18-position core ceiling. Regression coverage renders 50 configured items.
- Forward HA events instead of polling every 200 ms; avoid unchanged model renders
  and continuous Hub anchor RAF. Do not infer unmeasured performance gains.
- Capture checksum-recorded v1.5.1 desktop/mobile visual references and add browser
  checks for painted parity, geometry, module actions, live state and gestures.

## Validation

The release assets are built and syntax/metadata checked from the tagged feature
commit. Unit/contract and Chromium browser results and the exact commit are
recorded in the GitHub release description after final validation. Browser tests
use synthetic HA state/services, deterministic icon glyphs and real pinned
button-card 7.0.1 at desktop/mobile sizes.

## Known limitations

- Dynamic declarative visibility and priority placement are not yet implemented;
  these configuration keys are rejected with a clear later-phase message.
- Car and Charger modules are not implemented.
- Existing `show` remains evaluated when opening/configuring a menu.
- Large anchored scenes can extend beyond narrow viewports; no auto-shrink/paging.
- Continuous CSS-only anchor animations are not followed on every frame.
- Advanced button-card-only template/action contexts need installation validation.
- Actual HA/device integrations and browser engines other than Chromium are untested.

Read [docs/V1_7_PHASE1.md](docs/V1_7_PHASE1.md) for configuration and migration.

---

## Honeycomb Menu NG v1.5.1 – Light State Clarity

This stable patch improves Light status presentation and adds native handling for simple on/off-only lights.

### Light status
- Dimmable light on: shows live brightness percentage.
- Dimmable light off: shows `Off`.
- On/off-only light on: shows `On`.
- On/off-only light off: shows `Off`.
- Unavailable light: keeps the existing gray `Unavailable` presentation.

### On/off-only lights
If Home Assistant explicitly reports `supported_color_modes: ['onoff']`, Honeycomb treats the entity as a simple toggle:
- short tap toggles the light
- no Light detail level is opened on long press
- no meaningless brightness/preset/palette controls are presented

The detection is deliberately conservative. Missing capability information, including temporary remote/unavailable states, does not classify a light as on/off-only.

### Documentation/tests
README, Light documentation and the AI setup contract now document this behavior. Regression tests cover On/Off labels, on/off-only menu suppression and unavailable-state capability uncertainty.
