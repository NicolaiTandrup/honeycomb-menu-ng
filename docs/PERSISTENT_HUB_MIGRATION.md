# Canonical persistent Hub: configuration and v1.x migration

Use `custom:honeycomb-persistent-hub` for new single controls and groups. Existing
`custom:honeycomb-persistent-control` dashboards remain supported without edits.
Both extend the same cube base; the compatibility element has no renderer or
separate gesture/action engine. There is no v1.6 removal or runtime deprecation warning.

## Audit: previous behavior and compatibility boundaries

| Surface | Before #72 | Canonical implementation / migration |
|---|---|---|
| Persistent control | Native face; `size` is cell width, default 72; default face inset | Supported adapter over shared cube. Explicit existing sizes/actions/menus stay valid |
| Persistent Hub | Inherited public control implementation; default width 82; cell faces | Public Hub directly uses shared base; no dependency on the compatibility adapter |
| Hub item list | Configured-count layouts, center 0 plus ring 1–6; first seven items only | Same small layouts, plus center 0 / ring 1–18; deterministic reservations/conflicts/overflow |
| Classic menu | `size` default 225 means historical menu extent; cube width `225 / 3.586 ≈ 62.74` | Meaning unchanged. Set `cube_size: 82` for an explicit 82 px cell |
| Ordinary cube | Wrapped button-card, historical skew/clip, host padding/baseline gap and fixed icon/style values | Legacy styling retained. Colors/border opt into #70 shared hex face and proportional content defaults |
| Native icon / labels | Icon 34% without text, 30% with status; text metrics differed from generic | Shared proportional defaults for layered wrapped content and native content; explicit styles override |
| Native nested menu | Separate envelope scan in launcher; first Hub promotion may move to selected cube | One menu envelope/placement engine. Preserve first Light/Media promotion; deeper levels lock anchor |
| Hub visibility | Ring conditions partly worked; center choice and item limit were static | Live center/ring allocation through #68 engine; no reflow during pointer gestures |
| Hidden open child | Menu could outlive its invoking control | Normal back unwinds to nearest valid ancestor, after gesture release/cancel |
| Tap / hold / double | Wrapped cards had advanced actions; native hold menu behavior | Shared Honeycomb navigation/custom actions; native double-tap and standard HA delegation added |

A cell width of 82 is always an 82 px layout box with height `82 × 1.1547`.
`face_mode: cell` fills it; `inset` intentionally draws the face at 91.34% of its
width (about 74.90 px at size 82). Compare equal face modes when comparing physical
faces. Existing control inset defaults and Hub cell defaults are retained.
Layered wrapped hosts no longer subtract menu padding from the face or add an
inline baseline gap; their measured width/height match native cells. Legacy
non-layered hosts retain their historical spacing and clipping.
Changing classic `size: 82` into an 82 px cube would break existing dashboards,
so its historical meaning is preserved explicitly rather than silently redefined.

## Single control: change the type, keep your configuration

```yaml
type: custom:honeycomb-persistent-hub
entity: light.example
size: 82
# Existing mode, colors, border, actions, presets and menu continue to work.
```

Omit `items` to use single-control mode. A provided `menu` opens on hold by
default; `tap_action`, `hold_action` and `double_tap_action` override independently.
`mode: hub` permits aggregate text without an entity (see the Charging Hub example).
If migrating an old control that omitted `size`, add `size: 72` to preserve its
old default; the recommended Hub component's default is 82. No migration is required.

## Groups: generic items use the same API as domain items

```yaml
type: custom:honeycomb-persistent-hub
size: 82
logo: auto
button_defaults:
  colors:
    center: '#20262d'
    inner_border: '#2196f3'
    # Omitted outer_border is independently neutral #34383d.
  border: {inner_width: 3, outer_width: 3}
items:
  - name: Charger 1
    entity: sensor.charger_1_power
    icon: mdi:ev-station
    slot: 1
    slot_mode: soft
    label: '[[[ return !entity || ["unknown","unavailable"].includes(entity.state) ? "Unavailable" : "Ready"; ]]]'
    tap_action:
      action: perform-action
      perform_action: script.turn_on
      target: {entity_id: script.request_charger_1_permission}
    hold_action:
      action: more-info
  - name: Vehicle A
    entity: sensor.vehicle_a_battery
    icon: mdi:car-electric
    slot: 1
    slot_mode: priority
    visibility:
      - {condition: state, entity: binary_sensor.vehicle_a_present, state: 'on'}
    colors:
      inner_border: '#ab47bc'
    tap_action:
      action: more-info
```

Generic entries need no `type`. Unregistered descriptive types such as `charger`
and `vehicle` fall back to generic; they do not create charging integrations.
Existing explicit Light, generic Media (`module: media`), Sonos and legacy Media
resolution stays unchanged. Modules contribute launchers, menu data and state
presentation to the same engine; future modules can register through the existing
module registry without introducing new layout, sizing or navigation systems.

