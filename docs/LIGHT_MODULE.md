# Light module

**Supported as of v1.7.0** Stable (validated on beta.3 and the stable candidate).
For complete tested cards and setup decisions see [AI_SETUP.md](AI_SETUP.md).

The Light module is selected with:

~~~yaml
type: light
entity: light.zone_a
~~~

It is designed for Home Assistant `light.*` entities, including color, temperature-only, brightness-only and on/off-only lights.

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
  entity: light.zone_a
  name: Light A
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
  entity: light.zone_a
  presets:
    brightness:
      default: 70
    kelvin:
      default: 3000
~~~

## Preset helper contract

Honeycomb can read and write preset values from numeric Home Assistant entities.

Supported writable helper domains in v1.7:
- `number.*`
- `input_number.*`

The entity state must be numeric.

### Brightness

Expected range: 0–100 **percent**. HA's Light `brightness` attribute is 0–255;
Honeycomb converts it to percent when storing. Kelvin must fit the target Light.

~~~yaml
presets:
  brightness:
    entity: number.relay_a_brightness
~~~

Tap applies the stored value. Hold stores the light's current brightness.

### Kelvin

~~~yaml
presets:
  kelvin:
    entity: number.relay_a_kelvin
~~~

Tap applies stored Kelvin. Hold stores current `color_temp_kelvin`.

### Hue / saturation

Expected:
- Hue: 0–360
- Saturation: 0–100

~~~yaml
presets:
  color:
    hue_entity: number.relay_a_hue
    saturation_entity: number.relay_a_saturation
~~~

Tap applies stored HS color. Hold stores current `hs_color`.

## Where preset values can live

The values are ordinary Home Assistant entities. They do not have to be created by Honeycomb.

### Values on another device or integration

A separate relay/device or integration may expose writable `number.*` entities:

~~~yaml
presets:
  brightness:
    entity: number.relay_a_brightness
  kelvin:
    entity: number.relay_a_kelvin
  color:
    hue_entity: number.relay_a_hue
    saturation_entity: number.relay_a_saturation
~~~

This is useful when a physical wall switch also uses the same normal brightness/color values. The physical switch and Honeycomb can share those values, independently of the Light integration.

### Home Assistant helpers

You can also create `input_number` helpers:

~~~yaml
input_number:
  preset_a_normal_brightness:
    name: Light A normal brightness
    min: 0
    max: 100
    step: 1
    initial: 60

  preset_a_standard_kelvin:
    name: Light A standard Kelvin
    min: 2000
    max: 6500
    step: 50
    initial: 2700

  preset_a_standard_hue:
    name: Light A standard hue
    min: 0
    max: 360
    step: 1
    initial: 30

  preset_a_standard_saturation:
    name: Light A standard saturation
    min: 0
    max: 100
    step: 1
    initial: 80
~~~

Then reference those `input_number.*` entities from Honeycomb. These are external
HA helpers, not dashboard configuration; run HA configuration validation and reload
helpers as appropriate. The sample Kelvin bounds must match your Light capabilities.

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

## On/off-only lights

Home Assistant lights that explicitly report only:

~~~yaml
supported_color_modes:
  - onoff
~~~

are treated as simple switches.

For those lights:
- short tap still toggles the entity
- the status label is `On` or `Off`
- long press does not open the Light detail module, because brightness, presets and palettes are not applicable

Honeycomb only applies this rule when Home Assistant explicitly reports `onoff`. Missing capability data, including temporary remote/unavailable states, is not treated as proof that the light is on/off-only.

## Live presentation

The persistent Light launcher:
- uses neutral dark appearance while off
- uses live RGB/HS/temperature-derived color while on
- shows brightness percentage for dimmable lights while on
- shows `On` for an on/off-only light while on
- shows `Off` for any available light while off
- updates while menus remain open
- shows gray + `Unavailable` if the entity disappears

## Full example

~~~yaml
type: custom:honeycomb-persistent-hub
name: Light A
size: 82
logo: auto

items:
  - type: light
    entity: light.zone_a
    name: Light A
    icon: mdi:lightbulb
    presets:
      brightness:
        entity: number.relay_a_brightness
      kelvin:
        entity: number.relay_a_kelvin
      color:
        hue_entity: number.relay_a_hue
        saturation_entity: number.relay_a_saturation
~~~

Complete current example: [Control Light](../examples/v1.7/control-light.yaml).

## Recursive color zoom (Issue #85, beta.3)

Developed independently in PR #94 from stable v1.7.0, then integrated onto the
exact tested Sonos beta.2 source for **v1.7.1-beta.3**. This cumulative owner-test
bundle contains both modules. A HACS install replaces the whole frontend bundle;
Light and Sonos are not separate installable patches. Stable still needs approval.

In the twelve-color outer palette (physical slots 7–18), **tap applies the color
once**. **Hold for the existing 500 ms threshold** to refine around that swatch
without sending any HA service call. The selected swatch stays in its physical
slot with its exact hue/saturation. Hold any new color to refine again.
`hold_time` keeps its existing component semantics (minimum 250 ms).

Each refinement uses the two current adjacent colors, with circular slot wrapping:

- The next clockwise color becomes the endpoint five clockwise slots away.
- The previous color becomes the endpoint six counterclockwise slots away.
- Samples interpolate from the selected color towards those endpoints. The two
  interval endpoints meet at the opposite-side boundary; the selected slot never
  moves. This unequal 5/6 spacing follows the owner's slot-8 example.
