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


## v1.6 conditional controls and Charging Hub contract

New Honeycomb configuration: `visibility: [condition, ...]` and the existing
`slot_mode` extended with value `priority`. Do not invent `charging_hub`,
`chargers`, `vehicle_entities`, `auto_disable`, `session`, or other Honeycomb keys.
`variables.chargers` in the example is a user-defined presentation variable,
not a Honeycomb schema field.

1. Start from the complete [charging-hub example](../examples/charging-hub.yaml).
2. Collect real power/active/permission/association entities for each charger.
   Power must report W or kW. Do not assume any manufacturer or automation stack.
3. Collect optional battery and presence entities for Vehicle A/B or other
   anonymously documented vehicles. Vehicles and chargers have independent counts.
4. Preserve the parent aggregate power `name` and active/total `label`; no presence
   condition belongs on the parent. Preserve an accessible close center.
5. Charger child `name` is power, `label` is associated vehicle, `colors.inner_border`
   is the shared permission/status ring. Use existing colors/border/actions.
6. Add/remove charger variable records and corresponding buttons together. Zero
   chargers uses an empty list and no charger buttons. Vehicle buttons can all
   be absent/hidden without disabling manual permission actions.
7. Use three brackets in the native-parent example. Add one escape layer only
   when an ancestor button-card must defer evaluation to a child.
8. For each ring button use `hard` to reserve a physical slot while hidden, `soft`
   to fill space dynamically, or `priority` to reclaim a preferred slot when shown.
   Hard beats priority; first declaration breaks ties; displaced priority claims
   move clockwise before soft/automatic buttons. At most 18 ring cells per menu.
9. Use existing nested menus for larger groups. Do not promise unlimited visible
   cells, auto-discovery, automatic vehicle association or charging automation.
10. HA-style condition lists support state/state_not (scalar/list, optional
    attribute), numeric_state (exclusive above/below, optional attribute/entity
    threshold), and/or/not with `conditions`. A list is AND; NOT negates its
    entire child-list conjunction. Omitted/empty visibility is true. Unsupported
    or malformed trees are false. Missing state entities read as `unknown`;
    invalid numeric states/bounds are false. `show` AND visibility both apply.
11. Core reevaluates against live frontend state about every 200 ms. Reflow waits
    until drag release/cancel; hidden targets are immediately non-actionable.
12. Preserve existing Light/Sonos actions, menu anchor ownership and classic
    `position`/`show`/template-stack behavior. Do not substitute disabled for hidden.
13. Keep public examples anonymous. Never publish installation-specific IDs,
    private names, locations, hosts or addresses. Existing public legal attribution
    and repository ownership links are not installation identifiers.

Only publish a new v1.6 beta after PR/master validation. Keep
`release.json.prerelease: true`; do not publish stable/latest on the user's behalf.


## Issue #70 shared presentation/navigation contract

- Use existing `colors.{center,inner_border,outer_border}`, `border.{inner_width,outer_width}`,
  `face_mode`, `name`, `label`, `variables`, `tap_action`, `hold_action`; no charging schema.
- Ordinary cubes opt into dual rings with colors/border. Native and ordinary cubes
  share geometry and update even when the hass object identity is unchanged.
- Native text/color templates use Honeycomb JS context. Wrapped text uses button-card
  context; unknown/missing state must yield readable fallback, never raw brackets.
- Use `honeycomb-open-nested` / `honeycomb_nested_menu: {template: ...}` for owned
  navigation. Default expand is true; explicit false keeps replacement semantics.
  Keep the physical anchor/size; honor layout_envelope and inherit_inner. Back must
  restore every level. Do not dispatch a second global overlay from a local Hub.
- Reuse dashboard honeycomb_menu_templates for existing vehicle menus without
  rebuilding buttons/defaults. Pass cube variables; template variables override.
- Parent native mode hub uses current aggregate W/kW name, active/total label and
  live center/rings. It has no vehicle visibility condition; zero chargers works.
- Charger tap calls a policy-checking external script, hold opens energy/lock details.
  Never infer that a binary sensor supports lock commands. Use lock services only
  with real integration support. Do not bypass an external optimizer.
- Green permitted, blue online/blocked, red fault, gray offline are example colors,
  not engine rules. Vehicle ring colors are independent.
- Validate unit and real button-card browser tests at desktop/mobile sizes, including
  Light/Sonos, drag, live state, native back/history and reusable template behavior.


## Canonical Hub configuration contract (#72)

Read [PERSISTENT_HUB_MIGRATION.md](PERSISTENT_HUB_MIGRATION.md) before migrating.

1. Recommend custom:honeycomb-persistent-hub for both a single control and groups.
   Omit items for single mode; items:[] is explicitly an empty group. Keep the
   legacy persistent-control type supported without edits or runtime warnings.
2. Hub/control size is cell width. Hub default 82 px, compatibility default 72 px. Native
   inset and Hub cell face defaults remain; choose equal face_mode for comparison.
   Classic size stays menu extent (cube=size/3.586). cube_size explicitly selects
   cell width and persists across expanded nested levels. Never reinterpret old size.
3. Hub button_defaults (also existing menu.button_defaults) supplies item defaults;
   per-item common fields override, then legacy persistent overrides. Hub colors
   styles its own root/logo. Generic styles/custom_fields/actions pass through.
4. No dedicated charger/vehicle module is required; missing/unregistered item type
   uses generic. Light, explicit generic Media, Sonos and legacy Media resolution
   remains unchanged. Modules supply data/presentation to the shared engine.
5. Slots 0–18 (center 0) reuse the #68 ring allocator. Default hard preserves legacy
   configured-count layouts; no seven-item truncation. Hard beats priority, then
   soft. Center hard/priority/soft follows the same ordering; displaced non-hard
   center claims enter the ring at slot 1. First hard declaration wins collisions.
   Overflow/invalid slots are diagnosed; do not rely on overflow for important actions.
6. Visibility uses #68 conditions and legacy show, reevaluated live. Availability
   alone does not hide. Hide actions immediately; defer reflow/back until pointer
   release/cancel. Hidden owners unwind to nearest surviving ancestor through back.
7. Zero visible items leaves an inert accessible bee launcher, not a hidden item's
   action. Auto logo yields to explicit center items; existing seven-item layouts
   consume center. Forced small-group logo reserves it.
8. Shared colors/border/face geometry and proportional icon/text metrics come from
   #70 internals. Layered outer defaults independently to #34383d, including unknown
   states. Preserve legacy appearances and explicit user style overrides.
9. Reuse honeycomb_menu_templates and native honeycomb-open-nested/back in the owning
   context. Respect nested_expand:false replacement history; do not auto-open a new
   base over a child. Responsive base movement does not move an open module anchor.
10. Tap/hold/double_tap, HA delegation, custom Honeycomb actions and drag use shared
    internals. Native double tap delays single tap 300 ms only when configured.
11. Migration/type changes do not authorize device automation changes. Permission,
    charging session policy, association and optimizer behavior remain external.
12. Keep release validation separate from configuration migration; never publish
    a stable release without explicit authorization.
