# v1.8 beta owner test guide

## beta.1 — runtime namespace isolation

Based on public stable v1.7.1, with the same Light-based 82px visuals and domain
features. Internal menu/item/XY elements, APIs, lifecycle events, template cache,
audio ID and menu-private CSS tokens belong to NG. See [runtime contract](NG_RUNTIME.md)
for exact names and mixed-install popup disambiguation. Hub/Control YAML is unchanged.

Default active gradients, bounded presentation overrides and the future charging
wave are **not implemented in beta.1**. Sonos Favorites research is not bundled;
existing configured favorites/cache sensors keep working **in beta.1–beta.3 only**;
beta.4 removes template-cache support as described below. No Charger/Climate/Car
module or backend integration is installed.

HACS: enable beta versions, redownload Honeycomb Menu NG, select the published
v1.8 beta explicitly and hard-refresh every client. Stable users remain on v1.7.1.
Keep each project's resource only once. Do not load an old NG bundle alongside
new NG. For testing **original Honeycomb plus new NG**, use separate resources
and explicitly NG-owned popup routing; legacy unmarked external popup actions
select original. Never remove live resources/configuration without an owner backup.

Owner checklist:
- NG alone: existing persistent Hub/Control YAML, generic/classic popup and action
  dispatch, overlays/Back/idle/drag selection and dynamic hard/priority/soft slots.
- Original alone and both load orders after a clean cache reload: each plugin's
  classic API/event opens its own menu; no duplicate registrations/global overwrite.
- Light RGB/Kelvin state, on/off, brightness/presets and both recursive zooms;
  tap applies once, hold changes no device state, Back restores exact palettes.
- Sonos playing/paused artwork/volume, favorite order/playback, live station/Browse
  updates, Join discovery/grouping and sibling navigation/idle-close.
- Native Sonos Sleep leader/follower/cancel, browser closure/reload and HA restart
  expectations; remaining labels are estimates, never device readback.
- Desktop, tablet and touch mobile, including dashboard reload/resource update.

Real HA and original-plugin behavior outside the pinned browser fixture still
require owner testing. Existing narrow-screen outer-cell cropping and native
Sleep readback limitations are unchanged. Explicit JavaScript/global-selector
migration and mixed-popup routing need owner review before any stable promotion.
No master merge or stable publication is authorized by beta testing.

## beta.2 candidate — cumulative presentation

Includes beta.1 namespace isolation plus shared static active gradients and bounded artwork layout. See [CubePresentation](CUBE_PRESENTATION.md). No charging animation or research module is shipped. Compare active RGB/Kelvin Light, playing/paused Sonos, independent borders, explicit center/solid/edge settings and mobile text/artwork legibility. Run the complete beta.1 checklist too; stable requires owner real HA approval.

## Cumulative beta.3 and beta.4

Beta.3 calibrates the shared active fill edge to 30% default darkening; explicit
20% settings remain 20%, center equals inner border and inactive fills remain solid.
Beta.4 includes exact tested beta.3 ancestry plus [native Sonos favorite
metadata](SONOS_NATIVE_FAVORITES.md) as the default and only enrichment provider.
Legacy template-cache support is removed; migrate before upgrading. No template
YAML or backend integration is needed. This owner-approved breaking beta change
requires a SemVer major/stable compatibility review before promotion.
Both releases remain immutable prereleases; master/v1.7.1 stable are unchanged.
Beta.5 is reserved for actionable owner HA findings; no automatic stable promotion.

## Cumulative beta.5

Builds on immutable beta.4 `355caa680ada9c38f7562fbc3a4df8344068140a`,
including owner-accepted native-only Sonos. Adds [auto floorplan sizing](FLOORPLAN_SIZING.md)
through the existing numeric pipeline, 40% softer-spread active depth, decorative
logo gradients and an optional [true hexagonal energy overlay](ENERGY_WAVE.md).
Reviewed English diagram/terminology and bounded local HACS/GPL readiness fixes
are included. Catalog topics/default-branch license/fork acceptance remain
external owner gates; no official listing submission. No Charger/Climate/Car.

Install by HACS Redownload → Show beta versions → v1.8.0-beta.5; hard-refresh
clients and retain one NG resource. Beta.4 removed the legacy Sonos cache option:
follow its migration if upgrading from older versions. Never recreate that cache.
Test numeric versus auto image ratios and touch targets, Light zoom/presets,
Sonos artwork/Radio/Join/Sleep/Back, reduced-motion and tab/offscreen wave gates.
Master/v1.7.1 and previous releases stay unchanged. Stable still requires owner
real-HA approval and explicit namespace/SemVer migration review.
