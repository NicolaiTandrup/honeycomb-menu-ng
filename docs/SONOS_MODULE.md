# Sonos module

**Current development: v1.7.1-beta.7** (cumulative; real HA approval required).
Stable v1.7.0 has the historical slot arrangement described below.
See [the complete card](../examples/v1.7/sonos.yaml) and the
[external HA setup contract](AI_SETUP.md#external-home-assistant-prerequisites).

Use the Sonos module explicitly for new configurations:

~~~yaml
- type: sonos
  entity: media_player.player_a
  name: Player A
  icon: mdi:speaker
  active_color: "#00bcd4"
~~~

Legacy `type: media` still resolves to Sonos unless `module: media` is specified.

## Default detail layout

Issue #90 development patch (target v1.7.1, pending owner review) moves the Radio,
Sleep and volume launchers. Published v1.7.0 used volume down/up at 1/4 and
Radio/Browse at 5/6. The Radio outer submenu is unchanged.

| Slot | Function |
|---:|---|
| 0 | selected Sonos / live volume |
| 1 | Radio favorites |
| 2 | play/pause |
| 3 | Join |
| 4 | Sleep Timer — native Sonos device actions |
| 5 | group-aware volume down |
| 6 | group-aware volume up |

While playing, a recognized station uses its accent and cached logo; other content uses `active_color` as a fallback. Paused/stopped center stays neutral. Live volume remains visible.

If unavailable, the launcher becomes gray and shows `Unavailable`.

## Native group volume

New configurations do not need volume scripts.

Honeycomb reads the selected player's `group_members`:
- no group → selected entity only
- grouped → current group members

Optional legacy overrides remain:

~~~yaml
group_volume_down_script: script.player_a_volume_down
group_volume_up_script: script.player_a_volume_up
~~~

Only use them for custom behavior.

## Radio favorites

Home Assistant's official Sonos integration exposes a favorites sensor containing names and `media_content_id` values.

The official favorites entity is normally disabled by default. Enable it in the
Sonos integration and collect its actual ID. `sensor.favorites_a` below is synthetic;
the compatibility default is `sensor.sonos_favorites`.

Minimal:

~~~yaml
- type: sonos
  entity: media_player.player_a
  favorites_sensor: sensor.favorites_a
~~~

The module reads up to 12 favorites into slots 7–18.

When selected, Honeycomb calls `media_player.play_media` using:
- `media_content_type: favorite_item_id`
- the key from `sensor.favorites_a.attributes.items` as `media_content_id`

## Optional favorites artwork cache

The official favorites sensor contains names/IDs but not the thumbnail metadata Honeycomb needs for station logos.

NG therefore treats artwork as an optional enrichment layer:
- `sensor.favorites_a` = canonical names + IDs
- `sensor.favorites_cache_a` = optional browse-media metadata + thumbnails

The Radio menu works without the cache and falls back to radio icon + station name.

If a matching cache item has a thumbnail:
- the thumbnail becomes cube artwork
- fallback radio icon is hidden
- station text is hidden

### Install the cache

Copy [examples/sonos-favorites-cache.yaml](../examples/sonos-favorites-cache.yaml).

If pasting directly into `configuration.yaml`, keep the top-level `template:` key.

If you already use:

~~~yaml
template: !include templates.yaml
~~~

copy only the list item beginning with `- triggers:` into `templates.yaml`.

Set the ordered `cache_players` list once, using Sonos players sharing the same
favorites library, and set `sensor.favorites_a` to the enabled favorites entity.
Each refresh chooses the first available configured player; no repeated player-ID
replacement is needed. Confirm the resulting `sensor.favorites_cache_a` ID.
The recipe refreshes on HA start, manual `sonos_favorites_refresh`, favorite
state/attribute changes, and every 15 minutes. With no available source or base
sensor it skips refresh rather than publishing an empty successful cache.
`source_player` and `cache_version` diagnose the chosen source/schema. Existing
working templates and cache entity references remain supported unchanged.

The base sensor must expose `attributes.items` as an ID→title **map**. The cache
exposes `attributes.items` as a **list** of up to 12 dictionaries, matched by exact
`media_content_id`. Cache alone cannot populate Radio or provide playback IDs.
Reopen Radio after favorite-list/count changes; presentation/artwork updates live.
Thumbnail URLs come from HA and must be accessible to the dashboard browser.

The cache dictionaries contain:
- `title`
- `media_content_id`
- `media_content_type`
- `thumbnail`

Hub item:

~~~yaml
- type: sonos
  entity: media_player.player_a
  favorites_sensor: sensor.favorites_a
  favorites_cache_sensor: sensor.favorites_cache_a
~~~

## Join / grouping

Without `members`, Join discovers only registry entries whose platform is
`sonos`, using current HA frontend registry metadata or the read-only
`config/entity_registry/list_for_display` WebSocket command. It never identifies
Sonos by an entity name, area or `media_player` domain alone. Discovery runs on
opening, not by polling. Reopen to refresh candidates after registry changes.

Native `media_player.join` / `media_player.unjoin` requires the GROUPING feature
on both players and both services in HA. Join targets the coordinator with
`group_members: [candidate]`; unjoin targets only the candidate. A selected follower
uses its reciprocally verified leader for native grouping. Unknown membership,
unavailable players and candidates grouped elsewhere remain read-only; ungroup
other rooms in HA first. No optimistic membership changes are made.

An explicit `members` list overrides automatic candidates (including an empty
list). Order and names are preserved; selected player/leader/duplicates are
excluded. Up to twelve candidates fit the existing outer ring. Explicitly listed
players are a user declaration that they belong to the intended Sonos setup.
An optional `toggle_member_script` remains authoritative and receives only
`{member: candidate}`; if configured but invalid/unavailable, it fails visibly
rather than silently falling back. Its selected-coordinator/follower restrictions
are preserved. See [the optional script recipe](../examples/sonos-toggle-member.yaml).

Empty states distinguish `Metadata unavailable`, `No other Sonos`, and invalid
manual entries (`Check members`). Missing native features/services show
`Grouping unsupported` / `Grouping unavailable`; configured scripts show their
existing setup/error states. Request failures produce a notification; actual HA
`group_members` controls live membership labels/colors. The ring stays open for
repeated selections and center/back returns to the module.

## Sleep Timer / optional Browse compatibility

Published beta.6 introduced native slot-4 **Sleep**, retained by beta.7, opening 15/30/45/60/90-minute
and Cancel/OFF choices. [Native actions and group/restart rules](SONOS_SLEEP_TIMER.md):
no helper, script, automation or package setup. Official `sonos.set_sleep_timer`
and `sonos.clear_sleep_timer` target the live coordinator. The speaker owns the
countdown. “Est.” labels are local estimates; reload/reconnect shows unknown.
An HA restart should not stop a powered speaker's timer; real hardware verification
is required. Group changes invalidate estimates and follow native Sonos semantics,
without an extra Honeycomb cancellation or pause.

HA Browse Media APIs remain available to custom configurations. The old default
`/media-browser/<player>` navigation is removed from Sonos slot 4. If desired,
use an ordinary generic Hub cube with an explicit existing `navigate` action to
`/media-browser/media_player.player_a`; no new Browse option or native hierarchy
is introduced. No Spotify API/authentication, browser-only timer or backend
favorites helper is added.

## Full example

~~~yaml
- type: sonos
  entity: media_player.player_a
  name: Player A
  icon: mdi:speaker
  active_color: "#00bcd4"

  favorites_sensor: sensor.favorites_a
  favorites_cache_sensor: sensor.favorites_cache_a

  toggle_member_script: script.player_a_toggle_member

  members:
    - entity: media_player.player_b
      name: Player B
    - entity: media_player.player_c
      name: Player C
    - entity: media_player.player_d
      name: Player D
~~~

## Why the artwork cache stays in Home Assistant

The dashboard module should not own a background Sonos media-browsing lifecycle. Home Assistant already provides the canonical favorites sensor, while Browse Media returns richer metadata on demand.

Keeping the small trigger-based template cache in Home Assistant:
- survives dashboard reloads
- refreshes even when no Honeycomb menu is open
- avoids polling Sonos from every browser/tablet
- keeps the frontend module deterministic

v1.7 therefore documents and ships the cache recipe instead of moving that background job into browser JavaScript.

Official references:
- https://www.home-assistant.io/integrations/sonos/
- https://www.home-assistant.io/integrations/media_player/

## v1.7.1 beta: station accents and launcher artwork

Radio's outer slots 7–18 now add an inner accent ring from the existing Light
hue wheel. Favorite IDs determine colors, independently of list order. Up to
12 configured IDs receive distinct colors; changing the set can reassign a
collision. Larger lists use identity hashing and may share colors. Ordering,
playback actions, station thumbnails, cache recipe and navigation stay unchanged.

The ordinary Sonos launcher and selected main-menu center use a recognized
favorite's cached logo, inner accent and playing center fill. Volume remains
visible below the logo. Paused/stopped players use `off.center_color` (neutral
`#202224` by default), even with a configured playing `colors.center`. A logo/ring
is retained only while current HA metadata still identifies the same favorite;
there is no title guessing or persistent optimistic last-station cache.
Unavailable players use `colors.unavailable` (gray by default).

Matching first uses an exact favorite ID or a unique cached `uri`/`playback_uri`.
For Sonos radio transports (`x-sonosapi-hls:`, `x-sonosapi-radio:`,
`x-sonosapi-stream:` or `x-rincon-mp3radio:`), beta.4
accepts `media_channel` matching a unique favorite-map name **or** that favorite's
cache `title`, with cache type `favorite_item_id`. These two HA sources need not
use identical display labels. Normalize NFC, whitespace and letter case only;
retain punctuation and diacritics. Additionally, parse the explicit
`Station Alpha · programme text` / `Station Alpha • programme text` formats:
require a spaced middle dot/bullet, nonempty suffix, and station prefix identifying
exactly one favorite corroborated by both map and typed cache title. Reject
conflicts with another full channel/favorite label. Do not strip arbitrary
broadcast suffixes. The bullet form is used by
[HA Sonos radio-show metadata](https://github.com/home-assistant/core/blob/487f8ae6a1ea60f770fb4a1aaa37c796ecb47fcf/homeassistant/components/sonos/media.py#L170);
the middle-dot form reproduces the owner's sanitized HA tuple. If map and cache labels point to
conflicting IDs, fail closed. Never match `media_title`, substrings, arbitrary
HTTP track channels, guessed regional labels or guessed broadcast suffixes.
Duplicate IDs/URIs and missing/invalid thumbnails also fall back safely.
A reciprocal group uses its coordinator's playback identity. Existing four-field
cache records, sensors, favorite IDs and Radio actions remain supported unchanged.

Recognized artwork also replaces a Sonos navigation center's back-arrow icon.
The existing center tap still performs Back; no navigation handler changes.
Unknown stations retain the usual navigation icon. Both a parent Hub ring
launcher and promoted submenu center react live to playback/cache changes.

Tests reproduce the owner's sanitized tuple: FV favorite ID, distinct Sonos
stream URI, station name in the map/cache, and live channel containing the name
plus programme text. Unknown formats still fall back. No selection/stream mapping
is learned from service completion: a successful command alone does not prove
which later stream update belongs to it, especially during grouped playback.
There is no URI-session stability assumption or persisted learned mapping.
Real hardware/HACS behavior remains the owner's beta test gate before stable.

### Station recognition diagnostics

On desktop, inspect the cube's `.interaction-surface` in browser developer tools,
then run this explicitly in the console:

```javascript
$0.getRootNode().host.getPresentationDiagnostics()
```

There is no automatic logging, polling, storage or additional HA request. The
returned object contains only bounded state/category strings, presence flags,
counts and presentation/override flags. It never includes entity IDs, favorite
names/IDs, stream/artwork URLs, cache payloads or tokens. Call it on the parent
launcher and submenu center separately. Other modules return `null`.

- `match_stage`: `identifier`, `radio_channel`, `radio_station_programme`, or `none`.
- `map_channel_candidates` / `cache_channel_candidates`: exact-label counts.
  `programme_channel` and `programme_map_candidates` / `programme_cache_candidates`
  expose structured-format parsing and corroboration counts.
- `reason`: `recognized`, `channel_or_mapping_missing`, `channel_ambiguous`,
  `mapping_ambiguous`, `identifier_not_mapped`, `playback_id_missing`,
  `favorites_or_cache_missing`, `favorites_or_cache_unavailable`,
  `group_not_verified`, `player_unavailable`, or `artwork_missing_or_invalid`.
- `artwork_load_failed` distinguishes a valid-looking URL from failed browser
  loading. `presentation` reports station playing/inactive or standard/override.
- `explicit_center_color` / `explicit_inner_color` identify explicit color choices.

When no exact correspondence exists, supply only a sanitized failing tuple:
`media_channel`, matching favorite-map name, cache title/type, whether optional
`uri`/`playback_uri` exists, and whether stream identity changes on station switch.
Use consistent synthetic replacements preserving the differing spelling/suffix
structure. Never share real URLs, stream query parameters or access tokens.
A verified optional cache `playback_uri` must equal the actual stream identifier;
never fabricate it from an FV ID. Without reliable metadata, stop and collect
that evidence before claiming that unknown format is supported.

The reusable cache exports optional `uri` when Browse Media actually supplies it;
it does not fabricate stream mappings or promise HA always supplies one. Original
four-field cache records remain valid. Browser-native cache retrieval was reviewed
and deliberately left external: it cannot refresh while dashboards are closed,
persist across clients or guarantee backend media availability. No helper
integration (#93) or per-launcher browsing/polling is introduced.

Precedence:

1. Explicit `colors.inner_border`/`colors.center` win while playing, then the recognized
   station accent, then legacy `active_color` as a fallback, then Sonos defaults.
2. Pause/stop overrides the playing center with `off.center_color`; choose a neutral
   gray shade for this setting. Unavailable state overrides station context.
3. Custom `custom_fields` content or a `styles.card` background image wins over automatic artwork.
   `show_icon: false` disables automatic logo/icon display. Nested center/back
   arrows remain visible. Other explicit styles, labels and actions remain intact.
4. Missing/invalid/unreachable artwork restores the normal Sonos icon/colors.
   HTTP(S), HA-relative paths and base64 PNG/JPEG/GIF/WebP images are supported.
   A failed URL retries when the cache metadata changes; no polling is added.

The beta is not stable approval. Test actual Sonos playback/URI metadata and image
accessibility in HA before approving merge or a stable v1.7.1 release.

HA implementation reference reviewed for matching: [current track URI exposed as
media_content_id](https://github.com/home-assistant/core/blob/e6fd4fe6cbd4d3e7d6923ef9a73d9c5f45153592/homeassistant/components/sonos/media_player.py#L273).
This differs from the favorite-item ID used by `play_media`. Beta.2's restricted
radio-channel/cache/favorite correspondence is separately tested; arbitrary track
or channel text is not used as an identifier.

Frontend interfaces reviewed at commit `a321b07bba901b64790e654d7539ee2bfe20b6d6`:
[registry](https://github.com/home-assistant/frontend/blob/a321b07bba901b64790e654d7539ee2bfe20b6d6/src/data/entity/entity_registry.ts),
[media browser route](https://github.com/home-assistant/frontend/blob/a321b07bba901b64790e654d7539ee2bfe20b6d6/src/panels/media-browser/ha-panel-media-browser.ts).
Native feature constants reviewed in HA core `1d6681b0a21e92ca776e9bffcd1dd74daffe5391`.
Actual HA/Sonos installation remains the owner's beta verification gate.

## v1.7.1-beta.5 artwork and Join navigation

Station artwork is sized inside the clipped cube fill, independently of the
82 px cell. Playing artwork uses a compact 62% usable-width box with reserved
volume/name space; default paused artwork expands to 80% while fill stays neutral
and inner border retains its station hue. Explicit labels still reserve space.
Both the Sonos module launcher in the Hub menu and promoted center cube are tested
with 0%, 2%, 42%, 100%, station switches and missing/unknown artwork.

Join's inherited inner control cannot push another identical Join view. Discovery
is single-flight per menu revision, times out safely, and cannot reopen a view
after Back/close/navigation; a fresh request can supersede a stale one. The center
has an accessible Back label and pops exactly one level. Native discovery/grouping
and configured member/script overrides remain unchanged.


## beta.7 visual polish — issue #90

Function cubes inherit the ordinary Light function icon/text hierarchy, rather
than forcing its separate preset grid onto every Sonos action. No slot or handler
changes. Playing artwork moves down slightly while clearing the volume label;
paused/idle artwork stays at 62% of usable cube fill with aspect ratio preserved,
visible neutral gray fill and the recognized station's inner border color. This
supersedes beta.5's enlarged paused artwork. Radio favorite order, cache, artwork
sizing and playback remain unchanged. Native Sleep and Join Back stay as in beta.6.


## beta.8 sibling navigation and idle-close

Based on exact published beta.7 (`737a13c8f1a1020db18e14325a40240708dc2706`).
Radio, Join and Sleep are sibling submenus, including a repeated selection of the
same function. Join → Radio → Sleep occupies one submenu level; **Back once returns
to Sonos main**, then another Back returns to the Hub. Switching does not replay
any favorite, change grouping or send a Sleep command. Real child menus still add
one history level; recursive Light Hue/Kelvin palettes retain exact Back snapshots.

All three inherit the Sonos main menu's `idle_timeout`, **8000 milliseconds by
default**. The existing `persistent.menu.idle_timeout` override can set a positive
custom duration, or deliberately use `0` to disable idle-close. There is no new
navigation YAML option. A persistent Hub returns to its base on idle; a standalone
Control dismisses the overlay and restores its launcher. Idle-close never stops
playback or cancels a device-owned Sleep timer.

Actual pointer/touch actions, keyboard actions and Back reset the deadline. Passive
HA playback/group changes, asynchronous room discovery and configuration refreshes
do not. Discovery has a bounded wait and uses the latest HA state, but completing
it cannot extend the last interaction's deadline or resurrect a submenu after
switching, Back, idle-close or disposal. A stale request cannot suppress a fresh
request after navigation. No geometry, station matching, favorites/cache, native
Sonos service, artwork or layout changes are part of this navigation fix.

## v1.8.0-beta.4: optional no-template favorites

Set `favorites_browse: true` on a Sonos item/Control to supplement missing cache
metadata through read-only HA Browse Media. The official favorites sensor remains
required; valid existing cache fields win. This option defaults off; existing
templates/configuration stay supported. No backend/helper/automation is installed.
See [complete configuration, matching limits, lifecycle and tests](SONOS_NATIVE_FAVORITES.md).
