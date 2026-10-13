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
- soft/hard slot placement and classic popup compatibility
- nested menus, templates and XY Pad
- modular core with isolated domain modules and regression tests
- one shared Honeycomb bee brand across Home Assistant and GitHub

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
