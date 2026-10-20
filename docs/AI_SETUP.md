> **v1.7.0-beta.1 Phase 1:** use the exact current contract in
> [V1_7_PHASE1.md](V1_7_PHASE1.md). Both public components default to 82 px and
> share full-cell rendering. Standalone Control selects `module: light`, `media`,
> `sonos` or `generic`. `logo: false` disables branding, not ordinary slot-0 items.
> Do not generate `visibility`, `slot_mode: priority`, Car or Charger configs for
> this beta. These are later-phase work. This feature beta is not merged into
> `restart/v1.5.1`; do not infer release or merge authorization from this document.

# AI setup specification

This file is written for ChatGPT, Codex and other AI systems that need to create Honeycomb Menu NG configuration for a user who may not know Home Assistant YAML.

Treat it as an implementation contract.

## Goal

Build the smallest working configuration from real Home Assistant entity IDs. Do not invent entity IDs, scripts or helpers.

## Assumptions

- Home Assistant is current.
- `custom:button-card` is installed.
- Honeycomb Menu NG v1.5+ is installed.
- Prefer the persistent Hub unless the user explicitly asks for classic popup Honeycomb.
- Short tap performs primary action; long press opens details.
- Module navigation must preserve locked slot 0 after entering a module.

## Information to collect

Required:
1. Hub name.
2. Hub size if not 82.
3. Bee logo preference: `logo: auto` or `logo: false`.
4. Real entities for each item.

For each Light:
- `light.*` entity
- optional name/icon
- optional numeric preset helpers

For each Sonos:
- `media_player.*` entity
- optional active color
- whether Radio favorites are desired
- whether artwork/logos are desired
- whether Join is desired
- candidate speakers if Join is desired

Never fabricate missing IDs. Ask for them or omit the optional feature.

## Canonical Hub

~~~yaml
type: custom:honeycomb-persistent-hub
name: ROOM NAME
size: 82
logo: auto

items:
  - type: light
    entity: light.REAL_ENTITY
    name: Light

  - type: sonos
    entity: media_player.REAL_ENTITY
    name: Sonos
    active_color: "#00bcd4"
~~~

## Module selection

Use `type: light` for Light.

Use `type: sonos` for Sonos in new configs.

Use:

~~~yaml
type: media
module: media
~~~

for generic/non-Sonos media.

Do not use bare `type: media` in a new config unless compatibility is specifically required; bare media intentionally maps to Sonos behavior.

## Light rules

Minimal:

~~~yaml
- type: light
  entity: light.REAL_ENTITY
~~~

Do not create helpers unless the user wants persistent normal/standard values.

Defaults without helpers:
- brightness = 60%
- Kelvin = 2700 K

Optional:

~~~yaml
presets:
  brightness:
    entity: number.OR_input_number_ENTITY
  kelvin:
    entity: number.OR_input_number_ENTITY
  color:
    hue_entity: number.OR_input_number_ENTITY
    saturation_entity: number.OR_input_number_ENTITY
~~~

Supported writable domains:
- `number.*`
- `input_number.*`

Ranges:
- brightness 0–100
- hue 0–360
- saturation 0–100
- Kelvin appropriate for target light

Helpers may be device-owned values, for example Shelly `number.*` entities. Do not assume they must be Home Assistant-created helpers.

If the Light entity explicitly reports `supported_color_modes: [onoff]`:
- do not add or expect a Light detail level
- short tap toggles the light
- expect `On` / `Off` status instead of brightness percentage

Do not infer on/off-only behavior merely because capability attributes are missing while an entity is unavailable.

## Sonos rules

Minimal:

~~~yaml
- type: sonos
  entity: media_player.REAL_SONOS
  active_color: "#00bcd4"
~~~

Do not generate group-volume scripts. Native group-aware volume is default.

### Radio

If Radio is required:
1. ensure official `sensor.sonos_favorites` is enabled
2. add:

~~~yaml
favorites_sensor: sensor.sonos_favorites
~~~

Artwork is optional.

If artwork is desired:
1. install `examples/sonos-favorites-cache.yaml`
2. replace example reference player with a real Sonos entity
3. add:

~~~yaml
favorites_cache_sensor: sensor.sonos_favorites_cache
~~~

Do not claim the cache is required for playback; it only adds thumbnails.

### Join

If Join is required:
1. collect candidate members
2. install/adapt `examples/sonos-toggle-member.yaml`
3. configure:

~~~yaml
toggle_member_script: script.sonos_ROOM_toggle_member
members:
  - entity: media_player.REAL_MEMBER_1
    name: Room 1
  - entity: media_player.REAL_MEMBER_2
    name: Room 2
~~~

Do not include the coordinator itself in `members`.

## Validation checklist

Verify:
- every entity ID exists
- `custom:button-card` is installed
- Hub renders without errors
- Light short tap toggles
- dimmable Light hold opens detail
- explicit on/off-only Light hold does not open a detail level
- dimmable Light shows brightness while on and `Off` while off
- on/off-only Light shows `On` / `Off`
- Light Color/White expansion does not move slot 0
- helper-backed Light preset tap applies and hold stores
- Sonos short tap play/pauses
- Sonos hold opens detail
- Sonos volume +/- works solo and grouped
- `sensor.sonos_favorites` is enabled before expecting Radio entries
- artwork cache is optional
- Join submenu is only expected with both `members` and `toggle_member_script`
- unavailable entities show gray + `Unavailable`
- Lovelace edit mode does not duplicate base cubes

## Architecture invariants

1. Core owns navigation.
2. Domain modules do not move anchors.
3. Base → module may establish the module center.
4. Nested module levels do not move it.
5. Slot 0 is module center.
6. A module may expand from 7 to 19 cubes without moving slot 0.

For code changes also read [../ARCHITECTURE.md](../ARCHITECTURE.md).
