# v1.8 beta owner test guide

## beta.1 — runtime namespace isolation

Based on public stable v1.7.1, with the same Light-based 82px visuals and domain
features. Internal menu/item/XY elements, APIs, lifecycle events, template cache,
audio ID and menu-private CSS tokens belong to NG. See [runtime contract](NG_RUNTIME.md)
for exact names and mixed-install popup disambiguation. Hub/Control YAML is unchanged.

Default active gradients, bounded presentation overrides and the future charging
wave are **not implemented in beta.1**. Sonos Favorites research is not bundled;
existing configured favorites/cache sensors keep working. No Charger/Climate/Car
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
- Sonos playing/paused artwork/volume, favorite order/playback, live station/cache
  updates, Join discovery/grouping and sibling navigation/idle-close.
- Native Sonos Sleep leader/follower/cancel, browser closure/reload and HA restart
  expectations; remaining labels are estimates, never device readback.
- Desktop, tablet and touch mobile, including dashboard reload/resource update.

Real HA and original-plugin behavior outside the pinned browser fixture still
require owner testing. Existing narrow-screen outer-cell cropping and native
Sleep readback limitations are unchanged. Explicit JavaScript/global-selector
migration and mixed-popup routing need owner review before any stable promotion.
No master merge or stable publication is authorized by beta testing.
