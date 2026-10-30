# Generic Climate module — v1.10.0-beta.1

Cumulative with v1.9.0 stable, including its complete approved Info/Light/Sonos/Charger functionality. This beta is for real-HA testing; hardware acceptance remains pending. No Car, vendor API, helper or backend is installed.

Climate uses the same 82px renderer, inner/outer borders, gradients, actions and
numeric/automatic sizing as Light. A Hub item uses `type: climate`; a standalone
Control uses `module: climate`. Opening a view never operates the equipment.

## Quick start

Replace the synthetic entity with a real `climate.*` entity from HA States:

```yaml
type: custom:honeycomb-persistent-hub
logo: false
items:
  - type: climate
    entity: climate.room_a
    name: Room A
```

Standalone Control:

```yaml
type: custom:honeycomb-persistent-control
module: climate
entity: climate.room_a
name: Room A
size: 82
```

Complete validated files: [Hub](../examples/climate-hub.yaml),
[Control](../examples/climate-control.yaml),
[different-entity nested child](../examples/climate-nested.yaml),
[standalone parent Control](../examples/climate-nested-control.yaml).
Existing Hub visibility/placement and `size: auto` / `auto_reference_width` also
apply. Fixed numeric size and the omitted 82px default retain their meaning.

## Physical slots and navigation

Tap the launcher to open Climate. Holding also uses the existing module menu.
The center displays current temperature, target and an accessible HVAC status;
heating/cooling color reflects HA `hvac_action`, not a predicted physical result.
Idle/off/unavailable uses neutral fill. User `colors` overrides follow the shared
renderer precedence. No custom Climate geometry or CSS is introduced.

| Physical slot | Action |
| --- | --- |
| 0 | Current temperature / target or range; Back in a nested view. Hold for Low/High on a dual-target device. |
| 1 | Raise target by two native steps. |
| 2 | Open advertised HVAC modes; never guess a previous mode to turn on. |
| 3 | Open supported Modes / Presets / Fan / Swing categories. |
| 4 | Lower target by two native steps. |
| 5 | Lower target by one native step. |
| 6 | Raise target by one native step. |

With a 0.5°C step these are +1, −1, −0.5 and +0.5°C. With a 1°F step they are
+2, −2, −1 and +1°F. Reported `target_temp_step` wins; if absent the HA frontend's
0.5°C / 1°F fallback is used. Explicit invalid/null steps, unknown units, missing
targets/bounds, unavailable entities or missing services disable temperature writes.
No silent Celsius conversion or invented target is allowed. Adjustments align
to the minimum/step lattice, stay inside min/max and never cross a range boundary.

Dual-setpoint entities first open an explicit **Low / High** choice when +/− is
tapped. Selecting a bound opens its adjustment view. Each write sends the new
selected bound and the unchanged other bound. Back restores one meaningful level:
adjustment → Low/High → main → parent. Selection belongs to that menu frame; it
does not silently retarget another entity or become a single-target write.

Category slots are fixed: 1 HVAC mode, 2 Presets, 3 Fan, 4 Swing, 5 Horizontal
swing, 6 separate Defrost switch if verified. Unsupported categories are absent.
Choice menus preserve the advertised order and send exact values. Lists are
captured on opening to avoid moving buttons during gestures; removed choices
become inert immediately. Reopen the category to discover newly advertised values.
The main idle timeout is 8000 ms; children inherit it. An explicit
`persistent.menu.idle_timeout` overrides it. Passive state/discovery does not reset it.

## Capability contract

| Feature | Required HA data | Service |
| --- | --- | --- |
| Single target | `supported_features & 1`, `temperature`, unit/step/min/max | `climate.set_temperature` |
| Target range | `supported_features & 2`, low/high targets and range mode (or no single target capability/value) | `climate.set_temperature` with both bounds |
| HVAC mode | Nonempty `hvac_modes` | `climate.set_hvac_mode` |
| Preset | Feature 16 and nonempty `preset_modes` | `climate.set_preset_mode` |
| Fan | Feature 8 and nonempty `fan_modes` | `climate.set_fan_mode` |
| Swing | Feature 32 and nonempty `swing_modes` | `climate.set_swing_mode` |
| Horizontal swing | Feature 512 and nonempty `swing_horizontal_modes` | `climate.set_swing_horizontal_mode` |

The required service must also exist in `hass.services`. UI permission discovery
does not authorize a service: HA can still reject it. Humidity, auxiliary heat,
arbitrary vendor actions and automatic restore-mode/power guesses are not controls
in this initial candidate. They are not fabricated from flags alone.

## Defrost discovery and explicit mapping

Precedence is **explicit mapping → native exact `defrost` preset → verified
same-device switch**. Native presets use their advertised spelling; fuzzy labels
or entity names do not establish equivalence. An explicit switch removes the
duplicate native Defrost choice. A tap always sends one command to one entity.

