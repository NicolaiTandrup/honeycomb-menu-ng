<p align="right">
  <a href="https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/latest">
    <img alt="Latest stable version" src="https://img.shields.io/github/v/release/NicolaiTandrup/honeycomb-menu-ng?label=stable&amp;color=2ea44f">
  </a>
</p>

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

> **Latest stable: [v1.8.1](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.8.1).**
> This maintenance release preserves the owner-tested v1.8.0 runtime. NG includes
> the shared renderer, native Sonos Favorites, responsive sizing and hexagonal
> power-sensitive pulse. Official HACS validation has passed; catalog inclusion
> is still pending. Continue using the HACS custom-repository installation below.
> [Catalog submission review package](docs/HACS_CATALOG_SUBMISSION.md).

## v1.9.0 beta track

Latest published beta: [v1.9.0-beta.7](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.7).
The **unpublished beta.8 candidate** refines the generic, read-only Info Cube:
a centered hex constrained by the six natural inner notches, independent fill and
borders, and an optional source-colored connector. Surrounding cubes stay visible,
stationary and inactive. Wrapped/stacked/positioned text and live HA bindings
paginate at fixed readable sizes; more content never enlarges the hexagon.
Tap returns to the exact caller; 30 seconds closes the entire menu.
[Info Cube guide and examples](docs/INFO_CUBE.md) · [beta.8 review checklist](docs/V1_9_BETA8_REVIEW.md).
Beta.8 publication and stable promotion require separate owner approval.

## What you can build

- Persistent Hubs and individual Controls with consistent icons, labels and rings.
- Light brightness, Color/White palettes and reusable numeric presets.
- Media/Sonos play/pause, group-aware volume, favorites artwork and optional Join.
- Live Hub item visibility, reserved/preferred/free slots and stable placement.
- Nested menus, drag-select and classic popup compatibility, templates and XY Pad.

Car and Climate modules are not implemented. Charging automation remains external.
The generic Charger module below is **v1.9.0 beta track only**, not part of v1.8.1 stable.
Honeycomb calls configured HA actions; device automation belongs in Home Assistant.

Representative stable Light controls (synthetic HA fixtures; the v1.8.1 runtime
is unchanged from these verified v1.8.0 captures):

<img src="docs/assets/screenshots/stable-light.png" width="260" alt="Synthetic Light menu with brightness and preset controls">
<img src="docs/assets/screenshots/stable-kelvin.png" width="260" alt="Synthetic Light White palette with twelve filled Kelvin swatches">

[Capture provenance](docs/assets/screenshots/stable-provenance.json). Charger is not
part of v1.8.1 stable.

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

## Charger beta: complete dashboards

**v1.9.0 prerelease only.** A generic Charger/Easee module shares the same
82px renderer, gradients, sizing and power-sensitive hexagonal pulse. A Charging
Hub sums fresh verified power and physically connected cars; named chargers open
fixed detail menus. Permission and permanent-lock controls require deliberate taps
on verified HA switches. Opening/Back/state updates never issue charging commands.

- [Complete one-Easee dashboard](examples/charger-easee.yaml), with no vehicle feed.
- [Complete two-charger dashboard](examples/charger-multi.yaml), with optional
  external vehicle associations; it also works when that sensor is absent.
- [Element-only snippet for an existing floorplan](examples/charger-elements.yaml).
- [Installation, entity checklist, source-backed capabilities and safe HA tests](docs/CHARGER_MODULE.md).

Named chargers show vehicle/connection and fixed charger name in two rows; fresh
charging power stays visible beside the icon. Sonos launcher, promoted center and Radio favorite artwork share an inset safe
area that avoids the sloping hex edges, preserves aspect ratio and reserves labels. Dashboard editor previews own their overlays and cannot send actions.

All example IDs and screenshots are synthetic replacement points. Replace them
with your actual integration entities. HACS prereleases must be enabled and the
beta selected explicitly; v1.8.1 remains latest stable. No real hardware/Node-RED
changes were performed by synthetic validation. Car identification, schedules,
load balancing and optimization remain external; the Car module is future work.

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

Private local testing: [fixed development resource and build instructions](docs/DEVELOPMENT_BUILDS.md).
[Unpublished beta.6 scope, measured limitations and future-module boundaries](docs/BETA6_REVIEW.md).

### Light Hub names while OFF

In the unpublished v1.9.0-beta.6 candidate and its private development build, an OFF Light Hub launcher shows its
existing item `name` above `OFF`. Without a custom name it uses the HA
`friendly_name`, then the readable entity ID. A short name such as `A` is valid;
long names use the existing ellipsis. ON brightness/colors and submenu centers
keep their existing presentation. Unknown/unavailable lights say `Unavailable`,
never `OFF`. Existing explicit secondary-label overrides still take precedence.

### Light capability reference (beta.6 candidate)

Honeycomb reads HA `supported_color_modes`, never brands or names. Mode selection
on cube **3** is UI-only; slot 0 retains its normal name/value/Back presentation.

