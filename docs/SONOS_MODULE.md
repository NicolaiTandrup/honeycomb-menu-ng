# Sonos module

**Supported as of v1.7.0** (validated on beta.3; stable publication pending).
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

| Slot | Function |
|---:|---|
| 0 | selected Sonos / live volume |
| 1 | group-aware volume down |
| 2 | play/pause |
| 3 | Join |
| 4 | group-aware volume up |
| 5 | Radio favorites |
| 6 | Browse / more-info |

While playing, the center fills with `active_color` and shows live volume. When not playing, the center is dark with active-color ring.

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

Replace every `media_player.player_a` with one real Sonos player supporting Browse
Media and `sensor.favorites_a` with the enabled favorites entity. Confirm the
resulting cache entity ID in HA; the example uses `sensor.favorites_cache_a`.
Both entities must have a value for refresh. There is no startup trigger: fire the
event after installation or wait for the next trigger.

The cache refreshes:
- on manual `sonos_favorites_refresh` event
- whenever `sensor.favorites_a` changes, including attribute updates
- every 15 minutes as fallback

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

Join is optional. It requires:
1. candidate member players
2. a script accepting a `member` variable and joining/unjoining that player

~~~yaml
- type: sonos
  entity: media_player.player_a
  name: Player A
  toggle_member_script: script.player_a_toggle_member

  members:
    - entity: media_player.player_b
      name: Player B
    - entity: media_player.player_c
      name: Player C
    - entity: media_player.player_d
      name: Player D
~~~

Do not include the coordinator in candidates. At most 12 candidates are displayed.
Without both script and members, Join falls back to more-info. Browse also opens
HA more-info. For `script: !include scripts.yaml`, copy only the script key and
below, without the top-level `script:` wrapper. Validate HA config and reload scripts.

Honeycomb highlights candidates already present in the selected player's `group_members`.

Copy the standard join/unjoin script from:
[examples/sonos-toggle-member.yaml](../examples/sonos-toggle-member.yaml)

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