Optional extra Climate keys:

| Key | Default | Meaning |
| --- | --- | --- |
| `defrost_entity` | omitted | User-verified `switch.*` mapping, including cross-device topology. |
| `discover` | `true` | Allow optional read-only entity-registry metadata lookup for an associated switch. |

Automatic lookup requires exactly one enabled switch with the same `device_id`,
integration platform and known config entry as the climate entity, plus exact
`translation_key: defrost`. Friendly names, areas, brand names, entity-ID substrings
and unknown cross-device relationships never authorize it. Registry metadata does
**not universally identify switch purpose**. Denied/unsupported lookup, missing
semantics or ambiguous candidates means no automatic action. Use an explicit
mapping only after confirming the real device association:

```yaml
type: custom:honeycomb-persistent-control
module: climate
entity: climate.room_a
name: Room A
defrost_entity: switch.room_a_defrost
discover: false
```

An explicitly mapped switch reports its own availability/on/off state and uses
`switch.turn_on` or `switch.turn_off`, never a fabricated climate preset. Native
presets and explicit mappings work without registry permission. Native Defrost
avoids the optional lookup. Lookup is connection-scoped/deduplicated, bounded by a
5-second timeout and refreshed on registry/reconnect events; no polling. Subscription
listeners are removed when the last Climate surface disconnects. Diagnostics expose
only capability/status categories, not raw registry payloads or private service errors.

## Commands, feedback and unavailable states

Commands recheck live capabilities, target identity, availability and menu identity
at the instant of the user action. One pending command per equipment context blocks
repeat writes (including its separate Defrost control). Feedback distinguishes
**Sending…**, **Awaiting HA**, **Command failed** and **Not confirmed**. A service
promise resolving is not device confirmation: the matching HA state must arrive.
After 15 seconds without confirmation, retry becomes a deliberate new user action;
there is no automatic retry. Errors produce a generic HA notification. A timed-out
operation may still finish later: check HA before retrying.

Closing a menu does not cancel a command already delivered to HA. A late result can
update the launcher but cannot reopen a view or run a follow-up command. HA restart
or browser reload rebuilds display from HA state, not a persisted desired target.
Read-only/display-only entities retain their summary and meaningful navigation;
unsupported controls remain visibly disabled. No per-cube polling is used, and
unrelated HA entities do not rerender Climate faces.

## Different-entity nested module

Reuse the existing `honeycomb-open-nested` action and descriptor. `module` and
`entity` select the child compiler; the shared controller owns its center and Back
stack. The child's entity explicitly wins over the parent's inherited entity.

```yaml
type: custom:honeycomb-persistent-hub
logo: false
items:
  - type: generic
    entity: sensor.value_a
    name: Parent A
    tap_action:
      action: honeycomb-open-nested
      honeycomb_nested_menu:
        module: climate
        entity: climate.room_b
        name: Room B
```

A standalone parent Control uses its existing numeric/automatic sizing and
actual dashboard anchor for the child. Its main center returns directly to that
Control; deeper category centers restore one menu level. Resizing an auto-sized
floorplan updates the child through the same numeric pipeline; removing its parent
disposes the owned overlay. No parent Light presets/colors are copied into a
different module child. Shared presentation overrides on the child descriptor
(e.g. `icon`, `colors`, `border`) are compiled by the existing common pipeline and
retained on both standalone and nested promoted centers.

Back returns to the parent with its original entity/state; Climate services target
only `climate.room_b`. Ordinary descriptors with explicit `buttons` retain their
existing behavior. This is a generic navigation boundary for future modules, not
a Car implementation. See the [complete deeper parent example](../examples/climate-nested.yaml).

## Validation and owner acceptance

Unit and desktop/mobile Chromium tests use synthetic HA services and registry
metadata. The development status records actual results and CI; tests do not claim
real HVAC validation. Before a Climate beta/stable approval, verify in real HA:

- Current/target temperatures, unit, reported increments and min/max for each device.
- HVAC/preset/fan/swing choices and selected state match HA; no unsupported commands.
- Range Low/High preserves the other bound; Back restores every level.
- Explicit/native/discovered Defrost targets the intended physical equipment once.
- Unavailable, rejected, pending and late state updates remain truthful.
- Different-entity child Back, mobile touch, floorplan resizing and idle close.
- Existing Light Hue/Kelvin, Sonos Radio/Join/Sleep and Charger behavior remains intact.

No merge, stable release, production HVAC/charging command or owner hardware
acceptance is implied by this review candidate.

## beta.2 function styling

Function cubes default to neutral `#202224` with `border.inner_width: 0` and
normal outer borders. The center keeps independent fill/borders and live status.
Explicit function `colors`, `border` and shared `button_defaults` remain available.
Controls, native temperature units, capability checks and exact service targets
are unchanged.