| Advertised capability | Controls | Palette launcher |
|---|---|---|
| `onoff` only | Toggle; no detail menu | None |
| `brightness` or fixed `white` | Brightness/presets | No Color/Kelvin commands |
| `color_temp` only | Brightness and White/Kelvin | White only; no Color hold |
| `hs`, `xy`, `rgb`, `rgbw` or `rgbww` only | Brightness and Color | Color only |
| Color plus `color_temp` | Brightness, Color and White/Kelvin | Tap current/viewed palette; hold opposite |
| Missing/inconsistent capabilities | Only verified controls | No invented capabilities |

For dual-mode lights, HA `color_mode` chooses the initial palette. Off/null uses
reliable same-entity session memory, otherwise a deterministic supported fallback.
A manual palette selection stays selected while browsing/zooming. White/Kelvin
requires real min/max bounds. Opening, switching, holding and Back send no light
command; a deliberate swatch tap applies it. Unknown/unavailable is never OFF.
[Full Light rules and short-name examples](docs/AI_SETUP.md#light-capability-and-off-name-rules-beta6-candidate).

### Bee version feedback and development updates

Tap the golden bee to see a short label such as **v1.9.0 beta 6 inside the same
hexagon** during the existing animation. It then returns to normal; reduced motion
suppresses flight while retaining feedback. Full dev revision stays in diagnostics,
not visual labels. [Permanent development resource, one-command installation and
cache troubleshooting](docs/DEVELOPMENT_BUILDS.md). This is an unpublished candidate,
not an announcement that beta.6 is available through HACS.

### Canonical visual baseline: Light module

**All modules use the existing Light module as their graphical baseline** — Sonos/Media, Climate, Car, Charger and future modules. Keep consistent 82px hex cube geometry, cube fill/inner/outer border layers, icon and label placement, typography, spacing and nested-menu navigation. Module-specific behavior and colors may differ, but modules must not introduce their own competing layout styles. Follow the [shared visual design contract](docs/TERMINOLOGY.md#shared-visual-design-contract--light-is-the-canonical-reference) and compare new module screens side by side against Light on desktop and mobile.

### Naming standard: menu rings vs cube borders

![Menu rings and the visual layers of one cube](docs/assets/menu-rings-vs-cube-borders.svg)

When reporting layouts or visual bugs, distinguish **menu geometry** (multiple
cells) from the **visual layers of one cube**:

| Term | Refers to |
|---|---|
| **Center cube** | Physical **slot 0** |
| **Inner menu ring** | Separate menu cubes in **slots 1–6** |
| **Outer menu ring** | Separate menu cubes in **slots 7–18** |
| **Cube fill / center fill** | Background **inside one cube** (`colors.center`) |
| **Inner border** | The **inner border of one cube** (`colors.inner_border`) |
| **Outer border** | The **outer border of one cube** (`colors.outer_border`) |
| **Persistent Hub launcher** | Always-visible dashboard launcher; **not automatically slot 0** |
| **Module launcher** | Cube in Hub menu opening a module |
| **Promoted center cube** | Selected module shown at slot 0 of its submenu |

Other agreed terms include **cube icon**, **cube artwork**, **cube label**,
**back cube**, **action cube**, and **favorite cube**.

**Avoid ambiguous references to an “inner ring” or “outer ring.”**
Use **menu ring** for the spatial arrangement of separate cubes and
**inner border / outer border** for the visual layers of one cube.

The complete layout glossary, role distinctions, examples and Classic-menu
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

In v1.9.0-beta.4, HA `supported_color_modes` selects available palettes. For a
Color + White light, tap slot 3 for its current `color_mode`; hold for the other
supported palette. Cube 3 names the displayed palette and its alternative (v1.9.0-beta.5).
Navigation sends no light command. White-only exposes no Color alternative;
fixed-white keeps brightness controls, and on/off-only keeps toggle only.


Preset values may be writable `number.*` entities on **another relay/device or
integration**, or `input_number.*` helpers. They need not belong to the Light.
Brightness is 0–100%, hue 0–360, saturation 0–100, Kelvin must suit the Light.
Tap applies; hold stores the current value. With no helpers the apply-only
fallbacks are 60% and 2700 K. On a color-capable Light, configured hue+saturation
take precedence over Kelvin for slot 4. [Light reference](docs/LIGHT_MODULE.md).

### Sonos and external HA setup

Group volume, room discovery/Join and native device Sleep need no helper scripts.
Radio still needs HA's **official native Sonos favorites entity** enabled; supply
its actual ID with `favorites_sensor` (default `sensor.sonos_favorites`).

**Breaking change in v1.8.0-beta.4:** supported read-only HA Browse Media is now
Sonos's default and only favorite-artwork/metadata provider. Remove
`favorites_cache_sensor` from dashboard YAML and remove the custom favorites-cache
template definition/refresh automation previously used only for Honeycomb. Keep
unrelated templates and the **native** favorites entity. No legacy sensor lookup,
autodetection, fallback or compatibility shim remains, even if the entity exists.
Browse errors safely show icon/text. No special artwork option or backend install.
The owner has already migrated and selected the v1.8.0 release track. Existing
tagged v1.7.1 remains unchanged; no legacy cache functionality is restored.

See [complete native examples, migration and DevTools proof](docs/SONOS_NATIVE_FAVORITES.md),
[Sonos reference](docs/SONOS_MODULE.md), [native Sleep](docs/SONOS_SLEEP_TIMER.md)
and [the complete card](examples/v1.7/sonos.yaml). `members` and a custom
[toggle script](examples/sonos-toggle-member.yaml) remain optional grouping overrides.

Sonos inner slots are **1 Radio,
2 Play/Pause, 3 Solo/Join, 4 Sleep, 5 Volume Down, 6 Volume Up**. Join shows live
room membership or an explicit setup/availability state. Radio's outer submenu
retains its ordering, artwork and playback, with new stable favorite accent rings.
A reliably identified favorite can provide native launcher artwork and playing
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
check native Browse Media responses/permissions and browser access to thumbnail URLs. Join needs its
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
Release retention remains **disabled**: the owner verified
`RELEASE_RETENTION_ENABLED=false`; the stable publisher forces its retention report
read-only. This preparation never changes settings or deletes Release records.
Before any future activation, review a fresh [retention dry-run](docs/RELEASE_RETENTION.md).
Deleting a Release record removes its uploaded assets; its Git tag and tagged
source remain. Tags, branches and source history are never cleanup targets.

Candidate reference: [v1.8 runtime namespace and mixed-install routing](docs/NG_RUNTIME.md).
Stable v1.7.1 remains published and unchanged until separate owner approval.

The v1.8.0 candidate includes [40% active depth and decorative logo gradients](docs/CUBE_PRESENTATION.md), [image-aligned `size: auto`](docs/FLOORPLAN_SIZING.md), and an opt-in [six-sided energy pulse](docs/ENERGY_WAVE.md). Inactive physical cubes remain solid. Numeric sizes and the omitted fixed-82 default stay unchanged.

### Floorplan sizing in v1.8.0-beta.6

For a persistent Hub or Control inside `picture-elements`, opt in with
`size: auto`. A floorplan displayed at 50% of its reference design width gets
41px cubes; 75% gets61.5px. Reference defaults to1536 CSS pixels; set
`auto_reference_width` to your intended normal display width. Existing numeric sizes stay fixed. No detectable image
means a harmless 82px fallback. See [complete copy/paste YAML, coordinate-frame
support and touch-size limits](docs/FLOORPLAN_SIZING.md).

The [synthetic charging-pulse demo](examples/energy-wave.yaml) uses the shared
renderer without a charger or service call. Charger, Climate and Car modules
remain future releases. [HACS listing readiness](docs/HACS_SUBMISSION.md) is
separate from installing this beta as a custom repository.

### v1.8.0-beta.6: corrected auto reference and power pulse speed

`size: auto` uses a stable **display/design reference width**, default1536 CSS
pixels. Use `auto_reference_width: 1500` for82px at a1500px displayed floorplan,
41px at750px. High-resolution source images no longer make cubes start tiny.
This corrects beta.5; numeric60/82 and omitted fixed82 remain. Read the
[complete floorplan YAML and migration](docs/FLOORPLAN_SIZING.md).

The [power-speed demo](examples/energy-wave-power.yaml) keeps true hexagonal
geometry and adds bounded power/fixed speed with phase-preserving smooth rate
changes. It requires no charger or service call. Existing energy_wave settings
retain their three-second cycle. [Rate settings and real sensor mapping](docs/ENERGY_WAVE.md).
The owner-approved40% and logo gradients, native Sonos and other modules remain.

### v1.8.0-beta.7: energy-wave contour color (#119)

The scoped beta.6 follow-up makes the pulse inherit the cube's resolved inner
border, including live Light/Sonos colors and user overrides. Optional
`energy_wave.color: '#00bfff'` changes only the contour. Existing gradients,
six-sided geometry, power/fixed speed and sizing stay unchanged. Try the
[complete synthetic green/blue demo](examples/energy-wave-color.yaml) and read
the [color and template rules](docs/ENERGY_WAVE.md#contour-color--v180-beta7).
This setting starts in beta.7; published beta.6 remains immutable.


### Anchored child menus (v1.9.0-beta.4)

Opening a promoted child keeps the selected cube at its exact physical position;
it becomes that submenu's slot 0. Back restores the previous anchor and layout.
This also applies to deeper Charger/generic menus and responsive floorplans.
Light palettes/zoom and Sonos Radio/Join/Sleep retain their existing navigation.
In v1.9.0-beta.5, every ordinary submenu depth defaults to the same neutral gray
fill and inner border as Light controls; the dark outer border remains unchanged.
Charger details use that shared gray rather than a black fill. Root Hub base
fill/status styling and meaningful module/center/palette colors are preserved. Explicit
`colors.inner_border` overrides still win; the promoted center keeps its selected
appearance. Root status colors and intentional Light/Sonos colors are preserved.
