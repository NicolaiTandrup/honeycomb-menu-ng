# Sonos module

**Supported as of v1.7.0** Stable (validated on beta.3 and the stable candidate).
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
Browse and volume launchers. Published v1.7.0 used volume down/up at 1/4 and
Radio/Browse at 5/6. The Radio outer submenu is unchanged.

| Slot | Function |
|---:|---|
| 0 | selected Sonos / live volume |
| 1 | Radio favorites |
| 2 | play/pause |
| 3 | Join |
| 4 | Home Assistant Browse Media |
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

## Browse Media

Slot 4 navigates to HA's actual `/media-browser/media_player.player_a` panel for
the selected player, then closes the Honeycomb menu. It does not open more-info.
This is the supported media-browser route, including the player's sources such
as Favorites and Plex when HA exposes them. HA's internal lazy-loaded browse
dialog has no stable custom-card import API; Honeycomb does not call private
frontend methods or invent dialog-loading events. Use browser/HA back to return.
The Media panel and player browsing capability must be available in HA.

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
`x-sonosapi-stream:` or `x-rincon-mp3radio:`), beta.2 also accepts a strictly unique
exact correspondence between `media_channel`, the canonical favorite name, and
that favorite's cache `title` with `media_content_type: favorite_item_id`.
Whitespace/NFC normalization is allowed; substrings, case guesses, track titles
and arbitrary HTTP track channels never qualify. Duplicate names/IDs/URIs or a
missing/invalid thumbnail fail safely. A reciprocal group uses its coordinator's
playback identity. This repairs FV-ID versus stream-URI data without replacing
working playback IDs or requiring existing cache sensors to be reconfigured.

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
