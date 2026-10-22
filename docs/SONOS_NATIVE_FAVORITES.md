# Native Sonos Favorites — v1.8.0 candidate

**Breaking migration from v1.7.1:** Home Assistant Browse Media is now the **only** Sonos
favorite artwork/metadata enrichment path. There is no opt-in switch, template
sensor autodetection or legacy fallback, even when an old cache entity exists.
The official native favorites sensor remains the source of IDs and ordering.

## Migrate before upgrading

1. Remove every `favorites_cache_sensor` property from Sonos Hub/Control YAML.
   The option now produces a clear configuration error. Remove any experimental
   `favorites_browse` setting from the earlier unpublished PR candidate too.
2. Remove the custom **favorites-cache template definition** previously installed
   for Honeycomb, including its refresh triggers/automation if used only for that
   cache. Keep unrelated templates, helpers and the **official native** Sonos
   favorites entity. Review/reload your HA configuration yourself; Honeycomb does
   not edit files, delete entities or change live HA configuration.
3. Enable the official Sonos favorites entity (often disabled by default), and
   confirm its actual ID. The default is `sensor.sonos_favorites`; specify a
   different actual entity with `favorites_sensor` if necessary.
4. After owner-authorized publication, install the approved version, hard-refresh all dashboard clients and verify Browse Media
   responses/artwork. No new template, helper, script, automation or backend needed.

The owner approved and tested the native-only behavior, is the sole current user
and has already migrated to the 1.8 track. The selected release is v1.8.0; no
additional SemVer migration decision is pending. This candidate is not publication
approval and leaves master unchanged.
Previous tagged releases retain their original cache support/documentation.

## Copy, replace IDs, test

[Complete Hub example](../examples/sonos-native-favorites.yaml):

```yaml
type: custom:honeycomb-persistent-hub
logo: false
size: 82
items:
  - type: sonos
    entity: media_player.player_a
    name: Player A
    favorites_sensor: sensor.favorites_a
```

Standalone Control:

```yaml
type: custom:honeycomb-persistent-control
module: sonos
entity: media_player.player_a
favorites_sensor: sensor.favorites_a
```

Replace synthetic IDs with actual available Sonos/native favorites entities.
If the default native sensor ID is correct, a Sonos item needs only `type: sonos`
and `entity`. Legacy Hub `type: media` still selects Sonos; `module: media`
explicitly selects the generic player module instead.

## Data and identity contract

- Native favorites `attributes.items` is an ID→title map, for example
  `{"FV:2/57":"Station Alpha"}`. Sensor order and exact IDs control Radio/playback.
  No sensor/empty map means no browsing; browse alone never populates Radio.
- Supported authenticated read-only WebSocket command:
  `media_player/browse_media`, selected verified coordinator, type `favorites`,
  ID `""`. Only its exact returned `favorites_folder` IDs are read. Leaves provide
  `favorite_item_id`, ID/title/thumbnail. IDs are bounded opaque identifiers;
  native Sonos normally uses FV IDs. No station web scraping or service calls.
- Native metadata needs both exact ID and agreeing sensor/browse favorite title
  (Unicode normalization/outer whitespace only). Duplicate identities, stale or
  differently named colliding library entries fail safely. No cache entity is read.
- Browse Media exposes **no universal FV-to-stream URI mapping**. Recognition uses
  exact favorite ID, or a unique radio `media_channel` corroborated by both map and
  typed native metadata. The explicit `Station Alpha · Programme` / spaced bullet
  format is parsed conservatively. Ambiguous names, arbitrary track titles and
  unknown stream URLs never identify a station; no URI guessing or learning.
- Known artwork/accent updates the Hub launcher and promoted Sonos center live.
  Playing fill follows the station inner-border color and the approved 40% darker edge.
  Paused/idle remains solid neutral while reliable artwork/accent may remain.
  Radio order, twelve choices and playback actions are unchanged. The shared image
  error path restores icon/title on broken images, including Radio. Normal Sonos
  presentation is the fallback when browse/artwork/identity is unavailable.

## Lifecycle, limits and diagnostics

One memory cache per browser tab/HA connection is shared by cards. Tabs fetch
independently; reload starts fresh. No storage, synthetic HA states, global auth
state, backend, config-file writes or per-cube polling. Available reciprocally
verified coordinators serve selected followers; known non-Sonos registry entries
and unknown/unavailable groups do not browse. Separate connections/players/maps
never share results.

Bounds: 32 active cached contexts, 512 map entries/returned leaves, eight folders,
two actual outstanding WS reads; 120 ms debounce, eight-second operation deadline
including queue waiting, five-minute shared expiry refresh while observed. Reorder
reuses metadata; rename/deletion, group/config changes, reconnect/HA restart and
disposal invalidate ownership. Pending cancellation is logical: the official WS
API has no abort operation. Unresolved transport reads keep their budget until
reply/disconnect. Late responses cannot restore old groups or reopen menus.

Errors use a 60-second negative cache; a later relevant update/reopen may retry,
without a failure polling loop. Signed/artwork URLs refresh with metadata expiry.
Failed images can retry after a successful refresh. HA-supplied image locations
are validated; the dashboard browser must be able to reach them. No raw entity
IDs, station names, URLs/tokens or exception strings are logged. Explicit cube
module diagnostics expose finite status/counts only.

## Verify no-template operation in DevTools

Open browser DevTools → Network → the Home Assistant WebSocket → Messages. Reload
the dashboard and filter for `media_player/browse_media`. Confirm requests target
the configured player/current coordinator and traverse `favorites` then returned
`favorites_folder` IDs. Inspect responses for the expected FV ID/title/thumbnail.
Do not share authentication messages, signed URLs or private entity/station names;
use sanitized synthetic reproductions for reports. A visible thumbnail alone is
not evidence of its source; recorded browse calls plus a conflicting old-cache
sentinel test prove isolation in automated tests.

## Real HA checklist

- Remove legacy cache option/template; keep/enable native favorites sensor.
- Confirm logos from Browse Media with no template, and normal fallback if denied.
- Verify Radio order/playback and both launcher/promoted center during station
  switch, pause/play, unknown/ambiguous content; volume labels stay clear.
- Test Join/unjoin/follower changes, browser reload, HA restart/reconnect, offline
  recovery and five-minute signed-artwork refresh without floods.
- Check native Sleep, sibling Back/idle, Light Hue/Kelvin/presets and coexistence.

Synthetic unit/browser CI verifies client contracts, not physical Sonos/HA or
all tablet hardware. Real owner beta testing and explicit approval remain required
before stable. The owner reports successful beta.7 real-HA testing; merging and
publication still require separate explicit approval.
