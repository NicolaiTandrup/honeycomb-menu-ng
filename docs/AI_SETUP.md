# AI configuration guide

**SUPPORTED AS OF v1.7.1 Stable.** Includes the v1.7.0 shared Hub/Control and
visibility/placement architecture plus all owner-approved cumulative beta.8
functionality (`c1cdd390bed1c1acfc22b314807ce63050e43248`, Issue #102). Sonos slots,
native no-helper Sleep, Radio artwork/cache compatibility, sibling navigation and
recursive Light Hue/Kelvin zoom described in the versioned sections below are now
stable. Historical beta headings identify when a capability was introduced; they
are not a request to install an obsolete beta. Package/release metadata is `1.7.1`,
stable. Car/Charger, Climate and unfinished #92/#93/#87/#86 remain excluded; #83
retention is independent and disabled. No runtime code from v1.6 is imported.

This is a configuration contract for an assistant helping an HA user. Examples
are synthetic test fixtures, **not discovered entities**. Never silently substitute
invented entities, integrations, scripts, helpers or URLs into a user's installation.
Ask for actual IDs or omit optional features. Public examples must remain synthetic.

## Decision procedure

1. Confirm the installed Honeycomb version and both JavaScript module resources
   (Honeycomb and custom:button-card). Ask for entity IDs from HA States, not names
   guessed from areas. Inspect relevant state attributes/capabilities.
2. Choose **Hub** for several items, **Control** for one standalone device, or
   **classic popup** when requested by an existing dashboard's `fire-dom-event` action.
3. Choose Light for `light.*`; Sonos for official Sonos `media_player.*`; explicit
   Media for other players; Generic for custom entity/action behavior. Do not infer
   Sonos merely from a `media_player` domain. Hub bare `type: media` is a legacy Sonos
   alias; use `type: media` with `module: media` for generic media.
4. Request optional IDs only when needed: writable numeric preset values for Light;
   enabled favorites sensor for Radio; cache sensor for artwork; Join script and
   candidate players for grouping. Native group volume needs no scripts.
5. For a Hub, choose branding and placement. Prefer established automatic hard
   positions for static layouts. Use explicit hard slots for reservations, priority
   with an explicit preferred slot, or soft for available positions.
6. Add supported visibility conditions only to Hub items. Inspect dependency states
   and numeric units. Configure explicit HA action objects where defaults do not fit.
7. Emit one complete card, then list **external HA prerequisites** separately. Validate
   it using the checklist below; do not claim optional HA configuration already exists.

## Configuration contract

The table is the recommended public surface, not a schema for arbitrary button-card
keys. Unknown YAML fields may be ignored by runtime code: acceptance by `setConfig`
is not proof that a feature exists. Do not invent keys such as `visible_when`,
`placement`, `center_slot`, `menu_size`, `chargers` or `onoff`.

| Boundary | Keys and types |
|---|---|
| Hub root | `type: custom:honeycomb-persistent-hub`; `name` string; `size` number (default 82 CSS px); `logo: auto/true/false` (default auto); `items` list; `auto_open` boolean (default true). Optional `menu.button_defaults` supplies menu button defaults. |
| Hub item | `type: light/sonos/media/generic` (legacy `hue` supported); optional explicit `module: light/media/sonos/generic`; `entity` literal ID; shared keys below; domain options below; `slot` integer 0–216; `slot_mode: hard/priority/soft`; `visibility` condition object/list; legacy `show` value/template. |
| Control root | `type: custom:honeycomb-persistent-control`; explicit `module`; `entity`; `size` (default 82); shared keys and domain options. No Hub `items`, `logo`, `visibility` or placement contract. |
| Shared presentation | `name`, `label`, `icon` strings/templates; `show_name`, `show_label`, `show_icon` booleans/templates; `background`, `foreground`; `colors`; `border`; `styles`; `variables`; `custom_fields`; `interactive`; `off`; `active_color`; `show_brightness`, `show_volume`. |
| Shared interaction | `tap_action`, `hold_action`, `double_tap_action` action objects; `hold_time` ms (default 500, minimum 250); `autoclose`; `audio`. Optional `menu` overrides the module menu; advanced Hub `persistent` overrides its compiled launcher. |
| Light options | `presets.brightness: {entity, default?}`; `presets.kelvin: {entity, default?}`; `presets.color: {hue_entity, saturation_entity}`. See units and capability precedence below. |
| Sonos options | `active_color`; `favorites_sensor`; `favorites_cache_sensor`; `toggle_member_script`; `members: [{entity, name?, icon?}]`. Sleep in beta.6 needs no configuration or helpers. Legacy `group_volume_down_script` / `group_volume_up_script` are supported but unnecessary for native group volume. |

Presentation keys pass through the shared engine; `styles` uses button-card-style
lists under `card`, `icon`, `name`, `label`, `grid`. Domain defaults can hide names
or labels: set `show_name` / `show_label` when adding them. `colors` accepts
`center`, `inner_border`, `outer_border`, `unavailable`; `'auto'` uses module state.
`border.inner_width` / `outer_width` are numeric ring widths (default 3).
`off.center_color` / `preview_color` affect Light off presentation. The ring geometry
is shared; rectangular CSS borders do not define its inner/outer rings.
`show_brightness: when_on` and `show_volume: when_playing` are module defaults;
`never` suppresses those indicators.

Use HA actions: `none`, `toggle`, `more-info`, `perform-action` with
`perform_action`, `data`, `target`; `navigate` with `navigation_path`; `url` with
`url_path`; `fire-dom-event` with `honeycomb_menu` for classic/nested configurations.
Legacy `call-service` with `service`, `service_data`/`data`, `target` is retained.
An explicit action replaces the default action object. Default tap is Light toggle,
Media/Sonos play/pause, Generic toggle (provide a suitable entity or override).
Default hold opens an available module; generic without a menu uses more-info.
Double tap is optional (300 ms recognition window). Preserve drag-select and avoid
replacing a held launcher's action while navigation is active.

Implementation references: [shared compilation](../src/core/cube-config.js),
[renderer/actions](../src/cube-element.js), [module registry](../src/modules/index.js),
[Hub](../src/honeycomb-persistent-hub.js). For advanced classic keys use the
[classic reference](CLASSIC_MENU.md), not guesses from other cards.

## Geometry, allocation and live updates

Machine-readable face-on slot map (rows from top to bottom; no rotation):
<!-- physical-slot-map:start -->
```text
        [ 9]    [10]    [11]
    [ 8]    [ 2]    [ 3]    [12]
[ 7]    [ 1]    [ 0]    [ 4]    [13]
    [18]    [ 6]    [ 5]    [14]
        [17]    [16]    [15]
```
<!-- physical-slot-map:end -->

Use the verified [physical slot diagram and automatic tables](../README.md#layout-model).
Center is Hub slot 0, inner 1–6, outer 7–18; further rings end at 216. The current
renderer has 217 physical positions. There is no 7/18-item configuration limit:
overflowing configured identities/dependencies are retained with diagnostics.

`logo: auto` brands 2–6 configured non-null items, not the currently visible count.
One item uses center; seven or more suppress branding. `logo: true` also brands
one item. Any explicit slot 0 request wins over branding. `logo: false` frees
center for ordinary items; it need not appear in every automatic layout.
Three automatic items remain `2,3,0` without logo, `2,4,6` with logo.

Allocation order is **hard > priority > soft**:

1. Hard reserves its exact slot even hidden; first configured hard claimant wins.
2. Visible priorities claim all available preferred slots before **any** fallback.
   Configuration order breaks ties; blocked priorities retain a free previous
   fallback or take a free cell. Hidden priority releases its claim.
3. Soft retains free previous positions, then fills free cells. No automatic
   compaction. Higher-ranked fallback prefers holes over moving unaffected soft cells.

Omitted `slot_mode` means hard. Omitted hard `slot` uses the established automatic
layout, not a densely packed dynamic layout. Priority requires an explicit preferred
slot; soft without one starts from the lowest allowed free cell. Invalid modes and missing priority slots are configuration errors.
Non-integer/negative/out-of-range slots, collisions and physical overflow report
diagnostics; losing hard items do not silently
wrap or move. Do not use duplicate hard slots to implement alternatives.

Structural changes wait while that Hub's module or descendant menu is open, while
pointer/touch/drag is active, and during a delayed tap. Return to base/close/finish
interaction commits the latest desired structure atomically at an on-demand frame.
The original gesture target remains the action target. State labels/colors still
update. Other Hubs are independent. Dependencies use scalar snapshots (including
attributes and numeric threshold entities), so in-place HA state mutations work.
Unchanged unrelated states do not require condition reevaluation or reallocation;
arbitrary JS presentation/`show` templates update conservatively on HA delivery.
No plugin polling timer is needed for declarative visibility.

## Visibility condition subset

`visibility` belongs **only on Hub items**. Omitted or `[]` is true; a top-level
list is AND. A single condition object is accepted. Unsupported operators/fields
or malformed structures throw an error with a configuration path.

| Condition | Required fields | Optional fields |
|---|---|---|
| `state` | `condition: state`, one literal `entity` or `entity_id`, exactly one `state` or `state_not` | `attribute` nonempty string |
| `numeric_state` | `condition: numeric_state`, one literal `entity` or `entity_id`, `above` and/or `below` | `attribute` nonempty string |
| `and`, `or`, `not` | `condition`, `conditions` nonempty list of supported conditions | None |

`state` / `state_not` takes a string or nonempty string list. Quote HA values such
as `"on"` and `"off"`. Numeric bounds are finite numbers, numeric strings, or literal
threshold entity IDs whose current states must be numeric. Bounds are **exclusive**.
A Light's HA brightness attribute is **0–255**; its preset helper is **0–100%**.

Evaluation is three-valued: true, false, indeterminate. Only final true is visible.
AND: false dominates; otherwise indeterminate propagates. OR: true dominates;
otherwise indeterminate propagates. NOT negates the **AND of its child list**,
not the OR; NOT indeterminate stays indeterminate. Missing entities/attributes,
empty/non-numeric numbers, or unknown/unavailable parent state for attribute/numeric
reads are indeterminate. A primary unknown/unavailable state string resolves only
when explicitly present in `state` / `state_not`; otherwise it is indeterminate.
For example `state_not: [unknown, unavailable]` explicitly excludes both.

Legacy `show` is an **additional AND gate**, with item `show` taking precedence
over `persistent.show`. False-like strings (`false`, `0`, empty, `undefined`) hide.
A failing template hides and reports `show-error`. Classic submenu `show` retains
opening-time behavior; it is not this live declarative contract. Do not put
`visibility` or priority allocation on Control roots or classic/nested buttons.
See [truth tables and migration](V1_7_PHASE2.md).

## External Home Assistant prerequisites

These are HA entities/configuration outside Honeycomb, not extra dashboard keys.
Run HA's configuration check and reload the relevant integration/template/script
(or restart as required) after adapting the recipes. The automated docs tests parse
and exercise synthetic data; they do not run an HA server or discover actual devices.

### Light preset values on another device

For `control-light.yaml` below, provide these writable values first:

| Synthetic ID | Unit/range | Purpose |
|---|---|---|
| `number.relay_a_brightness` | 0–100 percent | Normal brightness |
| `number.relay_a_kelvin` | Kelvin within Light's capability range | Standard white |
| `input_number.preset_a_hue` | 0–360 degrees | Standard hue |
| `input_number.preset_a_saturation` | 0–100 percent | Standard saturation |

All four accept either writable `number.*` (including a separate relay/device or
integration) **or** `input_number.*`. Helpers need not share the Light's integration.
If creating HA numeric helpers, use these units/ranges, then collect their actual
entity IDs. Honeycomb does not create helpers or integration-owned numbers.
Tap a preset to apply; hold to store the Light's current value using that helper
domain's `set_value`. Storing brightness converts HA 0–255 into rounded percent.

No helpers are needed for normal operation: apply-only defaults are 60% and 2700 K.
The standard slot chooses HS when color-capable with both hue/saturation values,
otherwise a supported Kelvin preset, otherwise 2700 K. It does not show separate
HS and Kelvin preset buttons simultaneously. Palette is 12 hues for color-capable
Lights or 12 Kelvin steps for temperature-only Lights. Brightness-only keeps a
passive slot 3; explicitly `[onoff]` has no detail menu. Never infer `[onoff]` just
from missing attributes on an unavailable entity. [Light details](LIGHT_MODULE.md).

### Sonos Radio and artwork cache

1. Install/configure official HA Sonos. Enable its favorites entity (usually
   disabled by default); collect its **actual** ID for `favorites_sensor`.
   Default compatibility IDs are `sensor.sonos_favorites` and
   `sensor.sonos_favorites_cache`, but examples use explicit synthetic IDs.
2. Base favorites **must** expose `attributes.items` as a map of favorite ID to
   title. Order is the map's key order; at most 12 entries are displayed.
3. For artwork only, adapt [the HA cache recipe](../examples/sonos-favorites-cache.yaml):
   replace every `media_player.player_a` with one real reference Sonos player and
   `sensor.favorites_a` with the enabled favorites entity. The recipe calls the
   existing HA `media_player.browse_media` action, with `favorites_folder` /
   `object.item.audioItem.audioBroadcast`, capturing its response. This is external
   HA Browse Media functionality; verify the action/response on the actual player.
4. The trigger-based template creates **Favorites Cache A**. Confirm its registered
   entity ID; `sensor.favorites_cache_a` in the example is not a promise of registry
   naming. Set `favorites_cache_sensor` to the actual ID.

Data contract (illustrative JSON **state attributes**, not card YAML):

```json
{
  "sensor.favorites_a": {
    "items": {"favorite_a": "Station A", "favorite_b": "Station B"}
  },
  "sensor.favorites_cache_a": {
    "items": [{"title": "Station A", "media_content_id": "favorite_a",
      "media_content_type": "favorite_item_id", "thumbnail": ""}]
  }
}
```

The cache's `items` is a **list of dictionaries**. Artwork matches by exact
`media_content_id`, never by display title. A nonempty `thumbnail` replaces the
radio icon/text with artwork. Use the real thumbnail returned by HA, accessible
to the dashboard browser; do not invent an artwork service/URL. Empty/missing
cache falls back to icon/title. Playback always uses the **base favorites ID**
with `media_player.play_media`, type `favorite_item_id`; cache alone cannot populate
Radio or supply playback IDs.

Beta.2's optional cache recipe configures eligible `cache_players` once, in order;
they must share a favorites library. It chooses the first available player on
refresh, including HA start, favorites changes, the manual refresh event and the
15-minute fallback. No source/base value means skip; `source_player` and
`cache_version` provide diagnostics. Existing four-field templates stay supported.
Radio count/list changes require reopening; current artwork/state updates live.

Install the complete recipe under `template:` in `configuration.yaml`. If already
using `template: !include templates.yaml`, copy only the `- triggers:` list item
and below into that include. Merge lists; do not duplicate top-level `template:` keys.

### Sonos Join and native volume

Native volume reads `group_members` and targets current members (solo: selected
player). Do **not** generate volume scripts unless the user requests a custom override.

As of **v1.7.1-beta.2**, absent `members` means discover actual Sonos registry
platform entries on Join open (frontend `hass.entities` or HA display-registry WS).
Do not guess players from names/areas/domains. An explicit list, including `[]`,
overrides discovery. Candidate order is stable; automatic order is entity-ID order;
selected player, coordinator and duplicates are excluded. Existing outer ring has
12 candidates. No polling or structural candidate movement while open.

Native grouping requires GROUPING (524288) on selected coordinator and candidate,
and available `media_player.join`/`unjoin` services. Join targets coordinator with
`group_members: [candidate]`; unjoin targets candidate. A selected follower uses
its reciprocally confirmed leader. Other groups, unavailable players and unknown
group state are read-only. Live HA membership is authoritative; failures notify.
A configured `toggle_member_script` remains an optional authoritative override
with its existing `member`-only data contract and selected-coordinator restriction.
The [external script recipe](../examples/sonos-toggle-member.yaml) remains valid.

Empty/setup labels distinguish missing registry metadata, no other Sonos, invalid
manual entries, unsupported grouping, unavailable native services and script errors.
Do not silently insert scripts, fake success or regroup unrelated players.

Sonos inner slots: 1 Radio, 2 Play/Pause, 3 Solo/Join, 4 Sleep, 5 Volume Down,
6 Volume Up. Hub legacy `type: media` still selects Sonos; explicit `module: media`
keeps generic Media behavior. Slot 4 opens the native Sonos device Sleep Timer in beta.6;
see [setup](SONOS_SLEEP_TIMER.md). Custom explicit navigation can still use
`/media-browser/media_player.player_a`; it is not a default Sonos action. See
[Sonos details](SONOS_MODULE.md).

## Canonical complete cards

All IDs and names below are synthetic. Every YAML block is parsed and loaded in
the production bundle with synthetic HA state on desktop/mobile. The linked files
are the same examples; external device/service behavior still requires HA validation.

### Basic Hub

[examples/v1.7/hub.yaml](../examples/v1.7/hub.yaml)

<!-- example:hub.yaml -->

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

### Dynamic Hub

[examples/v1.7/dynamic-hub.yaml](../examples/v1.7/dynamic-hub.yaml)

<!-- example:dynamic-hub.yaml -->

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

### Standalone Control Light

[examples/v1.7/control-light.yaml](../examples/v1.7/control-light.yaml)

<!-- example:control-light.yaml -->

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

### Sonos with external prerequisites

[examples/v1.7/sonos.yaml](../examples/v1.7/sonos.yaml)

<!-- example:sonos.yaml -->

```yaml
type: custom:honeycomb-persistent-hub
name: Audio Hub A
size: 82
logo: false
items:
  - type: sonos
    entity: media_player.player_a
    name: Player A
    active_color: "#00bcd4"
    favorites_sensor: sensor.favorites_a
    favorites_cache_sensor: sensor.favorites_cache_a
    toggle_member_script: script.player_a_toggle_member
    members:
      - entity: media_player.player_b
        name: Player B
      - entity: media_player.player_c
        name: Player C
```

### Non-dimmable Light

[examples/v1.7/onoff-light.yaml](../examples/v1.7/onoff-light.yaml)

<!-- example:onoff-light.yaml -->

```yaml
# Prerequisite: the real HA entity explicitly reports supported_color_modes: [onoff].
# This is an HA state attribute, not a Honeycomb configuration key.
type: custom:honeycomb-persistent-control
module: light
entity: light.switch_a
name: Switch A
size: 82
```

### Classic popup

[examples/v1.7/classic-popup.yaml](../examples/v1.7/classic-popup.yaml)

<!-- example:classic-popup.yaml -->

```yaml
type: button
entity: light.zone_a
name: Light A
hold_action:
  action: fire-dom-event
  honeycomb_menu:
    entity: light.zone_a
    size: 225
    empty_slots: hidden
    center_button:
      icon: mdi:lightbulb
      tap_action:
        action: more-info
    buttons:
      - slot: 1
        slot_mode: hard
        icon: mdi:lightbulb-on
        tap_action:
          action: perform-action
          perform_action: light.turn_on
          target:
            entity_id: light.zone_a
      - slot: 4
        slot_mode: hard
        icon: mdi:lightbulb-off
        tap_action:
          action: perform-action
          perform_action: light.turn_off
          target:
            entity_id: light.zone_a
```

For the non-dimmable example, HA must report `supported_color_modes: [onoff]` on
`light.switch_a`; that attribute is not part of the emitted card YAML. The Sonos
example requires the separately installed sensor/cache/script above. Omit optional
cache/Join keys and external configuration when the user does not need them.

## Migration and limits

- Old static Hub YAML retains hard automatic layout, legacy media→Sonos selection,
  nested navigation and Light presets. No v1.6 implementation is used.
- Rewrite older standalone Control configuration to the explicit `module` form
  above. Remove `items`/Hub placement fields and obsolete `menu_size` advice;
  use shared presentation/action keys. `size: 82` is full cell width, so older inset
  sizing can look different. Legacy mode aliases are internal compatibility paths,
  not the recommended schema for new configuration.
- Classic `size` is scene extent (default 225); its center is `center_button`.
  Classic `slot: 1` / legacy `position: 0` are first **ring** cell, not Hub center.
  Classic soft placement is ring-relative legacy behavior, not live Hub allocation.
- Current limitations: only the documented condition subset (no Jinja, time,
  template, device or HA automation-condition engine in `visibility`); physical
  capacity 217; no automatic shrinking/paging; large anchored menus can clip near
  viewport edges; structural visibility intentionally defers during interaction.
  Arbitrary JS templates are conservative; Radio/Join each have 12 outer choices.
- Future Car/Charger modules are not implemented. Do not emit their configuration,
  charging sessions, unplug rules or optimization. Those automations are external.

## Validation and troubleshooting checklist

1. Confirm installed version/resources; refresh browser cache. Check browser console
   and HA logs. Unknown custom element usually means missing/stale module resources.
2. Verify every real entity ID, capability, numeric helper domain/range and optional
   script/sensor in HA States. Validate/reload external HA configuration first.
3. Tap Light/Media/Sonos; hold to detail; back through palette/Radio/Join to base.
   Center remains fixed inside a module. Returned Light launcher stays visible.
4. Apply/store presets (both numeric domains); test color and temperature-only
   Lights and explicit on/off-only On/Off behavior. Unavailable stays gray and
   recovers; no missing capability should be mistaken for on/off-only.
5. Test solo/group volume, favorites playback, cache thumbnail matching and Join
   data. Empty Radio means check base favorites; no artwork means inspect cache
   refresh, exact IDs and browser URL access. Reopen Radio after list changes.
6. Test home/away, attribute and threshold changes; exact numeric bounds hide.
   Unknown/missing dependencies hide unless a logical branch decides otherwise.
   Hidden hard holes are expected. Check diagnostics for collisions/overflow.
7. During a menu, touch/drag or delayed tap, change HA state: presentation stays
   live, structural placement waits, and release does not trigger a replacement item.
   Check multiple Hubs, edit mode and narrow viewports in the user's actual dashboard.

Core owns geometry/navigation/interaction. Modules provide menus and state models.
Hub base selection may establish a module center; deeper menus may expand rings
but never move that center. [Architecture](../ARCHITECTURE.md),
[Phase 1](V1_7_PHASE1.md), [Issue #78](ISSUE_78.md), [Phase 2](V1_7_PHASE2.md),
[documentation validation commands](DOCUMENTATION.md).

## v1.7.1-beta.2 development additions (PR #91)

The corrected Sonos inner slots/Join behavior above remain. Radio outer slots
7–18 add only deterministic Light-wheel inner accents. Preserve favorite order,
IDs, existing cache compatibility, artwork and actions. Up to 12 IDs have distinct colors stable
under reordering; larger sets can share hues.

Beta.4 matches exact favorite IDs or unique optional
cached `uri`/`playback_uri`. Validated Sonos radio schemes can instead use a
unique `media_channel` match against the favorite-map name OR cached `title`
(type `favorite_item_id`); map/cache names need not agree. Normalize only NFC,
whitespace and case. A live channel `Station Alpha · programme text` or
`Station Alpha • programme text` can match its station prefix only when that
name uniquely agrees with both map and typed cache title. Require the spaced
separator/nonempty programme; reject conflicts with full labels, duplicate
entries, arbitrary suffix/diacritic inference, substrings, HTTP channels and
`media_title`. Valid artwork
remains required. Four-field caches work unchanged. Reciprocal groups use the
coordinator's identity. Recognized Sonos artwork may replace a navigation arrow;
center Back action remains unchanged on deeper menus.
Call the inspected cube's `getPresentationDiagnostics()` for privacy-safe
state/counts/reasons (no identifiers/URLs or automatic logging). See
[diagnostic procedure and evidence gate](SONOS_MODULE.md#station-recognition-diagnostics).
The owner's sanitized FV/stream + station/programme tuple is covered by regressions;
real hardware remains the owner's beta acceptance gate.
No stream mapping is learned merely from successful service completion.

Known logo/accent may remain on pause/stop only while metadata still matches;
center fill becomes neutral `off.center_color`, default `#202224`. Explicit playing
colors beat station accent, legacy `active_color` fallback and defaults; unavailable state stays
unavailable. Custom background image and `show_icon: false` win over automatic
artwork. See [Sonos precedence](SONOS_MODULE.md#v171-beta-station-accents-and-launcher-artwork).

PR #91 stays unmerged. Beta installation requires an actual GitHub prerelease
and owner real-HA testing; synthetic CI is insufficient approval for stable.

## Light Color Zoom — cumulative v1.7.1-beta.3

This independent Light review change is based on stable master v1.7.0. Publish it
only as cumulative **v1.7.1-beta.3** after integrating all tested Sonos beta.2 code;
never imply module patches install side-by-side. No new public YAML key is needed.
In Color outer slots 7–18, tap applies the exact current HS color; hold (default
500 ms) or Shift+Enter/Shift+Space refines without HA service calls. Preserve the
selected physical slot/HS exactly. Interpolate towards current clockwise neighbor
in five clockwise steps and current counterclockwise neighbor in six reverse
steps. Shortest circular hue, positive 180° tie, linear saturation, exact copied
endpoints, unrounded intermediates. See the verified [slot grid](LIGHT_MODULE.md#recursive-color-zoom-issue-85-beta3).
Back restores each complete palette via the owning menu's stack. Full close or
Escape/reopen resets. HA updates preserve open history. Never use the Color interpolator for Kelvin,
static presets, Sonos or generic Media; preserve gestures, nested anchor and size.

## v1.7.1-beta.6 — published native Sonos Sleep baseline

Version-gated: published beta.6, not stable v1.7.1. Keep beta.4 recognition,
owner-tested recursive Light Zoom, beta.5 logo scaling/Join Back and
[canonical terminology](TERMINOLOGY.md). Sonos slots: 1 Radio, 2 Play/Pause,
3 Join, **4 Sleep**, 5 Down, 6 Up. Sleep choices occupy slots 7–12:
15/30/45/60/90 min and Cancel/OFF. Inner controls and center Back remain.

**No `sleep_timer` YAML key, HA helper, script, automation or package is required.**
Use the official Sonos integration's `sonos.set_sleep_timer` with `sleep_time`
integer seconds (900/1800/2700/3600/5400, maximum 7200) and
`sonos.clear_sleep_timer` with empty data. Explicit target is the freshly validated
selected group's coordinator, including follower selections. Reject inconsistent
or unavailable groups. Missing native service disables its choice. Setting needs
playback; paused/stopped cancellation is allowed. Preserve all optional Radio cache
and grouping-script compatibility; generic Media/Light do not acquire Sleep keys.

The Sonos device owns expiry. **Do not implement browser expiry, invent timer
attributes/readback APIs, or promise group-change automatic cancellation.**
Local acknowledgements produce an explicitly **Est. N min** display, never a
confirmed device status. Unknown after reload, reconnect or observed group change
means unknown, not OFF. A clear acknowledgement says Cancel sent; estimate elapsed
or request failure says Check device. Other clients/external changes are not
synchronized by the supported HA API. No automatic actions occur on local timeout,
reconnect or group changes. The native timer should survive browser closure and
HA restart while the speaker remains running; physical verification is required.
See [exact limitations, supported API audit and HA checklist](SONOS_SLEEP_TIMER.md).

The beta.5 helper-backed tag/draft are frozen historical artifacts, not this
implementation. Do not publish or rewrite them. Published beta.6 points to `214443460f827c05f977a8aaeefe48f71a7216b6`.
Keep that tag and all its assets immutable; beta.7 must pass fresh publisher gates
with its own unused tag and exact tested branch head, without a master merge.


## v1.7.1-beta.7 — cumulative Sonos visuals and isolated Kelvin zoom

Baseline is the exact published beta.6 commit
`214443460f827c05f977a8aaeefe48f71a7216b6`. Preserve native Sonos Sleep (no HA
helpers), Radio identity/cache/actions, Join Back, recursive Color zoom, presets,
dynamic placement, [terminology](TERMINOLOGY.md) and shared 82 CSS-px geometry.
Sonos function icons/text inherit ordinary Light's shared hierarchy; no forced
three-row preset grid. Station artwork stays compact at 62% of usable fill in
paused/idle states, with neutral gray fill and the station-colored inner border.
Playing artwork reserves label space and sits slightly lower. Explicit styling
precedence, aspect ratio, fallback and favorite recognition rules remain unchanged.

White on temperature-only Lights now supports its own Kelvin refinement. Native
HA prerequisites: `supported_color_modes` includes `color_temp`; numeric positive
`min_color_temp_kelvin <= max_color_temp_kelvin`; at least one integer in that
range. Missing/invalid values disable White with an explanation, not guessed bounds.
No `min_kelvin`, `zoom`, step or helper YAML keys are introduced. Use the standard
[module Control example](../examples/v1.7/kelvin-light.yaml).

<!-- example:kelvin-light.yaml -->
```yaml
type: custom:honeycomb-persistent-control
module: light
entity: light.white_a
```


Physical slots 7–18 contain only Kelvin-derived RGB cube fill and existing borders:
`show_icon`, `show_name`, `show_label` are false on generated swatches. Exact Kelvin
is retained in their nonvisual accessible name and action. No dots or visible codes.
Short tap sends exactly one `light.turn_on` with `color_temp_kelvin` to the selected
entity after fresh native range validation; stale/unavailable samples do not call HA.
Hold or Shift+Enter/Shift+Space never sends a Light service. Initial integer samples
are `round(min + (max-min)*i/11)`. Refined integer step is
`max(1,floor(minimumAdjacentGap/2))`; values are
`selectedKelvin+(i-selectedIndex)*step`. Keep the anchor's exact physical slot/value,
strictly increasing samples and both endpoints inside the previous/native range.
No wrapping or Hue logic. A repeated identical/duplicate-producing refinement is a
no-op. Back restores each exact snapshot; full close/reopen rereads native bounds.
State updates must not rewrite the open palette or history. Keyboard Escape also
closes at the precision limit.

HA does not advertise a standard native Kelvin step. Use 1 K client precision;
hardware may round more coarsely. An original range with fewer than twelve integer
values cannot fill twelve positions distinctly: retain only legal sampled values
with repetitions, disable zoom and document the limit. Never invent extra Kelvin
values or promise infinite precision. See [exact rules and limitations](LIGHT_MODULE.md#recursive-white--kelvin-zoom--issue-99-beta7).

#90/#97/#99 remain open until owner HA validation is documented. Stable/master
promotion needs explicit owner approval after real HA tests. #83/#92/#93/#87/#86
are excluded. Never alter existing beta tags/assets or the unpublished beta.5 draft.


## v1.7.1-beta.8 — Sonos sibling navigation and idle-close

Cumulative source baseline: published beta.7 commit
`737a13c8f1a1020db18e14325a40240708dc2706`; all beta.7 behavior above is retained.
Radio (slot 1), Join (slot 3) and Sleep (slot 4) are siblings, not successive depths.
Opening or reopening any sibling replaces the active sibling; Back once returns to
Sonos main. A real child menu still pushes one meaningful level. Hue/Kelvin zoom
history and selected physical slots remain unchanged. Internal navigation markers
are implementation details, not new user configuration keys.

The three submenus inherit the main module's `idle_timeout` (8000 ms default).
Use the existing `persistent.menu.idle_timeout` override for a different positive
duration, or explicit `0` to disable. Do not inject `idle_timeout: 0` into generated
Sonos submenus. Idle returns a persistent Hub to its base; a standalone Control
closes its overlay. Only user interaction resets this timer; HA state updates,
async discovery, Sleep estimates/acknowledgements and rerenders do not.

Do not confuse UI idle-close with native Sonos Sleep Timer: closing the menu does
not cancel the device timer. No helper/script setup is added. Preserve Radio
order/cache/recognition, Join discovery/grouping, both Light palettes, presets,
dynamic Hub allocation and the 82 CSS-px geometry. Existing beta tags/assets and
the unpublished beta.5 draft remain immutable; no stable/master merge without
explicit owner approval after real HA validation. #90/#97/#99 remain open pending
that validation; #83/#92/#93/#87/#86 are excluded.

## v1.8 beta runtime identity

The namespace milestone preserves persistent Hub/Control YAML. See [NG runtime API](NG_RUNTIME.md) for explicit mixed-install popup routing and JavaScript API migration. This is beta-only; stable v1.7.1 remains the functional baseline.

For v1.8 beta.2 only, see the [shared presentation contract](CUBE_PRESENTATION.md) and [validated example](../examples/presentation-light.yaml). Existing explicit center colors remain solid; no new domain actions are added.
