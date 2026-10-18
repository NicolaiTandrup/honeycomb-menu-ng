<p align="center">
  <img src="https://raw.githubusercontent.com/NicolaiTandrup/honeycomb-menu-ng/master/assets/honeycomb-menu-ng-logo.png"
       width="220"
       alt="Honeycomb Menu NG">
</p>

# Honeycomb Menu NG for Home Assistant

Honeycomb Menu NG is a modular Home Assistant dashboard interaction system built around compact hexagonal controls. It is designed especially for floorplans, wall tablets and dashboards where a single visible control should open richer Light, Sonos or media controls without taking permanent screen space.

The project **originated as a fork** of [Sian-Lee-SA/honeycomb-menu](https://github.com/Sian-Lee-SA/honeycomb-menu) by Sian Croser. Honeycomb Menu NG still contains portions of that GPLv3 codebase and keeps full attribution, but NG has evolved into a substantially larger modular implementation with persistent Hubs, native Light/Media/Sonos modules, locked-center navigation, state-aware controls and automated regression tests.

## What Honeycomb Menu NG gives you

- persistent Honeycomb Hubs for floorplans and compact dashboards
- short-tap primary actions and long-press detailed controls
- Light controls with brightness, smart Color/White palettes and reusable presets
- Sonos controls with play/pause, group-aware volume, Join, Radio favorites and Browse
- generic media controls for non-Sonos players
- fixed physical module center: nested menus may expand from 7 to 19 cubes without moving slot 0
- state-aware launcher colors, brightness/volume labels and explicit `Unavailable` status
- 6-slot inner ring + 12-slot outer ring
- hard/soft/priority slot placement, live conditional visibility and classic popup compatibility
- nested menus, templates and XY Pad
- modular core with isolated domain modules and regression tests
- one shared Honeycomb bee brand across Home Assistant and GitHub

## Canonical persistent Hub (v1.6 development)

Use `custom:honeycomb-persistent-hub` for a single control or a group. Omit `items`
for a single control with existing entity/actions/menu, or provide `items` for a
live group. `persistent-control` remains a supported compatibility adapter.

Hub items now reuse conditional visibility and hard/soft/priority placement,
including slot 0. Hidden children return to the nearest visible parent, and
layout changes wait for pointer release. Existing small layouts stay intact;
larger groups can use up to 19 cells. Empty groups keep an accessible launcher.

Use `button_defaults` for shared item colors/border/actions and per-item overrides.
Generic cubes need no domain module. Persistent `size: 82` is cube width; classic
menu `size` retains its old extent meaning. Use `cube_size: 82` on classic menus
when matching physical dimensions, and compare equal `face_mode` settings.

See the [migration guide and functionality matrix](docs/PERSISTENT_HUB_MIGRATION.md)
for precise defaults, compatible advanced actions, examples and upgrade steps.
No configuration migration is required for existing dashboards.

## v1.6 beta: conditional visibility and placement

A button can appear only while a vehicle is present, a charger is using power,
or another entity matches a condition. Put Home Assistant-style conditions in
`visibility`. Changes are applied live, without reloading the dashboard.

```yaml
buttons:
  - name: Vehicle A
    entity: sensor.vehicle_a_battery
    icon: mdi:car-electric
    slot: 3
    slot_mode: priority
    visibility:
      - condition: state
        entity: binary_sensor.vehicle_a_present
        state: 'on'
    tap_action:
      action: more-info
```

Choose placement by what should happen when the button is hidden:

| Mode | Visible | Hidden |
|---|---|---|
| `hard` | Owns its exact physical slot | Slot remains reserved and cannot be used by another button |
| `soft` (default for popup buttons) | Uses the requested slot when free, otherwise the next free clockwise slot | Consumes no slot |
| `priority` | Claims its preferred physical slot before soft/automatic buttons; reclaims it when it returns | Releases the slot |

Hard declarations win over priority. For duplicate hard claims the first
configured declaration wins, including a hidden reservation. Priority ties use
configuration order; conflicting priority buttons move clockwise **after all
uncontested priority claims are secured**. Soft and automatic buttons then fill
remaining space. Excess buttons are omitted deterministically, with a console
warning. An outer hard or priority target activates its physical ring; soft
slots retain their existing wrapping behavior. `empty_slots: hidden` hides
empty reserved cells; the reservation still applies.

Existing `slot`, `slot_mode: hard|soft`, zero-based legacy `position`, `show`
booleans/templates, template-stack fallbacks, `break`, `skip`, and button-card
configuration remain supported. A hidden **hard** declaration now retains its
reservation, including when hidden through `show`. Legacy `position` retains
its prior visibility behavior. Visibility is independent of `disabled`: a
visible disabled button still occupies space. Visibility and `show` must both
pass. Ring items generated by persistent Hubs can use the same conditions and
placement modes; their default mode remains hard.

### Condition reference (for people and AI tools)

- `visibility` is a list; all entries must pass. Omitted or `[]` means visible.
- `state`: `entity`, optional `attribute`, and `state` **or** `state_not` as a
  scalar/list. State values compare as strings. `entity_id` is also accepted.
  Missing entities/attributes are treated as `unknown`, as in dashboard conditions.
- `numeric_state`: `entity`, optional `attribute`, and `above` and/or `below`.
  Bounds are exclusive. Bounds may be numbers or entity IDs holding numbers.
  Missing, blank, unknown, unavailable and nonnumeric values/bounds fail.
- `and`, `or`, `not`: a nested `conditions` list. Dashboard `not` negates the
  conjunction of its list; use a single child when expressing a simple NOT.
- Unsupported or malformed condition trees fail closed, even inside `not` or
  `or`. Backend Jinja, device, time, screen and user conditions are not evaluated.
- Visibility is checked against current frontend entity state about every 200 ms.
  New `hass` object identity is not required. Hidden controls cannot dispatch
  actions. Layout updates wait until drag-select release/cancel; newly hidden
  targets become non-actionable immediately. A completed drag dispatches one tap.
- Menu buttons use slots **1–18**. A Hub's physical center remains slot **0**.
  Visibility never grants modules ownership of the navigation anchor.

```yaml
visibility:
  - condition: and
    conditions:
      - condition: numeric_state
        entity: sensor.charger_1_power
        above: 0
      - condition: or
        conditions:
          - condition: state
            entity: binary_sensor.vehicle_a_present
            state: 'on'
          - condition: not
            conditions:
              - condition: state
                entity: switch.charger_1_charging_allowed
                state: 'off'
```

## Shared dual-ring cubes and nested menus (v1.6 beta)

Ordinary menu cubes can now use the same `colors.center`, `colors.inner_border`,
`colors.outer_border`, `border.inner_width`, and `border.outer_width` as native
persistent controls. Widths are pixels; each ring is independent. Omit `colors`
and `border` to retain the classic appearance. `face_mode: inset` (default) and
`face_mode: cell` select the same geometry in both renderers. The ring overlay
leaves button-card text, custom fields and actions interactive. A configured
center color takes precedence over the wrapped card's background.

Native persistent controls support live `name`, `label`, `icon`, colors and
width templates. Light/Media state presentation remains the default when no text
is configured. `mode: hub` can display aggregate information without an entity.
`tap_action` and `hold_action` are independent; omitting a native hold action
retains hold-to-open behavior. Enter/Space activates its tap action.

Use `action: honeycomb-open-nested` with `honeycomb_nested_menu` to open content
inside the owning menu. It defaults to `nested_expand: true`, preserving the
same overlay, anchor and cube size. Set `nested_expand: false` explicitly for
legacy replacement behavior. `honeycomb-back` restores history. A persistent
Hub's first Light/Media promotion retains its established behavior; deeper
levels keep that module's anchor. `layout_envelope: outer` reserves space for
outer-ring content without moving the center. `inherit_inner` still adds an
outer ring around existing controls.

Define complex menus once under dashboard-level `honeycomb_menu_templates`.
Both a standalone `honeycomb_menu: {template: vehicle_controls, variables: ...}`
launcher and a nested `honeycomb_nested_menu: {template: vehicle_controls}` use
the same buttons, layout, labels and actions. Nested invocation passes the
calling cube's variables; menu variables may override them. Navigation alone
adds the native back center; it does not copy the parent button defaults onto
the reused content.

**Template dialect:** Honeycomb evaluates `[[[ return ...; ]]]`, `HCJS: ...`,
and legacy `${...}` expressions with `states`, `entity`, `variables`, `user`,
and `hass`. Native presentation fields are plain text, not HTML. Wrapped
button-card names/labels use button-card's JS context (including its helpers).
Missing/failed name and label expressions display `Unavailable`. Use explicit
fallbacks for domain-specific unknown states. Honeycomb's final text host also
normalizes extra bracket escape layers so they cannot appear as raw JS text.
When embedding a menu inside another button-card's action, that ancestor still
needs an extra bracket pair (`[[[[ ... ]]]]`) to delay evaluation until the
child exists. The native parent in the example below needs only three brackets.
Do not embed Jinja templates in these frontend fields.

## Generic Charging Hub

This complete dashboard example composes native persistent controls, ordinary
menu cubes and existing template/actions. Merge its `honeycomb_menu_templates`
into your dashboard and place the card in any view. Replace every placeholder
entity and request script with your existing Home Assistant entities/actions.

The parent displays current aggregate power and active/total charger count.
One tap opens the hub; a charger tap requests permission through an external
script and a hold opens session energy and read-only cable-lock status. A
vehicle tap opens the reusable `vehicle_controls` menu; hold opens more-info.
The ring is green when permitted, blue when online/blocked, red on fault, and
gray offline. Vehicle colors are separately configurable. The parent center
changes while charging, and remains accessible with no known vehicles.

| Generic entity | Purpose |
|---|---|
| `sensor.charger_1_power` | Current W/kW; missing or invalid power shows Unavailable |
| `binary_sensor.charger_1_charging` | Active charger count |
| `binary_sensor.charger_1_online` / `..._fault` | Availability/fault ring |
| `switch.charger_1_charging_allowed` | Read permission status |
| `script.request_charger_1_permission` | External policy-checked permission request |
| `sensor.charger_1_vehicle` | Associated Vehicle A/B or No vehicle |
| `sensor.charger_1_session_energy` | Reported session energy |
| `binary_sensor.charger_1_cable_locked` | Read-only lock status |
| `binary_sensor.vehicle_a_present` / `sensor.vehicle_a_battery` | Optional vehicle visibility/information |

Add/remove charger records in both `variables.chargers` and the menu buttons;
add/remove vehicle controls independently. Zero chargers uses `chargers: []`
and no charger buttons, displaying `0 W` and `0/0 charging`. No vehicle presence
condition belongs on the parent. Each menu has 18 ring cells; use nested menus
for larger groups. There is no device discovery or fixed installation count.

Permission overrides, association, unplug handling, charging sessions and
optimization belong to external automation. The example calls a request script
which must enforce that policy; it never directly toggles the permission switch.
A binary sensor cannot lock/unlock. Only if your integration exposes a real
`lock` entity and the service is supported should you replace its read-only
action with e.g. `action: perform-action` with `perform_action: lock.unlock`, targeting that real entity.

Complete anonymous example (also [examples/charging-hub.yaml](examples/charging-hub.yaml)):

```yaml
# Complete dashboard example. Merge templates into your dashboard's existing
# honeycomb_menu_templates and place the card in any view. All entities are placeholders.
honeycomb_menu_templates:
  charger_details:
    nested_expand: true
    empty_slots: hidden
    button_defaults:
      show_name: true
      show_label: true
      autoclose: false
      triggers_update: all
    buttons:
      - name: Session energy
        icon: mdi:lightning-bolt
        label: >-
          [[[ const s = states[variables.charger.energy];
              return s && !['unknown','unavailable'].includes(s.state)
                ? s.state + ' ' + (s.attributes.unit_of_measurement || '') : 'Unavailable'; ]]]
        tap_action:
          action: more-info
          entity: '[[[ return variables.charger.energy; ]]]'
      - name: Cable lock
        icon: mdi:lock
        label: >-
          [[[ const s = states[variables.charger.cable_lock]?.state;
              return s === 'on' ? 'Locked' : s === 'off' ? 'Unlocked' : 'Unavailable'; ]]]
        # A binary sensor reports status only. There is deliberately no lock command.
        tap_action:
          action: more-info
          entity: '[[[ return variables.charger.cable_lock; ]]]'
  vehicle_controls:
    # Reuse this exact template from a standalone launcher or a nested cube.
    nested_expand: true
    empty_slots: hidden
    button_defaults:
      autoclose: false
      show_name: true
      show_label: true
      triggers_update: all
    buttons:
      - name: Battery
        icon: mdi:battery
        entity: '[[[ return variables.vehicle.battery; ]]]'
        label: >-
          [[[ return entity && !['unknown','unavailable'].includes(entity.state)
              ? entity.state + ' %' : 'Unavailable'; ]]]
        tap_action:
          action: more-info
      - name: Vehicle details
        icon: mdi:car-electric
        entity: '[[[ return variables.vehicle.battery; ]]]'
        tap_action:
          action: more-info
views:
  - title: Charging
    cards:
      - type: custom:honeycomb-persistent-hub
        mode: hub
        size: 90
        icon: mdi:ev-station
        variables: &hub_variables
          chargers:
            - &charger_1
              power: sensor.charger_1_power
              charging: binary_sensor.charger_1_charging
              online: binary_sensor.charger_1_online
              fault: binary_sensor.charger_1_fault
              vehicle: sensor.charger_1_vehicle
              permission: switch.charger_1_charging_allowed
              energy: sensor.charger_1_session_energy
              cable_lock: binary_sensor.charger_1_cable_locked
              request_script: script.request_charger_1_permission
            - &charger_2
              power: sensor.charger_2_power
              charging: binary_sensor.charger_2_charging
              online: binary_sensor.charger_2_online
              fault: binary_sensor.charger_2_fault
              vehicle: sensor.charger_2_vehicle
              permission: switch.charger_2_charging_allowed
              energy: sensor.charger_2_session_energy
              cable_lock: binary_sensor.charger_2_cable_locked
              request_script: script.request_charger_2_permission
          permitted_color: '#4caf50'
          blocked_color: '#2196f3'
          fault_color: '#f44336'
          offline_color: '#6b7280'
        name: >-
          [[[ let watts = 0;
              for (const charger of variables.chargers) {
                const p = states[charger.power];
                if (!p || !['W','kW'].includes(p.attributes.unit_of_measurement) ||
                    p.state.trim() === '' || !Number.isFinite(Number(p.state))) return 'Unavailable';
                watts += Number(p.state) * (p.attributes.unit_of_measurement === 'kW' ? 1000 : 1);
              }
              return watts >= 1000 ? (watts / 1000).toFixed(1) + ' kW' : Math.round(watts) + ' W'; ]]]
        label: >-
          [[[ return variables.chargers.filter(c => states[c.charging]?.state === 'on').length
              + '/' + variables.chargers.length + ' charging'; ]]]
        colors:
          center: >-
            [[[ return variables.chargers.some(c => states[c.charging]?.state === 'on') ? '#174b32' : '#20262d'; ]]]
          inner_border: >-
            [[[ const cs = variables.chargers;
                if (cs.some(c => states[c.fault]?.state === 'on')) return variables.fault_color;
                if (!cs.length || cs.every(c => states[c.online]?.state !== 'on')) return variables.offline_color;
                return cs.some(c => states[c.permission]?.state === 'on') ? variables.permitted_color : variables.blocked_color; ]]]
          outer_border: '#34383d'
        border: {outer_width: 3, inner_width: 3}
        tap_action: {action: honeycomb-open-menu}
        hold_action: {action: honeycomb-open-menu}
        menu:
          empty_slots: hidden
          layout_envelope: outer
          variables: *hub_variables
          button_defaults:
            show_name: true
            show_label: true
            autoclose: false
            triggers_update: all
            border: {outer_width: 3, inner_width: 3}
            colors:
              center: '#20262d'
              outer_border: '#34383d'
              inner_border: >-
                [[[ const c = variables.charger;
                    if (!c || states[c.online]?.state !== 'on') return variables.offline_color;
                    if (states[c.fault]?.state === 'on') return variables.fault_color;
                    return states[c.permission]?.state === 'on' ? variables.permitted_color : variables.blocked_color; ]]]
            name: >-
              [[[ return entity && ['W','kW'].includes(entity.attributes.unit_of_measurement)
                  && entity.state.trim() !== '' && Number.isFinite(Number(entity.state))
                  ? entity.state + ' ' + entity.attributes.unit_of_measurement : 'Unavailable'; ]]]
            label: >-
              [[[ const v = states[variables.charger.vehicle]?.state;
                  return v && !['unknown','unavailable','none'].includes(v) ? v : 'No vehicle'; ]]]
            styles:
              grid:
                - grid-template-areas: '"i" "n" "l"'
                - grid-template-columns: 1fr
                - grid-template-rows: 38% 26% 22%
                - height: 100%
                - align-items: center
              icon:
                - width: 22px
                - align-self: end
              name:
                - font-size: 14px
                - align-self: center
              label:
                - font-size: 10px
                - align-self: start
            # The external script requests permission through your optimizer.
            # It must validate policy; this UI never toggles the permission switch.
            tap_action:
              action: perform-action
              perform_action: script.turn_on
              target:
                entity_id: '[[[ return variables.charger.request_script; ]]]'
            hold_action:
              action: honeycomb-open-nested
              honeycomb_nested_menu: {template: charger_details}
          buttons:
            - entity: sensor.charger_1_power
              icon: mdi:ev-station
              slot_mode: soft
              variables: {charger: *charger_1}
            - entity: sensor.charger_2_power
              icon: mdi:ev-station
              slot_mode: soft
              variables: {charger: *charger_2}
            - entity: sensor.vehicle_a_battery
              name: Vehicle A
              label: '[[[ return entity && !["unknown","unavailable"].includes(entity.state) ? entity.state + " %" : "Unavailable"; ]]]'
              icon: mdi:car-electric
              slot: 3
              slot_mode: priority
              variables:
                vehicle: {battery: sensor.vehicle_a_battery}
              visibility:
                - {condition: state, entity: binary_sensor.vehicle_a_present, state: 'on'}
              colors:
                inner_border: '[[[ return entity?.state === "unavailable" ? variables.offline_color : "#ab47bc"; ]]]'
              tap_action:
                action: honeycomb-open-nested
                honeycomb_nested_menu: {template: vehicle_controls}
              hold_action: {action: more-info}
            - entity: sensor.vehicle_b_battery
              name: Vehicle B
              label: '[[[ return entity && !["unknown","unavailable"].includes(entity.state) ? entity.state + " %" : "Unavailable"; ]]]'
              icon: mdi:car-electric
              slot: 4
              slot_mode: priority
              variables:
                vehicle: {battery: sensor.vehicle_b_battery}
              visibility:
                - {condition: state, entity: binary_sensor.vehicle_b_present, state: 'on'}
              colors:
                inner_border: '[[[ return entity?.state === "unavailable" ? variables.offline_color : "#ab47bc"; ]]]'
              tap_action:
                action: honeycomb-open-nested
                honeycomb_nested_menu: {template: vehicle_controls}
              hold_action: {action: more-info}
```

For deterministic configuration rules, also see [docs/AI_SETUP.md](docs/AI_SETUP.md).

## Development and validation

```sh
npm ci
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/validate-release.js
python -m pip install -r test/requirements.txt
python -m playwright install chromium
python test/browser-smoke.py --bundle honeycomb-menu-ng.js
```

CI uses Node.js 20. Browser tests use the real checksum-pinned button-card and a
simulated Home Assistant shell at desktop/mobile sizes. Optional screenshots:
`--evidence-dir /tmp/honeycomb-qa`. Real charger/device service behavior still
requires validation in Home Assistant. Tests do not contact devices.

Release metadata is in `package.json` and `release.json`. The release workflow
runs after a successful master build, compares a reproduced bundle with that
build's artifact, validates version/pre-release metadata, and uploads
`honeycomb-menu-ng.js` plus `SHA256SUMS.txt`. The v1.6 beta is a GitHub pre-release,
not a stable/latest release.

## Requirements

- current Home Assistant
- [custom:button-card](https://github.com/custom-cards/button-card)
- Honeycomb Menu NG installed as a Lovelace JavaScript module
- the Home Assistant entities you want to control

For Sonos features, use Home Assistant's official Sonos integration.

## Installation

### HACS

1. Open HACS.
2. Open **Custom repositories**.
3. Add:

~~~text
https://github.com/NicolaiTandrup/honeycomb-menu-ng
~~~

4. Select **Dashboard**.
5. Install **Honeycomb Menu NG**.
6. Reload the browser after installation/update.

The resource is normally:

~~~text
/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js
~~~

with resource type **JavaScript module**.

### Manual

Place `honeycomb-menu-ng.js` below `/config/www/` and add it as a Lovelace module:

~~~yaml
resources:
  - url: /local/honeycomb-menu-ng/honeycomb-menu-ng.js
    type: module
~~~

## Recommended start: Persistent Hub

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

  - type: sonos
    entity: media_player.living_room
    name: Sonos
    icon: mdi:speaker
    active_color: "#00bcd4"
~~~

### Interaction model

On the Hub base:

- **short tap Light** → toggle the light
- **short tap Sonos** → play/pause
- **long press** → enter that item's detailed module
- selecting a base cube may establish a new physical center
- after entering a module, the physical center is locked to **slot 0**
- nested menus may add an outer ring, but slot 0 does not move
- Back returns through the local module path to the base
- multiple Hubs can coexist independently

When `logo: auto` is enabled, the Honeycomb bee occupies slot 0 when the automatic layout has a free center. Set `logo: false` to allow a real Hub item to occupy slot 0.

## Built-in modules

| New configuration | Module | Main behavior |
|---|---|---|
| `type: light` | Light | toggle + brightness + palette + presets |
| `type: sonos` | Sonos | play/pause + group volume + Join + Radio + Browse |
| `type: media` + `module: media` | Generic media | play/pause + volume + more-info |
| `type: media` without `module` | Sonos compatibility | retained for older NG configs |

For **new configurations**, prefer explicit `type: sonos` for Sonos players. Legacy `type: media` continues to resolve to the Sonos-oriented module.

## Light module

Minimal:

~~~yaml
- type: light
  entity: light.living_room
  name: Living room
~~~

The detailed Light menu contains:

| Slot | Function |
|---:|---|
| 1 | 100% brightness |
| 2 | normal brightness preset |
| 3 | smart Color/White palette |
| 4 | standard color/Kelvin preset |
| 5 | -5% brightness |
| 6 | +5% brightness |

The palette is capability-aware:
- RGB/HS/XY lights receive a 12-color outer ring.
- color-temperature-only lights receive a 12-step warm-to-cool white outer ring.
- pure on/off lights show `On` / `Off` and do not open a detail level.
- dimmable lights show brightness while on and `Off` while off.
- palette expansion does **not** move the physical module center.

### Optional Light preset values

Preset values can live in writable numeric Home Assistant entities:

~~~yaml
- type: light
  entity: light.living_room
  name: Living room
  presets:
    brightness:
      entity: number.wall_switch_normal_brightness
    kelvin:
      entity: number.wall_switch_standard_kelvin
    color:
      hue_entity: number.wall_switch_standard_hue
      saturation_entity: number.wall_switch_standard_saturation
~~~

Supported writable helper domains in v1.5:
- `number.*` — including device-owned values such as writable numbers exposed by a Shelly relay/script
- `input_number.*` — Home Assistant helpers

The values therefore do **not** have to live inside Honeycomb. A physical wall switch/Shelly and Honeycomb can share the same normal brightness, Kelvin and color values.

Helper-backed presets:
- **tap** → apply stored value
- **hold** → store the light's current value

Without helpers NG uses apply-only defaults:
- brightness: **60%**
- standard white: **2700 K**

Full Light documentation: [docs/LIGHT_MODULE.md](docs/LIGHT_MODULE.md)

## Sonos module

Minimal:

~~~yaml
- type: sonos
  entity: media_player.living_room
  name: Sonos
  icon: mdi:speaker
  active_color: "#00bcd4"
~~~

The detailed Sonos menu contains:

| Slot | Function |
|---:|---|
| 1 | group-aware volume down |
| 2 | play/pause |
| 3 | Join |
| 4 | group-aware volume up |
| 5 | Radio favorites |
| 6 | Browse / more-info |

### Volume

No scripts are required for normal group volume. NG reads `group_members`:
- solo → selected player
- grouped → current group members

Legacy `group_volume_down_script` / `group_volume_up_script` overrides remain supported but normally should not be used in new configs.

### Radio favorites

The official Sonos integration provides `sensor.sonos_favorites` with favorite names and IDs. That entity is disabled by default in Home Assistant, so enable it on the Sonos integration before using Radio.

Basic Radio works with that sensor alone. If no artwork cache exists, NG shows radio icon + station name.

For logos/artwork add the optional **Sonos Favorites Cache**:
- [Sonos documentation](docs/SONOS_MODULE.md#optional-favorites-artwork-cache)
- [ready-to-copy cache YAML](examples/sonos-favorites-cache.yaml)

### Join

Join is optional and requires candidate members plus a toggle script:

~~~yaml
- type: sonos
  entity: media_player.living_room
  toggle_member_script: script.sonos_living_room_toggle_member

  members:
    - entity: media_player.kitchen
      name: Kitchen
    - entity: media_player.bathroom
      name: Bathroom
~~~

Ready-to-copy script: [examples/sonos-toggle-member.yaml](examples/sonos-toggle-member.yaml)

Full Sonos documentation: [docs/SONOS_MODULE.md](docs/SONOS_MODULE.md)

## Generic media

~~~yaml
- type: media
  module: media
  entity: media_player.office
  name: Office
~~~

Generic media gives play/pause, volume down/up and more-info without Sonos-specific Join/Radio behavior.

## Unavailable entities

If a Light or Media/Sonos entity disappears, for example because a remote Home Assistant connection or device is down, the native cube:
- becomes unavailable gray
- keeps its icon
- displays **Unavailable**
- automatically returns to live presentation when the entity comes back

## Hub slots

### Base without logo

| Items | Slots |
|---:|---|
| 1 | `0` |
| 2 | `2,3` |
| 3 | `2,3,0` |
| 4 | `1,2,0,3` |
| 5 | `1,2,0,3,4` |
| 6 | `1,2,3,4,5,6` |
| 7 | `0,1,2,3,4,5,6` |

### Base with logo

| Items | Slots |
|---:|---|
| 1 | `2` |
| 2 | `2,3` |
| 3 | `2,4,6` |
| 4 | `2,3,1,4` |
| 5 | `1,2,3,4,5` |
| 6 | `1,2,3,4,5,6` |
| 7 | logo hidden; real items use `0–6` |

Detailed modules use:
- slot `0`: physical center
- slots `1–6`: inner ring
- slots `7–18`: outer ring

## AI-assisted setup

For ChatGPT, Codex or another AI system building a configuration for someone who does not know Honeycomb syntax, use:

**[docs/AI_SETUP.md](docs/AI_SETUP.md)**

It is written as a deterministic implementation brief and defines:
- what to ask the user for
- which module type to choose
- canonical YAML shapes
- Light helper rules
- Sonos favorites/cache/grouping requirements
- defaults that must not be invented
- validation steps

## Classic popup menus

The original popup-style Honeycomb remains supported for existing and advanced dashboards using `fire-dom-event`.

~~~yaml
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
          action: perform-action
          perform_action: light.turn_on

      - icon: mdi:lightbulb-off-outline
        tap_action:
          action: perform-action
          perform_action: light.turn_off
~~~

Full classic reference, including center buttons, soft/hard slots, nested menus, XY Pad and templates:

**[docs/CLASSIC_MENU.md](docs/CLASSIC_MENU.md)**

## Documentation map

- [Light module](docs/LIGHT_MODULE.md)
- [Sonos module](docs/SONOS_MODULE.md)
- [AI setup specification](docs/AI_SETUP.md)
- [Classic popup reference](docs/CLASSIC_MENU.md)
- [Architecture / module contract](ARCHITECTURE.md)
- [Persistent Hub example](examples/persistent-hub.yaml)
- [Light presets example](examples/light-presets.yaml)
- [Sonos favorites cache example](examples/sonos-favorites-cache.yaml)
- [Sonos Join toggle script](examples/sonos-toggle-member.yaml)
- [GitHub Releases](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases)

## Updating

After HACS update:
1. reload the dashboard/browser
2. hard-refresh if old JavaScript is cached
3. confirm the installed version

## Development and architecture

Honeycomb Menu NG is a **modular monolith**:
- core owns navigation, geometry and anchor state
- renderers display declarative configs
- domain modules own Light/Media/Sonos behavior
- modules may expand rings but may not move the locked module center

Non-negotiable rule:

> Only selecting a module from the persistent Hub base may establish a new module center. Once inside that module, slot 0 never moves until navigation returns to the base.

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Origins, credits and license

Honeycomb Menu NG originated as a fork of [Sian-Lee-SA/honeycomb-menu](https://github.com/Sian-Lee-SA/honeycomb-menu), created by **Sian Croser**.

The NG codebase has expanded substantially, but portions of the original implementation remain. The project therefore retains the original attribution and GPLv3 license rather than treating the original project as idea-only inspiration.

Current NG development/maintenance: **Nicolai Tandrup**.

License: **GPLv3**. See [LICENSE](LICENSE).

Original author support link: [Buy Me A Coffee — Sian Lee](https://www.buymeacoffee.com/SianLee)
