<p align="center">
  <img src="https://raw.githubusercontent.com/NicolaiTandrup/honeycomb-menu-ng/master/assets/honeycomb-menu-ng-logo.png"
       width="220"
       alt="Honeycomb Menu NG">
</p>
# Honeycomb Menu NG for Home Assistant

Enhanced fork of [Sian-Lee-SA/honeycomb-menu](https://github.com/Sian-Lee-SA/honeycomb-menu) with flexible 18-slot layouts, an optional center button, shared styling, nested menus, and soft/hard slot positioning.

Honeycomb Menu NG is a **Home Assistant dashboard module**, not a standalone card. It can be attached to Lovelace cards through `fire-dom-event` and opens a floating menu made from hexagonal buttons.

> Current NG features are focused on flexible layouts, styling and menu interaction while keeping backwards compatibility with existing Honeycomb Menu YAML where possible.

## Highlights

- Up to **18 ring buttons** plus an optional center button
- **6-slot inner ring** and **12-slot outer ring**
- Automatic ring selection based on button count
- Soft and hard slot positioning
- Automatic center button using the Honeycomb entity
- Configurable center-button contrast with `center_brightness`
- Global `button_defaults` styling
- `empty_slots: visible|hidden`
- Nested Honeycomb menus
- Stable nested expansion with automatic layout envelopes
- Visible-viewport-aware menu positioning near screen edges
- Persistent center controls for floorplans and compact dashboards (v1.0)
- Existing template and XY-pad support
- Legacy `position` support

## Requirements

Honeycomb Menu NG is designed to use [custom:button-card](https://github.com/custom-cards/button-card) for its menu buttons.

Install `button-card` before using Honeycomb Menu NG.

## Installation

### HACS — recommended

1. Open **HACS** in Home Assistant.
2. Open **Custom repositories**.
3. Add:

   ```text
   https://github.com/NicolaiTandrup/honeycomb-menu-ng
   ```

4. Select **Dashboard** as the repository type.
5. Install **Honeycomb Menu NG**.
6. Reload the browser after installation or update.

The resource should normally be:

```text
/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js
```

with resource type:

```text
JavaScript module
```

### Manual installation

Download `honeycomb-menu-ng.js` from the latest release and place it somewhere below `/config/www/`.

For example:

```text
/config/www/honeycomb-menu-ng/honeycomb-menu-ng.js
```

Then add the Lovelace resource:

```yaml
resources:
  - url: /local/honeycomb-menu-ng/honeycomb-menu-ng.js
    type: module
```

## Quick start

Honeycomb Menu NG is opened using `fire-dom-event`.

```yaml
type: button
entity: light.kitchen
name: Kitchen
hold_action:
  action: fire-dom-event
  honeycomb_menu:
    entity: light.kitchen
    buttons:
      - icon: mdi:lightbulb-on-outline
        tap_action:
          action: call-service
          service: light.turn_on
          service_data:
            entity_id: light.kitchen

      - icon: mdi:lightbulb-off-outline
        tap_action:
          action: call-service
          service: light.turn_off
          service_data:
            entity_id: light.kitchen

      - icon: mdi:information-outline
        tap_action:
          action: more-info
```

The same pattern can be used from `picture-elements`, `custom:button-card`, Mushroom cards, or other Lovelace cards that support `fire-dom-event` actions.

## Layout model

Honeycomb Menu NG has two physical button rings:

- **Slots 1–6**: inner ring
- **Slots 7–18**: outer ring
- **Center button**: separate from slot numbering

Approximate slot layout:

```text
                 9    10    11
             8      2    3      12

          7      1   CENTER  4      13

            18      6    5      14
                17   16   15
```

### Automatic ring selection

Without hard-slot overrides, the active ring layout is selected from the number of resolved buttons:

| Buttons | Active layout |
|---:|---|
| 1–6 | Inner ring |
| 7–12 | Outer ring |
| 13–18 | Inner + outer ring |

A hard slot can force its physical ring to be active even when the button count would normally select another layout.

## v1.1.3 — Hub state and center slot

v1.1.3 makes Hub launchers state-aware and introduces center slot `0` for Hub layouts.

- Hub light tiles now reflect the live light state before opening:
  - off = neutral dark tile
  - on + RGB = current RGB color
  - on + color temperature = current warm/cool white color
  - brightness remains visible as the secondary value
- media tiles use a distinct active color while playing and continue to show the current media title/source/state
- Hub slot `0` means the physical center position
- explicit `slot: 0` is supported for Hub items
- when the logo is disabled, auto-layout may place a real Hub item in slot 0
- seven Hub items always use slots `0–6` and suppress the logo

Automatic Hub layouts:

Without logo:
- 2 items: `2,3`
- 3 items: `2,3,0`
- 4 items: `1,2,0,3`
- 5 items: `1,2,0,3,4`
- 6 items: `1,2,3,4,5,6`
- 7 items: `0,1,2,3,4,5,6`

With logo in slot 0:
- 2 items: `2,3`
- 3 items: `2,4,6`
- 4 items: `2,3,1,4`
- 5 items: `1,2,3,4,5`
- 6 items: `1,2,3,4,5,6`
- 7 items: logo is suppressed and the no-logo 7-item layout is used

## v1.1.2 — Direct Hub and branded bee

v1.1.2 removes the extra Hub click and turns the bee into branding rather than a navigation gate:

- Hub launcher rings open automatically as soon as the card is rendered
- two to six Hub items use balanced inner-ring positions around the center
- the bee logo is shown automatically in the center when two or more Hub items are present
- set `logo: false` to remove the automatic center logo
- a Hub item without an icon now uses the built-in Honeycomb bee; set `icon: false` to render no icon
- the bee has been redrawn as an embedded SVG with yellow/black body, white wings and a friendlier logo-style face
- tapping a bee triggers a short wing-flap animation without adding a navigation step
- media launchers now use the established Sonos layout: volume down, play/pause, Join, volume up, Radio and Browse
- optional Sonos group-volume scripts, Join members and favorites/cache sensors can be configured per media launcher

The bee remains embedded directly in the JavaScript bundle; no separate image asset is required.

## v1.1.1 — Hub launcher label fix

v1.1.1 fixes the initial Hub configuration error where the light launcher status template was evaluated too early and raised `b is not defined`.

- light launcher brightness labels are now emitted as literal button-card templates
- Hub cards can render and open normally
- no YAML changes are required from v1.1.0

## v1.1.0 — Honeycomb Hub prototype

v1.1.0 introduces a new persistent Hub launcher:

- new `custom:honeycomb-persistent-hub`
- a blank hub icon (`icon: ""`) renders the built-in Honeycomb bee
- the hub opens up to six launcher cubes around the persistent center
- launcher types currently supported in the prototype: `light` and `media`
- light launchers automatically open the existing auto-light controls from v1.0.14
- media launchers open a compact Sonos/media control menu with play/pause, volume down/up and info
- selected launcher cubes can be promoted into the persistent center while their controls open around them
- tapping the promoted center returns to the Hub
- Hub launcher cubes can show live state summaries such as light brightness/off state and current media title/source
- future launcher types are reserved for climate, vehicle, cover and scenes

A blank icon only means "use the Honeycomb bee" on persistent controls. `show_icon: false` still means render no icon.

## v1.0.14 — Auto light controls

v1.0.14 makes the light-specific Honeycomb controls capability-aware and usable with or without Shelly/HA preset helpers:

- `control: light-palette` reads the light's `supported_color_modes`
  - color-capable lights (for example `xy`, `hs`, `rgb`) automatically open a 12-color outer ring
  - color-temperature-only lights automatically open a 12-step warm-to-cool white outer ring using the light's own min/max Kelvin attributes
- `control: preset-standard` automatically chooses the correct standard control
  - color-capable light + Hue/Saturation helpers: stored HS color
  - color-temperature light + Kelvin helper: stored Kelvin
  - no helper configured: warm-white fallback at 2700K
- `control: preset-brightness` now works without a helper and falls back to 60%
- `control: preset-kelvin` works without a helper and falls back to 2700K
- helper-backed controls retain tap-to-apply and hold-to-store behavior
- fallback controls are apply-only
- null Home Assistant brightness/Kelvin attributes no longer display as misleading `Now 0%` / `Now 0K`

This allows the same compact YAML to be reused for White Ambiance and full-color lights.

## v1.0.13 — Preset text layout fix

v1.0.13 fixes the visual layout of generated preset controls:

- preset buttons now use a dedicated three-row grid for icon, stored preset value and current light value
- stored values such as `60%` and `2700K` are centered inside the hexagon instead of being pushed toward or below the edge
- current values such as `Now 43%` and `Now 3200K` use a smaller secondary line underneath
- the fix applies to brightness, Kelvin and HS color preset controls without changing ordinary Honeycomb buttons

## v1.0.12 — Preset template runtime fix

v1.0.12 fixes a runtime regression in the new preset controls:

- button-card JavaScript templates used for preset labels are now emitted as literal templates instead of being evaluated while Honeycomb is opening
- this fixes the long-press failure where a persistent control with `presets:` could not open its base menu
- stored brightness/Kelvin values and current light values can now be rendered dynamically after the menu opens
- no configuration changes are required from v1.0.11

## v1.0.11 — Preset controls

v1.0.11 adds native preset controls for persistent light menus:

- `control: preset-brightness` reads a configured Home Assistant `number` entity, displays the stored preset and the light's current brightness, applies the stored value on tap, and stores the current brightness back to the helper on hold
- `control: preset-kelvin` provides the same tap/apply and hold/store workflow for color temperature
- `control: preset-color` stores and applies Hue/Saturation using two number entities
- preset controls inherit the root light entity introduced in v1.0.10, so the light entity still only needs to be declared once
- helper targets remain explicit under a root `presets:` block
- normal Honeycomb buttons and existing YAML are unchanged

Example:

```yaml
type: custom:honeycomb-persistent-control
entity: light.hue_kontor

presets:
  brightness:
    entity: number.ia_stue_20_2_kokken_kokkeno_stue_normal_brightness
  kelvin:
    entity: number.ia_stue_20_2_kokken_kokkeno_stue_standard_kelvin

menu:
  buttons:
    - slot: 2
      control: preset-brightness
    - slot: 4
      control: preset-kelvin
```

A preset button shows the stored value as its primary text and the light's current value as secondary text. Tap applies the preset; hold stores the current light value back into the number entity.

For RGB/HS capable lights, configure:

```yaml
presets:
  color:
    hue_entity: number.example_standard_hue
    saturation_entity: number.example_standard_saturation
```

and use `control: preset-color`. Tap applies the stored HS color; hold stores the light's current `hs_color` into the two number helpers.

## v1.0.10 — Entity inheritance

v1.0.10 adds entity inheritance to reduce repeated entity IDs in Honeycomb YAML:

- the top-level `entity` becomes the default entity for the menu tree
- menu center, ring buttons and nested Honeycomb menus inherit it automatically
- `perform-action` actions automatically receive `target.entity_id` when no target is explicitly supplied
- legacy `call-service` actions automatically receive `service_data.entity_id` when no explicit target/entity is supplied
- a button or nested menu can still override inheritance simply by setting its own `entity`
- explicitly configured action targets always win
- existing YAML remains backwards compatible

This means a persistent light control can define `entity: light.hue_kontor` once at the root and omit the repeated entity and target blocks from its buttons and nested color palette.

## v1.0.8 — Restore persistent button actions in fixed overlay mode

v1.0.8 fixes a regression introduced by the fixed-overlay placement change:

- anchored persistent menus remain fixed-position overlays, preserving the scroll/placement fix from v1.0.7
- the overlay is now attached back inside the Lovelace view subtree instead of directly to `document.body`
- wrapped Honeycomb button cards therefore retain their normal Home Assistant action/event context
- tap actions, service calls and nested `fire-dom-event` actions work again while the menu remains fixed to the viewport
- persistent source hiding/restoring and nested anchored expansion are unchanged

## v1.0.7 — Fixed persistent overlay positioning

v1.0.7 fixes the remaining placement jump visible when opening persistent controls near the bottom of a scrolled dashboard:

- anchored persistent menus are now rendered as fixed viewport overlays instead of absolute children of the Lovelace view
- opening a large reserved outer-ring envelope can therefore no longer increase the dashboard scrollable overflow and trigger browser scroll anchoring
- anchored positioning now aligns the exact rendered center hexagon to the source control coordinate, instead of positioning from the menu container midpoint
- the original persistent source cube is hidden while the overlay menu is open and restored when the menu closes, removing the temporary duplicate-center effect
- nested in-place expansion continues to use the same fixed anchor

## v1.0.6 — Border cleanup and theme-independent ring contrast

v1.0.6 fixes two visual issues found during persistent-control testing:

- the persistent center no longer creates a double dark outline; outer border, inner accent border and center fill are now three uniformly scaled copies of the same SVG hexagon
- the outer border remains static dark gray while the inner border continues to follow the active/last-known light color
- persistent ring labels and icons now use an explicit light foreground on the default dark-gray ring background, so they remain readable in both Home Assistant light and dark themes
- center icon/brightness contrast still adapts automatically to the actual center fill color

## v1.0.5 — Static outer border and stable outer-ring envelope

v1.0.5 refines the persistent light visual and outer-ring expansion:

- the persistent center outer border is now a static dark gray by default, so bright light colors remain visually separated from the dashboard/floorplan background
- inner border still follows the active/last-known light color
- center fill still follows the actual light color when on
- persistent menus now explicitly reserve the full outer-ring layout envelope before the first ring opens when a reachable nested menu uses the outer physical ring
- opening Color into slots 7–18 therefore does not recalculate the menu footprint and move the anchored center

## v1.0.4 — Smart center contrast and outer color palette

v1.0.4 improves light-focused persistent controls:

- persistent center icons automatically switch between a light and dark foreground based on the current center color, keeping the icon readable across bright and dark RGB colors
- persistent light centers can show live brightness as secondary text; the default remains `show_brightness: when_on`
- nested menus can use `inherit_inner: true` to keep the existing six inner controls while adding a nested control surface in the physical outer ring
- the Hue reference test now expands Color into a 12-color palette in slots 7–18 instead of replacing the inner ring with three text buttons
- standard nested-menu behavior remains unchanged unless `inherit_inner` is enabled

## v1.0.3 — Persistent nested stability and ring polish

v1.0.3 focuses on the expanded persistent-control experience:

- persistent rings now use a built-in neutral card background and centered icon/name layout when no more specific button styling is supplied
- the actual rendered persistent-center width is reused when the first ring opens, preventing the center from growing in responsive layouts
- nested `nested_expand` menus inherit anchored positioning, size, idle timeout and button defaults from the persistent parent
- nested expansion therefore stays on the same floorplan/dashboard anchor instead of viewport-clamping and causing scroll-position jumps
- nested menus retain the same persistent hex geometry in the center and use the center as a back control
- standard non-persistent Honeycomb behavior is unchanged

## v1.0.2 — Persistent gesture and geometry fix

v1.0.2 fixes two regressions found while testing the new persistent control:

- persistent center geometry now uses one shared SVG polygon for the center fill and both border strokes, eliminating the visible shape mismatch caused by scaling multiple hexagons
- persistent tap/hold handling is now owned by the persistent control itself instead of the wrapped button-card, restoring reliable long-press opening
- removes the temporary button-card interaction surface from the persistent center, preventing the rotated yellow/active Honeycomb flash on tap
- single tap still executes the configured primary action; hold opens the anchored Honeycomb menu
- expanded menus continue to render the same persistent center appearance in the middle

## v1.0.1 — Anchored persistent controls

v1.0.1 refines the persistent-control foundation introduced in v1.0.0:

- persistent hexagons now use SVG geometry so all six sides and both borders remain homogeneous at every size
- an opened persistent menu is anchored to the exact center of the persistent cube instead of being viewport-clamped away from it
- the expanded menu renders the same persistent-center visual in its center, including live light color and border state
- ring button size automatically matches the persistent anchor size by default (`match_anchor_size: true`)
- standard non-persistent Honeycomb popups continue to use visible-viewport positioning

This establishes the model needed for future persistent room clusters where lights, thermostats and media controls can each expand their own Honeycomb ring from their fixed floorplan position.

## Entity inheritance

From v1.0.10, the root Honeycomb `entity` is inherited throughout the menu tree.

```yaml
type: custom:honeycomb-persistent-control
entity: light.hue_kontor

menu:
  buttons:
    - slot: 1
      icon: mdi:brightness-7
      tap_action:
        action: perform-action
        perform_action: light.turn_on
        data:
          brightness_pct: 100
```

The button above automatically uses `light.hue_kontor` as both its entity and action target. Nested Honeycomb menus inherit the same entity unless they explicitly set another one.

## Persistent center control (v1.0)

v1.0 adds an opt-in persistent Honeycomb center that can stay visible on a dashboard or floorplan while the surrounding menu remains hidden until a hold gesture.

The persistent control reuses the existing Honeycomb center geometry and the existing menu engine. Existing popup/menu configurations remain unchanged.

Basic example:

```yaml
type: custom:honeycomb-persistent-control
entity: light.hue_kontor
icon: mdi:lightbulb
size: 72

tap_action:
  action: toggle

menu:
  size: 225
  empty_slots: hidden
  buttons:
    - slot: 1
      slot_mode: hard
      entity: light.hue_kontor
      icon: mdi:brightness-7
      tap_action:
        action: perform-action
        perform_action: light.turn_on
        target:
          entity_id: light.hue_kontor
        data:
          brightness_pct: 100
```

Initial v1.0 persistent behavior:

- the center stays visible while idle
- tap executes the configured primary action
- hold opens the configured Honeycomb menu
- closing the menu returns to the persistent center
- Home Assistant state updates are passed live to the center card

Dynamic light colors, double borders and brightness text build on this persistent-center foundation.

## Layout envelope for nested expansion

When a menu contains a reachable nested menu with `nested_expand: true`, Honeycomb Menu NG can reserve the geometry needed by that submenu before it is opened. This keeps the center and inner ring in the same position when an outer ring is expanded later.

The default is:

```yaml
layout_envelope: auto
```

Modes:

- `auto` — inspect reachable `nested_expand` menus and reserve outer-ring space when needed
- `inner` — reserve only the current inner-ring footprint
- `outer` — always reserve the full inner + outer footprint

The envelope only affects geometry and positioning. It does not render empty outer-ring buttons.

## Empty slots

By default, unused positions in active rings remain visible:

```yaml
empty_slots: visible
```

To show only configured buttons:

```yaml
empty_slots: hidden
```

Only slots belonging to active rings are affected.

## Center button

The center button is enabled automatically unless explicitly disabled.

By default it:

- uses the Honeycomb menu `entity`
- inherits `active`
- uses `autoclose: true`
- opens `more-info` when tapped

### Override the center button

```yaml
honeycomb_menu:
  entity: light.kitchen
  center_button:
    icon: mdi:lightbulb-group
    tap_action:
      action: toggle
```

### Disable the center button

```yaml
center_button: false
```

### Center brightness

When the center button inherits its background from `button_defaults`, Honeycomb Menu NG makes it slightly lighter so the center is visually distinct.

The default is:

```yaml
center_brightness: 15
```

This means a 15% lightness boost where the inherited background color can be parsed. If the color cannot be parsed, a brightness filter is used as fallback.

Set it to `0` to disable the automatic contrast:

```yaml
center_brightness: 0
```

Or increase it:

```yaml
center_brightness: 25
```

If `center_button` defines its own background color, that explicit background wins and the automatic center adjustment is not applied.

## Global button defaults

Use `button_defaults` to apply common configuration to all ring buttons without repeating it on every button.

```yaml
honeycomb_menu:
  entity: light.kitchen
  button_defaults:
    styles:
      card:
        - background: rgba(110, 110, 110, 0.65)
        - border: 1px solid rgba(255, 255, 255, 0.12)
  buttons:
    - icon: mdi:lightbulb-on-outline
      tap_action:
        action: toggle

    - icon: mdi:lightbulb-off-outline
      tap_action:
        action: call-service
        service: light.turn_off
        service_data:
          entity_id: light.kitchen
```

A button can override any default locally:

```yaml
- icon: mdi:lightbulb-group
  styles:
    card:
      - background: rgba(150, 150, 150, 0.70)
```

## Slot positioning

### Automatic positioning

If no `slot` or legacy `position` is supplied, buttons are assigned to the first free position in the active layout.

```yaml
buttons:
  - icon: mdi:lightbulb
  - icon: mdi:fan
  - icon: mdi:door
```

### Soft slots — default

`slot` is a **preference** by default.

```yaml
- slot: 9
  icon: mdi:lightbulb
```

If the requested physical slot belongs to an active ring, the button stays there.

If that ring is not active, the requested slot is mapped to the corresponding position in the active ring. If the preferred position is already occupied, Honeycomb Menu NG moves clockwise to the first free position.

Examples:

- 5 buttons + soft `slot: 7` → inner slot 1
- 9 buttons + soft `slot: 9` → physical outer slot 9
- 14 buttons + soft `slot: 9` → physical slot 9

### Hard slots

Use `slot_mode: hard` when the physical position must not move.

```yaml
- slot: 9
  slot_mode: hard
  icon: mdi:lightbulb
```

Hard slots:

- always use the exact physical slot
- can force inner and/or outer rings to become active
- are never moved to resolve a conflict

If two hard buttons request the same physical slot, the first one wins and a warning is written to the browser console.

### Legacy `position`

The original `position` option remains supported for backwards compatibility and behaves as an absolute physical/index position.

```yaml
- position: 0
  icon: mdi:lightbulb
```

For new configurations, prefer `slot` and `slot_mode`.

## Nested Honeycomb menus

A Honeycomb button can open another Honeycomb menu by using `fire-dom-event` in its own action.

```yaml
buttons:
  - icon: mdi:menu-right
    tap_action:
      action: fire-dom-event
      honeycomb_menu:
        entity: light.kitchen
        buttons:
          - icon: mdi:lightbulb-on-outline
            tap_action:
              action: call-service
              service: light.turn_on
              service_data:
                entity_id: light.kitchen

          - icon: mdi:lightbulb-off-outline
            tap_action:
              action: call-service
              service: light.turn_off
              service_data:
                entity_id: light.kitchen
```

The currently open Honeycomb menu is closed when the nested menu opens.

## Example: picture-elements

```yaml
type: picture-elements
image:
  media_content_id: media-source://image_upload/your-image-id
  media_content_type: image/png

elements:
  - type: state-icon
    entity: light.kitchen
    style:
      left: 20%
      top: 20%
    tap_action:
      action: toggle
    hold_action:
      action: fire-dom-event
      honeycomb_menu:
        entity: light.kitchen
        autoclose: true
        active: true
        empty_slots: hidden
        center_brightness: 15

        button_defaults:
          styles:
            card:
              - background: rgba(170, 95, 95, 0.72)
              - border: 1px solid rgba(255, 255, 255, 0.12)

        center_button:
          icon: mdi:lightbulb-group
          tap_action:
            action: more-info

        buttons:
          - icon: mdi:lightbulb-on-outline
            tap_action:
              action: call-service
              service: light.turn_on
              service_data:
                entity_id: light.kitchen

          - slot: 3
            icon: mdi:lightbulb-off-outline
            tap_action:
              action: call-service
              service: light.turn_off
              service_data:
                entity_id: light.kitchen

          - icon: mdi:dots-horizontal
            tap_action:
              action: more-info
```

## Honeycomb menu options

| Option | Values | Default | Description |
|---|---|---|---|
| `entity` | entity ID | `null` | Primary entity used by the menu and inherited by buttons |
| `buttons` | list | `[]` | Ring button definitions |
| `active` | boolean / template | `false` | Enables active styling based on entity state or template result |
| `autoclose` | boolean | `true` | Default close behaviour after a button action |
| `audio` | URL/path | `false` | Default audio played when a button is tapped |
| `xy_pad` | object | `null` | Optional XY control pad |
| `size` | integer | `225` | Overall Honeycomb size |
| `spacing` | integer | `2` | Padding between Honeycomb items |
| `variables` | object | `{}` | Variables available to Honeycomb templates |
| `animation_speed` | integer (ms) | `100` | Delay increment between button animations |
| `button_defaults` | object | `{}` | Shared configuration merged into ring buttons |
| `empty_slots` | `visible` / `hidden` | `visible` | Controls empty positions in active rings |
| `center_button` | object / `false` | `{}` | Center button override, or `false` to disable it |
| `center_brightness` | number | `15` | Automatic center-background lightness boost in percent |

## Button options

Ring buttons use `custom:button-card` by default, so most button-card options can be passed through.

| Option | Values | Default | Description |
|---|---|---|---|
| `type` | card type | `custom:button-card` | Underlying Lovelace card used inside the hex |
| `entity` | entity ID | menu entity | Entity used by the button |
| `icon` | icon | — | Icon shown by the button |
| `show` | boolean / template | `true` | Whether the button is available |
| `active` | boolean / template | menu `active` | Per-button active override |
| `autoclose` | boolean | menu `autoclose` | Per-button autoclose override |
| `audio` | URL/path | menu `audio` | Per-button audio override |
| `slot` | `1–18` | — | Preferred or physical slot depending on slot mode |
| `slot_mode` | `soft` / `hard` | `soft` | Soft preference or hard physical placement |
| `position` | integer | — | Legacy absolute/index placement |
| `tap_action` | action | — | Tap action |
| `hold_action` | action | — | Hold action |
| `double_tap_action` | action | — | Double-tap action |

Additional options supported by the underlying card can also be supplied.

## XY Pad

The optional XY pad can execute services based on X and/or Y movement.

Typical uses include:

- light brightness
- hue or color changes
- blinds and covers
- relative volume or other service values

```yaml
honeycomb_menu:
  entity: light.kitchen
  xy_pad:
    repeat: 500
    y:
      invert: true
      service: light.turn_on
      data:
        entity_id: entity
        brightness_step_pct: 'HCJS: return variables.y_percentage / 10;'
```

### XY Pad options

| Option | Values | Default | Description |
|---|---|---|---|
| `repeat` | integer (ms) / `false` | `false` | Repeat service calls while the pad remains active |
| `on_release` | boolean | `false` | Only call the service when the pad is released |
| `x` | object | `null` | X-axis configuration |
| `y` | object | `null` | Y-axis configuration |

### XY axis options

| Option | Values | Default | Description |
|---|---|---|---|
| `invert` | boolean | `false` | Reverse positive and negative direction |
| `service` | service | — | Service to call |
| `data` / `service_data` | object | — | Service payload; supports Honeycomb templating |

The XY pad exposes:

```text
variables.x
variables.y
variables.x_percentage
variables.y_percentage
```

## Templating

Honeycomb Menu keeps the original templating system.

### HCJS

```yaml
active: 'HCJS: return entity.state === "on";'
```

### Triple-bracket JavaScript

`custom:button-card` configuration can continue to use button-card JavaScript templates where supported:

```yaml
name: >
  [[[
    return entity.state;
  ]]]
```

### Template literal syntax

```yaml
brightness_step_pct: '${variables.y_percentage}'
```

The literal word `entity` in Honeycomb service data is replaced with the Honeycomb menu entity.

## Honeycomb templates and variables

Existing Honeycomb templates remain supported and can inherit/override configuration through the original merge hierarchy.

Example:

```yaml
light:
  variables:
    motion: null
  buttons:
    - icon: mdi:information-variant
      tap_action:
        action: more-info

    - icon: mdi:motion-sensor
      show: 'HCJS: return variables.motion;'
      entity: 'HCJS: return variables.motion;'
      active: true
      tap_action:
        action: toggle
```

Use it with:

```yaml
hold_action:
  action: fire-dom-event
  honeycomb_menu:
    template: light
    entity: light.kitchen
    variables:
      motion: automation.kitchen_motion
```

## Theme variables

Honeycomb Menu NG retains the original theme variables:

```css
--honeycomb-menu-icon-color: var(--paper-item-icon-color);
--honeycomb-menu-icon-active-color: var(--paper-item-icon-active-color);
--honeycomb-menu-background-color: var(--paper-card-background-color);
--honeycomb-menu-active-background-color: var(--paper-card-active-background-color, var(--paper-card-background-color));
--honeycomb-menu-disabled: #9a9a9a6e;
```

`button_defaults` is usually the easiest way to apply menu-specific styling directly from YAML.

## Updating

When updating through HACS:

1. Install the new Honeycomb Menu NG version.
2. Reload the Home Assistant frontend.
3. If the old JavaScript is still visible, perform a hard browser refresh / clear the frontend cache.

## Backwards compatibility

Honeycomb Menu NG aims to remain compatible with existing Honeycomb Menu configurations.

Notable compatibility behaviour:

- legacy `position` remains supported
- original Honeycomb templates remain supported
- XY pad behaviour remains available
- normal button actions remain compatible

New configurations should generally use `slot` instead of `position`.

## Roadmap

Planned / experimental ideas include:

- improved mouse-hover interaction
- improved touch-drag interaction
- additional nested-menu navigation options
- more reusable menu presets and examples

## Examples and original documentation

The original project contains additional examples and background information:

- [Original Honeycomb Menu](https://github.com/Sian-Lee-SA/honeycomb-menu)
- [Honeycomb Module: Hex PopUp Menu For Home Assistant](https://smarthomescene.com/guides/honeycomb-module-hex-popup-menu-for-home-assistant/)
- [button-card](https://github.com/custom-cards/button-card)

Existing media from the original project:

![Example of Honeycomb](examples/example-1.gif)
![Example of XYPad](examples/example-xypad.gif)

## Credits

Honeycomb Menu NG is based on the original [Honeycomb Menu](https://github.com/Sian-Lee-SA/honeycomb-menu) project by Sian Lee / Sian-Lee-SA.

The original project was designed around [button-card](https://github.com/custom-cards/button-card) by [@RomRider](https://github.com/RomRider).

## Support the original author

<a href="https://www.paypal.com/donate/?business=A82MM255CXF9L&no_recurring=0&item_name=Donating+will+help+justify+my+time+coding+and+doing+projects+that+also+benifits+others.+Any+amount+is+greatly+appreciated%21&currency_code=AUD"><img src="https://github.com/andreostrovsky/donate-with-paypal/raw/master/blue.svg" height="38"></a>

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/SianLee)
