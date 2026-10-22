# Sonos module

**v1.8.0 candidate (introduced in beta.4):** Sonos uses native HA Browse Media for favorite artwork by default.
The former template cache and `favorites_cache_sensor` option are removed.
[Migration, complete examples, limits and verification](SONOS_NATIVE_FAVORITES.md).
The sole owner/user has already migrated and selected the v1.8.0 release track.
Stable v1.7.1 and every previous release remain unchanged during preparation.

## Default detail layout

| Slot | Function |
|---:|---|
| 0 | selected Sonos / live volume / Back |
| 1 | Radio favorites |
| 2 | Play/Pause |
| 3 | Join |
| 4 | native device Sleep Timer |
| 5 | group-aware Volume Down |
| 6 | group-aware Volume Up |

The shared Light-based renderer keeps 82px geometry, aligned icons/labels,
independent borders and clipped artwork. Unavailable is gray. Playing recognized
stations supply logo/accent; unknown content uses normal Sonos `active_color`.
Paused/stopped fill remains neutral, with compact known artwork when reliable.

## Native group volume

No scripts are needed. Current `group_members` determines volume targets; solo
uses the selected player. `group_volume_down_script` / `group_volume_up_script`
remain optional explicit custom overrides, not installation prerequisites.

## Radio favorites

Enable HA's official native favorites sensor and confirm its actual ID. The
compatibility default for **native IDs/order** remains `sensor.sonos_favorites`.
Its `attributes.items` map supplies exact favorite IDs and order for up to twelve
outer choices, slots 7–18. Tap calls `media_player.play_media` with that ID and
`media_content_type: favorite_item_id`. Missing metadata never changes playback.
Browse Media only enriches this map; no favorites sensor/empty map means no browse.

```yaml
- type: sonos
  entity: media_player.player_a
  favorites_sensor: sensor.favorites_a
```

No special artwork YAML is needed. Remove old template-cache configuration;
[follow the migration](SONOS_NATIVE_FAVORITES.md#migrate-before-upgrading).
Read-only browsing uses bounded per-tab shared memory, deduplication, timeout and
reconnect/group/disposal guards. API/permission/image failure falls back to radio
icon/title or normal Sonos presentation, never a template cache.

## Join / grouping

Without `members`, discover only actual Sonos registry-platform entries through
HA frontend metadata or read-only `config/entity_registry/list_for_display` on
opening. No name/area/domain guessing or polling. Explicit `members`, including
`[]`, overrides discovery. Up to twelve choices retain stable order while open.

Native `media_player.join` / `unjoin` requires GROUPING support and HA services.
Join targets the coordinator with `group_members: [candidate]`; unjoin targets
only the candidate. A selected follower uses its reciprocally verified leader.
Unknown membership, unavailable players and rooms grouped elsewhere are read-only.
Actual HA membership controls visuals; failures notify without optimistic grouping.

An explicit `toggle_member_script` remains authoritative with `{member: candidate}`
and its existing coordinator restrictions. The optional [script recipe](../examples/sonos-toggle-member.yaml)
is still supported; it is unrelated to the removed favorites cache. Empty/error
states distinguish unavailable registry metadata, no other rooms, invalid manual
members, unsupported native grouping and unavailable scripts/services.

## Sleep Timer / optional Browse compatibility

Slot 4 opens 15/30/45/60/90 minutes and Cancel/OFF using official
`sonos.set_sleep_timer` / `sonos.clear_sleep_timer` on the current verified group
coordinator. The device owns expiry; no HA helper/script/automation or browser-only
timer. [Group/restart and estimate rules](SONOS_SLEEP_TIMER.md): “Est.” is client
estimation, not device readback; reload/reconnect shows unknown. A powered device
should retain its timer over HA restart; physical validation is required.

Custom navigation to `/media-browser/media_player.player_a` remains possible with
an ordinary existing generic `navigate` action. It is not Sonos slot 4.

## Full example

```yaml
- type: sonos
  entity: media_player.player_a
  name: Player A
  active_color: "#00bcd4"
  favorites_sensor: sensor.favorites_a
  members:
    - entity: media_player.player_b
      name: Player B
```

Omit `members` for automatic discovery. [Complete card](../examples/v1.7/sonos.yaml)
and [external prerequisites](AI_SETUP.md#external-home-assistant-prerequisites).

## v1.7.1 beta: station accents and launcher artwork

Favorite IDs choose deterministic Light hue-wheel accents, independent of list
order; up to twelve IDs get distinct colors, larger sets can share hues. Reliable
native metadata updates the original Hub launcher and promoted center live.
Exact favorite ID or unique corroborated radio channel is required. Spaced
`·`/`•` programme suffixes are supported; no fuzzy title or stream-URI inference.
The previous explicit URI/cache-alias matching path is removed with the cache.

Styling precedence remains: explicit `colors.center` / `colors.inner_border` and
foreground choices win; custom image/content or `show_icon: false` suppress station
artwork. Inactive fills stay solid. Existing shared bounded artwork layout preserves
aspect ratio/text spacing, compact paused logos and unobstructed volume labels.
Failed images restore standard presentation and retry after metadata refresh.

## Station recognition diagnostics

Call the cube's `getPresentationDiagnostics()` in DevTools (parent or promoted center).
It returns finite reason/status/counts: native `browse` status, player/group flags,
`map_channel_candidates` / `metadata_channel_candidates`, programme candidate
counts, `match_stage`, artwork validity/failure and explicit styling flags. No
entity IDs, station names, raw URLs/tokens or payloads are logged.

For a sanitized report supply live `media_content_id` **scheme only**,
`media_channel` structure, native map title/ID shape, returned Browse title/type,
request success and whether grouping is involved. Never post tokens/full streams.
Missing/ambiguous identity means normal fallback, not a claimed match.

## Navigation and idle

Radio, Join and Sleep are sibling submenus. Back once returns to Sonos main. Switching replaces the sibling; one Back
returns to Sonos main; repeats do not duplicate stack entries. Genuine Light
Hue/Kelvin child zooms retain meaningful nested history. These Sonos siblings
inherit configurable idle-close (8000 ms default, explicit zero disables it).
Hub `persistent.menu.idle_timeout` and standalone `menu.idle_timeout` may override it.
Only real interaction resets idle; passive HA updates, metadata refresh and asynchronous room discovery do not. Late results cannot create ghost menus or stuck overlays.
