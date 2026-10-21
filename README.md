<p align="center">
  <img src="assets/honeycomb-menu-ng-logo.png" width="220" alt="Honeycomb Menu NG">
</p>

# Honeycomb Menu NG for Home Assistant

Compact hexagonal controls for dashboards, floorplans and wall tablets. A persistent
**Hub** groups devices; a standalone **Control** exposes one device. Tap for the
primary action and hold for Light, Media or Sonos controls. Both use the same
full-cell renderer, with **82 CSS px cube width** by default.

NG originated as a fork of [Sian Croser's honeycomb-menu](https://github.com/Sian-Lee-SA/honeycomb-menu)
and retains original code and attribution under [GPLv3](LICENSE). NG is maintained
by Nicolai Tandrup. [Original author support](https://www.buymeacoffee.com/SianLee).

> **v1.7.0 Stable.** The shared Hub/Control engine, dynamic visibility, stable
> slot allocation, Light navigation fixes and refreshed configuration guides are
> promoted from `restart/v1.5.1`, including PRs #77, #81, #84 and #88.
> [Download v1.7.0](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.7.0)
> or read the [release notes](RELEASE_NOTES.md). No v1.6 implementation or unfinished
> recursive palette, Car or Climate/Thermostat features (#85–#87) are included.

> **v1.7.1-beta.3 — cumulative owner-test beta.** Includes every tested Sonos
> beta.2 fix plus Light Color Zoom from isolated PR #94. One HACS bundle supplies
> both modules; v1.7.0 remains latest stable. [HA beta test guide](docs/V1_7_1_BETA.md)
> and [Color Zoom slot grid](docs/LIGHT_MODULE.md#recursive-color-zoom-issue-85-beta3).

> **v1.7.1-beta.7 target:** cumulative Sonos visual polish and clean White/Kelvin
> swatches with recursive bounded Kelvin zoom, based on published beta.6. Keeps
> native Sonos Sleep without helpers and the owner-tested Color zoom. Temperature
> values stay in accessible labels rather than on the swatch faces.
> [Light rules and limits](docs/LIGHT_MODULE.md#recursive-white--kelvin-zoom--issue-99-beta7)
> · [HA beta guide](docs/V1_7_1_BETA.md). Existing beta tags/assets and beta.5's private
> draft remain immutable. No master/stable promotion without owner HA approval.

## What you can build

- Persistent Hubs and individual Controls with consistent icons, labels and rings.
- Light brightness, Color/White palettes and reusable numeric presets.
- Media/Sonos play/pause, group-aware volume, favorites artwork and optional Join.
- Live Hub item visibility, reserved/preferred/free slots and stable placement.
- Nested menus, drag-select and classic popup compatibility, templates and XY Pad.

Car/Charger modules and charging automation are not implemented. Honeycomb calls
configured HA actions; device automation belongs in Home Assistant.

## Install and update

You need current Home Assistant, [custom:button-card](https://github.com/custom-cards/button-card)
and the entities you want to control. Install button-card and its JavaScript module
resource first. Sonos features use HA's official Sonos integration.

**HACS:** add `https://github.com/NicolaiTandrup/honeycomb-menu-ng` under Custom
repositories, category **Dashboard**, then install. Select the intended version;
a beta requires showing prereleases. The normal module resource is
`/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js`. Check Dashboard resources for
one entry, type **JavaScript module**; avoid loading HACS and manual copies together.

**Manual:** download the bundle from the intended
[GitHub release](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases), place it
at `/config/www/honeycomb-menu-ng/honeycomb-menu-ng.js`, then register this resource
(in the Dashboard resources UI, or under `lovelace:` in YAML-managed configuration):

```yaml
resources:
  - url: /local/honeycomb-menu-ng/honeycomb-menu-ng.js
    type: module
```

After updating, reload the browser/app and hard-refresh if cached JavaScript persists.
Check the installed release and resource URL before changing YAML. Installing a stable
release does not make newer beta-only options available.

## Start in 60 seconds

Add a Manual card and paste this complete [Hub example](examples/v1.7/hub.yaml).
Replace the synthetic IDs with entities from HA Developer Tools → States.

```yaml
type: custom:honeycomb-persistent-hub
name: Hub A
size: 82
logo: auto
items:
  - type: light
    entity: light.zone_a
    name: Light A
  - type: sonos
    entity: media_player.player_a
    name: Player A
```

Tap Light to toggle; tap Player to play/pause. Hold either to open its module.
A dimmable Light has brightness and a capability-aware palette. A Light explicitly
reporting `supported_color_modes: [onoff]` toggles and shows On/Off without a detail
menu. Missing attributes during unavailability do not establish on/off-only capability.

## Layout model

These are **physical slots**, viewed face-on. The figure is checked against the
current coordinate tables, not inferred from button order.

<!-- layout-diagram:start -->
![Honeycomb physical slots: center 0; inner 1 left, 2 upper-left, 3 upper-right, 4 right, 5 lower-right, 6 lower-left; outer 7–18 as verified in the AI slot map](docs/assets/layout-slots.svg)
<!-- layout-diagram:end -->

| Area | Physical slots | Meaning |
|---|---|---|
| Center | `0` | Hub item or bee; selected module's locked center |
| Inner ring | `1–6` | Six immediate neighbors |
| Outer / second ring | `7–18` | Twelve neighbors outside the inner ring |
| Further Hub rings | `19–36`, `37–60`, `61–90`, `91–126`, `127–168`, `169–216` | Expand on demand |

### Naming standard: menu rings vs cube borders

When reporting layouts or visual bugs, distinguish **menu geometry** (multiple
cells) from the **visual layers of one cube**:

| Danish | English | Refers to |
|---|---|---|
| **Centerkube** | Center cube | Physical **slot 0** |
| **Indre menuring** | Inner menu ring | Separate menu cubes in **slots 1–6** |
| **Ydre menuring** | Outer menu ring | Separate menu cubes in **slots 7–18** |
| **Kubefyld** | Cube fill / center fill | Background **inside one cube** (`colors.center`) |
| **Inderkant** | Inner border | The **inner border of one cube** (`colors.inner_border`) |
| **Yderkant** | Outer border | The **outer border of one cube** (`colors.outer_border`) |
| **Hub-kube** | Persistent Hub launcher | Always-visible dashboard launcher; **not automatically slot 0** |
| **Modulkube** | Module launcher | Cube in Hub menu opening a module |
| **Promoveret centerkube** | Promoted center cube | Selected module shown at slot 0 of its submenu |

Other agreed terms include **kubeikon** (cube icon), **kubelogo**
(cube artwork), **kubetekst** (cube label), **tilbagekube** (back cube),
**funktionskube** (action cube), and **favoritkube** (favorite cube).

**Never use unqualified “inderring” or “yderring” for a cube border.**
Use **menuring** for the spatial arrangement of separate cubes and
**inderkant/yderkant** for the visual layers of one cube.

The complete bilingual glossary, role distinctions, examples and Classic-menu
exceptions are in **[Layout terminology](docs/TERMINOLOGY.md)**.

The current Hub renderer supports **217 physical positions including center**.
Configured items are not capped at 7 or 18: items beyond physical capacity remain
tracked and report overflow. Large layouts may clip near viewport edges; there is
no paging or automatic shrinking.

**Classic popups:** their ring `slot` numbers also start at 1, but their center is
configured separately with `center_button`, not `slot: 0`. Legacy `position: 0`
means the first ring position. Classic `size` defaults to **225** and describes
the scene extent; it is not the Hub/Control 82 px cell width. Classic automatic
layouts use the inner ring for 1–6 buttons, outer for 7–12, and both for 13–18;
hard targets can activate additional rings. See the [classic reference](docs/CLASSIC_MENU.md).

### Automatic Hub layouts and branding

Without explicit dynamic placement, these established layouts remain unchanged.
Columns list slots in configuration order; count means configured non-null items,
including currently hidden items.

<!-- auto-slots:start -->
| Items | Without logo | With logo |
|---:|---|---|
| 1 | `0` | `2` |
| 2 | `2,3` | `2,3` |
| 3 | `2,3,0` | `2,4,6` |
| 4 | `1,2,0,3` | `2,3,1,4` |
| 5 | `1,2,0,3,4` | `1,2,3,4,5` |
| 6 | `1,2,3,4,5,6` | `1,2,3,4,5,6` |
| 7 | `0,1,2,3,4,5,6` | logo suppressed; same slots |
<!-- auto-slots:end -->

`logo: auto` shows the bee for **2–6 configured items**, leaving one item at
center and suppressing branding for 7+. `logo: true` also shows it for one item.
An explicit center-slot request takes precedence over branding. `logo: false`
removes the bee and makes slot 0 available to ordinary items; it does not force
every automatic layout to fill the center. Beyond seven, automatic items use
`0,1,2,…`.

### Placement and live visibility

| Mode | Visible | Hidden | Collision rule |
|---|---|---|---|
| `hard` (default) | Exact slot, explicit or established automatic position | Slot stays reserved | First configured hard item wins |
| `priority` | Preferred explicit slot; fallback when occupied | Releases slot | Hard wins; all priority preferred claims precede fallback placement |
| `soft` | Free slot; keeps its current free position | Releases slot | Runs after priority; no needless compaction |

Equal claims use configuration order. Priority reclaims its preferred slot when
it becomes visible. Unaffected free positions remain stable. Structural changes
wait while the Hub's module/nested menus, pointer/touch/drag or delayed tap are
active; the latest state is applied together after returning to base/finishing the
gesture. Labels and entity presentation continue updating. Multiple Hubs are independent.

This complete [dynamic example](examples/v1.7/dynamic-hub.yaml) keeps a Light at
center, prefers slot 2 for Person A when home, and uses free slots for other items:

```yaml
type: custom:honeycomb-persistent-hub
name: Dynamic Hub A
size: 82
logo: false
items:
  - type: light
    entity: light.zone_a
    slot: 0
    slot_mode: hard
  - type: generic
    entity: person.person_a
    name: Person A
    slot: 2
    slot_mode: priority
    visibility:
      - condition: state
        entity: person.person_a
        state: home
    tap_action:
      action: more-info
  - type: generic
    entity: light.zone_b
    name: Bright light B
    slot_mode: soft
    visibility:
      - condition: numeric_state
        entity: light.zone_b
        attribute: brightness
        above: 127
        below: 256
    tap_action:
      action: more-info
  - type: media
    module: media
    entity: media_player.player_b
    slot_mode: soft
    visibility:
      condition: state
      entity: person.person_a
      state: not_home
```

HA Light `brightness` is **0–255**, not percent; numeric bounds are exclusive.
`not_home` is HA's literal away state; named zones have their own states.
Visibility supports state/attribute equality or exclusion, numeric thresholds,
AND, OR and NOT. A top-level list is AND; omitted/empty visibility is true.
Only a final true result shows an item. Missing/indeterminate values hide unless
another logical branch determines the result; unknown/unavailable state strings
can be explicitly matched. Legacy `show` is an additional AND gate.
These keys belong to **Hub items**, not standalone Control or submenu buttons.
[Exact conditions, truth tables and collision rules](docs/V1_7_PHASE2.md).

## Choose a module or Control

| Hub item | Standalone Control | Features |
|---|---|---|
| `type: light` | `module: light` | Toggle, brightness, Color/White, presets |
| `type: sonos` | `module: sonos` | Play/pause, group volume, Join, Radio, Sleep (beta.6 candidate) |
| `type: media` + `module: media` | `module: media` | Generic media without Sonos menus |
| `type: generic` | `module: generic` | Custom entity/actions, no domain menu by default |

Bare Hub `type: media` retains its older **Sonos** meaning. Use explicit selection
for new configurations. Core owns rendering, geometry and navigation; modules
provide behavior. There is no separate Control visual engine.

For a single device, use this [Control example with presets](examples/v1.7/control-light.yaml):

```yaml
type: custom:honeycomb-persistent-control
module: light
entity: light.zone_a
name: Light A
size: 82
presets:
  brightness:
    entity: number.relay_a_brightness
  kelvin:
    entity: number.relay_a_kelvin
  color:
    hue_entity: input_number.preset_a_hue
    saturation_entity: input_number.preset_a_saturation
```

**Control migration:** use `module` and the shared appearance/action keys. Replace
older standalone examples using inset sizing or `menu_size`; `size: 82` now means
cell width. Control has no Hub `items` list or item-level dynamic allocation.
[Detailed migration and supported keys](docs/AI_SETUP.md#migration-and-limits).

### Light presets

Light detail slots are: **1** 100%, **2** brightness preset, **3** Color/White
(or passive Light for brightness-only), **4** standard color/Kelvin,
**5** −5%, **6** +5%. Color or White palettes add slots 7–18 without moving the center cube. In beta.7,
White swatches are solid temperature colors: tap applies; hold refines without
calling HA. Back restores the prior palette, and full close resets it. Native
Kelvin bounds and integer-precision limits apply; no new YAML options are needed.

Preset values may be writable `number.*` entities on **another relay/device or
integration**, or `input_number.*` helpers. They need not belong to the Light.
Brightness is 0–100%, hue 0–360, saturation 0–100, Kelvin must suit the Light.
Tap applies; hold stores the current value. With no helpers the apply-only
fallbacks are 60% and 2700 K. On a color-capable Light, configured hue+saturation
take precedence over Kelvin for slot 4. [Light reference](docs/LIGHT_MODULE.md).

### Sonos and external HA setup

Group volume works natively using `group_members`; no volume scripts are required.
Radio needs the official Sonos favorites entity enabled in HA (often disabled by
default). Supply its actual ID via `favorites_sensor`. An optional external
[cache sensor](examples/sonos-favorites-cache.yaml) adds artwork; it does not supply
playback IDs. The current beta discovers Sonos rooms and groups natively;
`members` and an external [toggle script](examples/sonos-toggle-member.yaml) remain
optional overrides. Slot 4 opens native Sleep choices using official
[Sonos device actions](docs/SONOS_SLEEP_TIMER.md), with no helper/script setup. Browse is an explicit custom navigation
choice rather than a default Sonos control.
The [complete Sonos example](examples/v1.7/sonos.yaml) and
[AI prerequisite checklist](docs/AI_SETUP.md#external-home-assistant-prerequisites)
explain setup, data shapes, includes and refresh. [Sonos reference](docs/SONOS_MODULE.md).

Issue #90 development patch (target v1.7.1): Sonos inner slots become **1 Radio,
2 Play/Pause, 3 Solo/Join, 4 Sleep, 5 Volume Down, 6 Volume Up**. Join shows live
room membership or an explicit setup/availability state. Radio's outer submenu
retains its ordering, artwork and playback, with new stable favorite accent rings.
A reliably identified favorite can provide cached launcher artwork and playing
color; pause/stop remains neutral. See [matching limits and styling precedence](docs/SONOS_MODULE.md#v171-beta-station-accents-and-launcher-artwork).

## Actions, appearance and navigation

- Tap, hold and optional double tap use HA action objects (`toggle`, `more-info`,
  `perform-action`, `navigate`, `url`, `fire-dom-event`, `none`). Configured action
  overrides replace the module's action. Default hold enters its menu.
- Drag-select and nested back navigation are preserved. Selecting a base item may
  establish a module center; after entry its physical slot 0 stays fixed until base.
- Missing/unavailable devices retain their icon and show gray **Unavailable**;
  recovery updates presentation. Visibility can separately hide them.
- `colors.center`, `colors.inner_border`, `colors.outer_border` control fill and
  ring colors; `border.inner_width` / `outer_width` control ring widths. Use shared
  ring keys rather than rectangular CSS borders. Modules provide live active color.
- `styles`, labels and templates support advanced customization. See the
  [AI key reference](docs/AI_SETUP.md#configuration-contract) and
  [classic popup/template/XY Pad reference](docs/CLASSIC_MENU.md).

## Help, reference and development

If nothing renders, check both module resources, version/cache, browser errors and
entity IDs. For missing favorites check the official sensor; for missing artwork
check cache data/refresh and browser access to thumbnail URLs. Join needs its
script and candidate list. A hidden hard item intentionally leaves a hole.

- [Versioned AI setup guide and six tested YAML examples](docs/AI_SETUP.md)
- [Light](docs/LIGHT_MODULE.md) · [Sonos](docs/SONOS_MODULE.md) · [Classic popups](docs/CLASSIC_MENU.md)
- [Phase 1 / Issue #78](docs/V1_7_PHASE1.md) · [Phase 2 conditions and allocation](docs/V1_7_PHASE2.md)
- [Architecture and invariants](ARCHITECTURE.md) · [Release notes](RELEASE_NOTES.md)
- [Documentation audit and validation commands](docs/DOCUMENTATION.md)

For local development: `npm ci`, `npm test`, then
`NODE_OPTIONS=--openssl-legacy-provider npm run build` (webpack 4).
Browser and docs checks run in CI with pinned test dependencies. Configuration
examples are checked in synthetic HA on desktop/mobile; real devices still need
installation-time validation.

Stable releases use the exact tested master commit, matching metadata, tag, bundle,
checksums and HACS asset. See the [publication and verification guide](docs/RELEASING.md).
Release retention is **disabled for v1.7.0**: the owner verified
`RELEASE_RETENTION_ENABLED=false`, and this publication's retention report is forced
read-only. All v0/v1 stable releases and v1.7 prereleases are retained. Before any
future activation, review a fresh [retention dry-run](docs/RELEASE_RETENTION.md).
Deleting a Release record removes its uploaded assets; its Git tag and tagged
source remain. Tags, branches and source history are never cleanup targets.
