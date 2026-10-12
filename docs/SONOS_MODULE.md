# Sonos module

Use the Sonos module explicitly for new configurations:

~~~yaml
- type: sonos
  entity: media_player.living_room
  name: Sonos
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
group_volume_down_script: script.custom_sonos_volume_down
group_volume_up_script: script.custom_sonos_volume_up
~~~

Only use them for custom behavior.

## Radio favorites

Home Assistant's official Sonos integration exposes a favorites sensor containing names and `media_content_id` values.

Important: `sensor.sonos_favorites` is **disabled by default**. Enable it from the Sonos integration entity list before using Radio.

Minimal:

~~~yaml
- type: sonos
  entity: media_player.living_room
  favorites_sensor: sensor.sonos_favorites
~~~

The module reads up to 12 favorites into slots 7–18.

When selected, Honeycomb calls `media_player.play_media` using:
- `media_content_type: favorite_item_id`
- the key from `sensor.sonos_favorites.attributes.items` as `media_content_id`

## Optional favorites artwork cache

The official favorites sensor contains names/IDs but not the thumbnail metadata Honeycomb needs for station logos.

NG therefore treats artwork as an optional enrichment layer:
- `sensor.sonos_favorites` = canonical names + IDs
- `sensor.sonos_favorites_cache` = optional browse-media metadata + thumbnails

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

Replace every `media_player.living_room` with one Sonos speaker that supports Browse Media.

The cache refreshes:
- on manual `sonos_favorites_refresh` event
- whenever `sensor.sonos_favorites` changes, including attribute updates
- every 15 minutes as fallback

It stores up to 12 plain dictionaries:
- `title`
- `media_content_id`
- `media_content_type`
- `thumbnail`

Hub item:

~~~yaml
- type: sonos
  entity: media_player.living_room
  favorites_sensor: sensor.sonos_favorites
  favorites_cache_sensor: sensor.sonos_favorites_cache
~~~

## Join / grouping

Join is optional. It requires:
1. candidate member players
2. a script accepting a `member` variable and joining/unjoining that player

~~~yaml
- type: sonos
  entity: media_player.living_room
  name: Sonos
  toggle_member_script: script.sonos_living_room_toggle_member

  members:
    - entity: media_player.kitchen
      name: Kitchen
    - entity: media_player.bathroom
      name: Bathroom
    - entity: media_player.office
      name: Office
~~~

Honeycomb highlights candidates already present in the selected player's `group_members`.

Copy the standard join/unjoin script from:
[examples/sonos-toggle-member.yaml](../examples/sonos-toggle-member.yaml)

## Full example

~~~yaml
- type: sonos
  entity: media_player.living_room
  name: Sonos
  icon: mdi:speaker
  active_color: "#00bcd4"

  favorites_sensor: sensor.sonos_favorites
  favorites_cache_sensor: sensor.sonos_favorites_cache

  toggle_member_script: script.sonos_living_room_toggle_member

  members:
    - entity: media_player.kitchen
      name: Kitchen
    - entity: media_player.bathroom
      name: Bathroom
    - entity: media_player.office
      name: Office
~~~

## Why the artwork cache stays in Home Assistant

The dashboard module should not own a background Sonos media-browsing lifecycle. Home Assistant already provides the canonical favorites sensor, while Browse Media returns richer metadata on demand.

Keeping the small trigger-based template cache in Home Assistant:
- survives dashboard reloads
- refreshes even when no Honeycomb menu is open
- avoids polling Sonos from every browser/tablet
- keeps the frontend module deterministic

v1.5 therefore documents and ships the cache recipe instead of moving that background job into browser JavaScript.

Official references:
- https://www.home-assistant.io/integrations/sonos/
- https://www.home-assistant.io/actions/media_player.join/
- https://www.home-assistant.io/actions/media_player.unjoin/
- https://www.home-assistant.io/actions/media_player.browse_media/