- Hue follows the shortest circular path (0°/360° wraps); a 180° tie goes positive.
  Saturation interpolates linearly on each side without introducing a neutral
  color. Selected and endpoint HS values are copied exactly; intermediate values
  retain floating-point precision rather than rounding HA service data.

For the original wheel, these are the resulting hues (display rounded to 3 decimals):

| Physical slot | Select 7 (0°) | Select 8 (25°) | Select 10 (80°) | Select 18 (335°) |
|---:|---:|---:|---:|---:|
| 7 | **0** | 20.833 | 65 | 340 |
| 8 | 5 | **25** | 70 | 345 |
| 9 | 10 | 30 | 75 | 350 |
| 10 | 15 | 35 | **80** | 355 |
| 11 | 20 | 40 | 87 | 0 |
| 12 | 25 | 45 | 94 | 300 |
| 13 | 335 | 50 | 101 | 305.833 |
| 14 | 339.167 | 0 | 108 | 311.667 |
| 15 | 343.333 | 4.167 | 115 | 317.5 |
| 16 | 347.5 | 8.333 | 50 | 323.333 |
| 17 | 351.667 | 12.5 | 55 | 329.167 |
| 18 | 355.833 | 16.667 | 60 | **335** |

Back restores the entire previous palette exactly, one level at a time, then
returns to the original palette and existing Light menu. The existing menu
navigation stack is the zoom history; there is no global/persistent palette state.
Full close/reopen resets to the original wheel. Idle timeout keeps its existing
behavior. Live HA state updates do not reset an open palette.

Keyboard: focus a swatch, press Enter/Space to apply, **Shift+Enter/Shift+Space**
to zoom, or **Escape** to fully close/reset. Hidden visual names provide accessible
color/gesture labels. Pointer cancel and movement retain existing gesture guards.

The Color interpolator does not apply to White/Kelvin, numeric presets, on/off-only lights,
Sonos favorites or generic Media. Shared 82 px geometry and inner controls remain
unchanged. It adds no timers/listeners/polling beyond the existing active-pointer
hold timer. History uses bounded-size 12-color snapshots per level and is released
on navigation close/teardown. No fixed maximum zoom depth is imposed.


## Recursive White / Kelvin zoom — issue #99, beta.7

Beta.7 extends the temperature-only **White** palette with its own bounded linear
zoom. The existing recursive Color zoom is unchanged. No new YAML option or helper
is needed. [Complete synthetic Control example](../examples/v1.7/kelvin-light.yaml):

```yaml
type: custom:honeycomb-persistent-control
module: light
entity: light.white_a
```

The real entity must advertise `supported_color_modes` containing `color_temp`,
and numeric native `min_color_temp_kelvin` / `max_color_temp_kelvin`. Honeycomb
uses those bounds, rounded inward to integer Kelvin; it never substitutes
2200–6500 K or derives bounds from mireds. Missing, nonpositive, inverted or
otherwise invalid bounds produce an explanatory **White unavailable** action
without opening a guessed palette. Color-capable Lights retain their Color
palette precedence. Inner controls, presets and on/off-only behavior are unchanged.

All twelve **outer menu ring** cells (physical slots 7–18) show only approximate
warm-to-cool Kelvin **cube fill** plus the normal **inner/outer borders**. No black
dot, icon, visible Kelvin number, primary text or secondary text is drawn there.
Accessible button names retain the exact Kelvin and available zoom/limit action.
The display RGB approximation never changes the exact integer sent to HA.

- Short tap or Enter/Space applies the selected temperature exactly once, after
  checking the current native range and availability. An out-of-date/out-of-range
  selection is rejected with a request to close/reopen; it is never silently clamped.
- Hold (existing 500 ms default) or Shift+Enter/Shift+Space refines without calling
  any Light service. The selected physical slot and exact Kelvin value stay fixed.
- Initial samples are `round(min + (max-min)*i/11)`, in slot order `i=0..11`.
  Refinement finds the smallest adjacent integer gap, halves it with floor, and
  uses at least 1 K. The new grid is `selectedKelvin + (i-selectedIndex)*step`.
  It is linear, strictly increasing, inside the previous/native range, and never
  wraps endpoints. Hue's circular neighbor interpolation is not used.
- Stop when another grid would be identical, or twelve distinct samples are
  impossible. A hold at the limit is a no-op and does not add history or call HA.
  Back restores the entire prior palette exactly. Escape/full close and reopen
  rebuilds from the Light's current native bounds; live state changes preserve
  open history. Canceling a pointer gesture never applies a temperature.

HA's standard Light API exposes integer Kelvin bounds/commands, **not a standard
hardware Kelvin-resolution attribute**. The client minimum is therefore 1 K;
physical lamps may quantize more coarsely. This is not a promise of infinite
precision or visually distinct RGB at every Kelvin. If the original native range
contains fewer than twelve integer temperatures (including a fixed temperature),
all twelve positions remain occupied by the legal initial samples, with unavoidable
repeated values and zoom disabled. No out-of-range extra endpoint is manufactured.

Desktop/mobile regression covers clean fills, screen-reader names, short tap,
keyboard/pointer hold, both endpoints, repeated refinement, limits, exact Back,
close/reset, changed bounds and service isolation. Real lamp quantization and
appearance still need owner HA validation before stable approval.
