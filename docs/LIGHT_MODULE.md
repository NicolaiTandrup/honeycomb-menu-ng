# Light module

The Light module is selected with:

~~~yaml
type: light
entity: light.example
~~~

It is designed for Home Assistant `light.*` entities, including Philips Hue lights exposed through Home Assistant.

## Default detail layout

| Slot | Function |
|---:|---|
| 0 | selected Light / live state |
| 1 | 100% |
| 2 | normal brightness preset |
| 3 | Color or White palette |
| 4 | standard color/Kelvin |
| 5 | -5% |
| 6 | +5% |

The selected Light is promoted into slot 0 when the module opens. Nested Light menus stay anchored to that exact physical center.

## Minimal configuration

~~~yaml
- type: light
  entity: light.living_room
  name: Living room
  icon: mdi:lightbulb
~~~

No helper entities are required.

Without helpers:
- normal brightness defaults to 60%
- standard white defaults to 2700 K
- fallback controls are apply-only

Override fallback values if desired:

~~~yaml
- type: light
  entity: light.living_room
  presets:
    brightness:
      default: 70
    kelvin:
      default: 3000
~~~

## Preset helper contract

Honeycomb can read and write preset values from numeric Home Assistant entities.

Supported writable helper domains in v1.5:
- `number.*`
- `input_number.*`

The entity state must be numeric.

### Brightness

Expected range: 0–100.

~~~yaml
presets:
  brightness:
    entity: number.wall_switch_normal_brightness
~~~

Tap applies the stored value. Hold stores the light's current brightness.

### Kelvin

~~~yaml
presets:
  kelvin:
    entity: number.wall_switch_standard_kelvin
~~~

Tap applies stored Kelvin. Hold stores current `color_temp_kelvin`.

### Hue / saturation

Expected:
- Hue: 0–360
- Saturation: 0–100

~~~yaml
presets:
  color:
    hue_entity: number.wall_switch_standard_hue
    saturation_entity: number.wall_switch_standard_saturation
~~~

Tap applies stored HS color. Hold stores current `hs_color`.

## Where preset values can live

The values are ordinary Home Assistant entities. They do not have to be created by Honeycomb.

### Device-owned values, for example Shelly

A Shelly relay/script can expose writable `number.*` entities:

~~~yaml
presets:
  brightness:
    entity: number.shelly_wall_normal_brightness
  kelvin:
    entity: number.shelly_wall_standard_kelvin
  color:
    hue_entity: number.shelly_wall_standard_hue
    saturation_entity: number.shelly_wall_standard_saturation
~~~

This is useful when a physical wall switch also uses the same normal brightness/color values. Honeycomb and the Shelly share one source of truth.

### Home Assistant helpers

You can also create `input_number` helpers:

~~~yaml
input_number:
  living_room_normal_brightness:
    name: Living room normal brightness
    min: 1
    max: 100
    step: 1
    initial: 60

  living_room_standard_kelvin:
    name: Living room standard Kelvin
    min: 2000
    max: 6500
    step: 50
    initial: 2700

  living_room_standard_hue:
    name: Living room standard hue
    min: 0
    max: 360
    step: 1
    initial: 30

  living_room_standard_saturation:
    name: Living room standard saturation
    min: 0
    max: 100
    step: 1
    initial: 80
~~~

Then reference those `input_number.*` entities from Honeycomb.

## Capability-aware Color / White

The Light module checks `supported_color_modes`.

If the light supports `xy`, `hs`, `rgb`, `rgbw` or `rgbww`:
- slot 3 is **Color**
- opening it adds 12 hard-positioned outer-ring colors

If the light is color-temperature-only:
- slot 3 is **White**
- opening it adds 12 Kelvin steps between the light's own minimum/maximum temperature attributes

If the light supports neither, the palette control becomes a non-destructive Light placeholder.

## Standard preset selection

Slot 4 uses `preset-standard`.

Resolution order:
1. color-capable light + Hue/Saturation helpers → stored HS color
2. temperature-capable light + Kelvin helper → stored Kelvin
3. otherwise → fallback Kelvin, default 2700 K

## Live presentation

The persistent Light launcher:
- uses neutral dark appearance while off
- uses live RGB/HS/temperature-derived color while on
- shows brightness while on
- updates while menus remain open
- shows gray + `Unavailable` if the entity disappears

## Full example

~~~yaml
type: custom:honeycomb-persistent-hub
name: Living room
size: 82
logo: auto

items:
  - type: light
    entity: light.living_room
    name: Living room
    icon: mdi:lightbulb
    presets:
      brightness:
        entity: number.wall_switch_normal_brightness
      kelvin:
        entity: number.wall_switch_standard_kelvin
      color:
        hue_entity: number.wall_switch_standard_hue
        saturation_entity: number.wall_switch_standard_saturation
~~~

See [examples/light-presets.yaml](../examples/light-presets.yaml).