Reuse `button_defaults` for Hub items (including native launchers), with per-item
overrides; `persistent` remains the highest-priority legacy native override.
Existing `menu.button_defaults` remains accepted. A Hub's own `colors` still style
its root/logo; they are not silently reinterpreted as item defaults. Generic
`styles`, `custom_fields`, templates and actions pass through to button-card.
Native module text can opt in with layered visuals or `show_name`; existing
Light brightness / Media volume presentation remains available.

The same `colors.{center,inner_border,outer_border}`, `border.{inner_width,outer_width}`
and `face_mode` work throughout. Omitted outer border in layered styling is
`#34383d`; it never implicitly copies center/inner. Explicit `auto` on native
module visuals retains its documented automatic mode. State-driven color and
width templates update live, including updates that reuse the same hass object.
Layered icon defaults are 30% with text / 34% without; primary text is 18% and
secondary 12% (status-only native text remains 16%). Explicit styles win.

## Slot and visibility contract

- Slot 0 is the Hub center. Slots 1–18 use the existing physical ring numbering.
- Default slot mode is `hard`, preserving small configured-count layouts.
  Hard claims reserve their slots even while hidden. Duplicate hard claims use
  the first declaration; omitted claims do not execute actions.
- Visible priority claims beat soft items; hard claims win. Displaced priority
  moves clockwise before soft/automatic placement. Hidden priority/soft consumes no space.
- A hard center reservation wins over priority/soft center requests. Displaced
  priority/soft center requests enter the ring at slot 1 using the same allocator.
- Existing `logo: auto` small layouts remain stable. An explicit slot 0 claim
  suppresses the automatic logo; a forced logo reserves center. Existing groups
  of seven or more use their center for an item, preserving that convention.
- There are at most 19 simultaneous item cells. Invalid slots are diagnosed and
  omitted; ring overflow omits excess controls deterministically in configuration
  order after hard/priority precedence. Use nested menus for larger groups.
- HA state, numeric_state, and/or/not conditions and legacy `show` reuse #68.
  Availability (`unknown`, `unavailable`, or missing state) never hides an item
  by itself. Use explicit conditions for that behavior.
- Placement waits until pointer release/cancel; hidden targets become immediately
  non-actionable. Newly hidden owners return through back history to the nearest
  valid ancestor. Responsive anchor changes update the saved base while an open
  module retains its locked anchor, so returning lands at the current base.
- Explicit `items: []` or zero visible children renders an accessible bee center
  with no entity action. This fallback is a launcher, not a hidden item or its action.

## Reuse existing menus and preserve actions

Keep complex vehicle menus in `honeycomb_menu_templates` and invoke them with
`honeycomb-open-nested` / `honeycomb_nested_menu: {template: vehicle_controls}`.
The native and button-card hosts share the same owned navigation. Templates keep
their own layout/defaults and receive calling variables; back returns in place.
Explicit `nested_expand: false` keeps replacement behavior and its history,
without an auto-open base appearing over the replacement.

Wrapped cards still delegate standard HA actions to button-card/Home Assistant.
Native cubes support the same Honeycomb custom/navigation actions, configurable
service calls and standard HA action delegation. Native double-tap waits 300 ms
before a single tap only when a double-tap action is configured; existing single
taps remain immediate otherwise. Enter/Space activates tap; hold defaults to menu
open unless configured. Disabled/hidden targets do not execute actions.

For classic menus that need a precise cube width:

```yaml
cube_size: 82
position_mode: anchored
buttons:
  - name: Vehicle A
    show_name: true
    face_mode: cell
    colors: {center: '#20262d', inner_border: '#ab47bc'}
    tap_action: {action: more-info, entity: sensor.vehicle_a_battery}
```

`cube_size` selects physical cube width and is retained through expanded nested
levels. Classic `size` remains the historical extent and applies when cube_size
is omitted. Persistent launchers map their measured cell width into this shared
boundary; `match_anchor_size: false` retains explicit independent menu sizing.

The complete [Charging Hub dashboard](../examples/charging-hub.yaml) now uses the
canonical single Hub API. Charging sessions, permission policy, unplug handling,
association and optimization remain external automation. Its request scripts must
enforce policy; the UI does not toggle permission switches or infer lock services.

## Regression evidence and delivery

Run `npm test`, `NODE_OPTIONS=--openssl-legacy-provider npm run build`,
`node scripts/validate-release.js`, and
`python test/browser-smoke.py --bundle honeycomb-menu-ng.js`.
Tests use synthetic entities and the real pinned button-card in a simulated HA
shell at desktop/mobile sizes. Actual integration/device actions need HA testing.
These changes ship in v1.6.0-beta.3 after successful merge, CI and release artifact
validation. This is a pre-release; v1.5.1 remains the latest stable release.
