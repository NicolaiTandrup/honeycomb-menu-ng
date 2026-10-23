# Charger — v1.9.0-beta.3

**Prerelease only. Latest stable remains v1.8.1.** No real Easee hardware or
owner Node-RED flow was changed or exercised by development tests. This module
is a frontend for existing HA entities; HA/Node-RED retains scheduling, price
optimization, load balancing, session management and vehicle identification.
Car and Climate modules are not implemented.

## Install and copy a complete dashboard

1. In HACS, keep the custom repository `NicolaiTandrup/honeycomb-menu-ng`, type
   **Dashboard**. Enable/show prereleases in its version selector, choose
   **v1.9.0-beta.3**, and download. Normal stable installs remain on v1.8.1.
2. Keep one JavaScript module resource at
   `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js`. Keep the existing
   custom:button-card dependency/resource for other Honeycomb functionality.
   Do not load a second manual/old Honeycomb NG bundle alongside it.
3. Reload the HA frontend/app; hard-refresh cached resources if necessary.
   Verify the loaded JS starts with `/*! Honeycomb Menu NG v1.9.0-beta.3 */`.
4. Copy [the complete one-Easee dashboard](../examples/charger-easee.yaml), or
   [the two-charger dashboard](../examples/charger-multi.yaml), into a new
   dashboard's raw configuration editor. These include `views`, `picture-elements`,
   a neutral inline image and a real persistent Hub. No extra image file is needed.
5. Replace **every synthetic HA entity ID** with the actual integration entities
   collected below. YAML anchors share each charger mapping between its overview
   cube and summary, preventing different copies from drifting. The single
   example needs no vehicle association sensor or Car module.
6. Tap or hold a named charger to inspect details. This navigation is read-only.
   Test Enabled/Cable lock only after verifying the targets and automation policy.

The examples use fixed `size: 82` and place the Hub at `left: 60%` to leave room
for the left charger's detail ring on a 390px-wide view. Persistent menus keep
their physical floorplan anchor; they do not silently move away from it at an edge.
For your own floorplan, choose a position with room for the detail ring. Existing
`size: auto` / `auto_reference_width` can be used unchanged (e.g. reference 900
for an image intended to display at 900 CSS px). Numeric sizes stay fixed.

For an existing picture-elements card, copy the [element-only example](../examples/charger-elements.yaml)
into `elements:`. Each 22 kW animation reference controls only wave speed, not
electrical limits; confirm each charger's actual capabilities separately.

## Public API and shared presentation

Use `type: charger` on a Hub item, or `module: charger` on a standalone
`custom:honeycomb-persistent-control`. The optional aggregate uses
`type: charging-hub` (or standalone `module: charging-hub`) with a `chargers` list.
It is an ordinary Hub item: use `slot: 0`, `logo: false` for the summary center.
Other Light, Sonos, generic and future independent Car cubes retain their own slots.

| Key | Contract |
|---|---|
| `entity` | Required concrete status entity; must agree with `entities.status` if both supplied |
| `name` | Friendly text name, always shown on the launcher and promoted center |
| `provider` | `easee` or `generic` (default); no direct vendor API |
| `entities` | Explicit role-to-entity mapping from the table below |
| `device_id` | Optional exact HA device ID; contradictory registry relationships are rejected |
| `discover` | Easee registry discovery enabled by default; `false` restricts to explicit mappings |
| `max_age` | Fresh power age in seconds, default 300, allowed 10–86400 |
| `association` | Optional read-only sensor, exact `charger_key`, optional `max_age` (default 300) |
| `energy_wave` | Optional `false`, or existing enabled/color/power/fixed-speed settings; health/power are derived safely |
| `chargers` | Aggregate only: zero or more full individual charger descriptors |

Existing Hub item `slot`, `slot_mode`, `visibility`, borders, sizing and actions
still work. No new allocator or renderer is used. Geometry is the shared 82px
full cell. Individual launchers and their promoted center use two body rows:
vehicle/connection (or Disabled/fault/offline/unknown) first, fixed charger name
second. Fresh positive charging power appears beside the icon, never as a third
body row. Detail controls retain their existing diagnostic text. Full text is exposed to assistive technology/hover even
when a long name is visually ellipsized. Keep display names concise on tablets.

### Entity collection checklist (per charger)

Use HA Developer Tools → States and the integration/device page. These are
roles, **not assumptions about your installed entity IDs**. Missing optional
roles remain truthful read-only placeholders in their fixed slots.

| Role | HA source / units | Writable? |
|---|---|---|
| `status` / `entity` | Charger operating status, normally `sensor.*` | No |
| `power` | Actual charger power sensor, **W or kW**, valid nonnegative number | No |
| `online` | `binary_sensor.*`, on = online | No; strongly recommended for Easee |
| `enabled` | Actual charger permission `switch.*`, on/off | Only explicit tap on slot 1 |
| `permanent_lock` | Permanent cable-lock **policy switch**, on/off | Only explicit tap on slot 2 |
| `physical_lock` | Physical lock state; HA `device_class: lock` binary sensors use **off = locked**, on = unlocked | No |
| `session_energy` | Current session energy, **Wh or kWh**, not lifetime energy | No |
| `current` | Actual current, **A or mA** | No |
| `limit` | Allocated/output current or explicitly mapped limit, **A or mA** | No |
| `connected` | Optional explicit physical connection binary sensor, on = connected | No; never substitute lock status |

Only verified available switch entities plus HA switch services enable the
two controls. A physical lock sensor never becomes a switch. Known foreign
device/platform/product mappings and ambiguous discovery candidates are rejected.
Without registry access, explicit mapping is the owner's declaration of the
correct capabilities; verify every target against the device page before use.
Generic status entities must expose the documented textual states (for example
`charging`, `ready_to_charge`, `disconnected`, `disabled`, `paused`, `error`).
Vendor-specific numeric status codes are interpreted only for `provider: easee`;
other providers need an externally normalized HA status entity. Unknown codes
never prove physical connection or authorize a control.

## Level A: summary and named chargers

The summary displays actual verified charging kW and a physical connection count.
It deduplicates by verified HA device/product identity, then concrete status/power
entity where registry identity is unavailable. Do not configure multiple aliases
for one physical charger without a shared verified `device_id`. Summary membership
is its explicit `chargers` list, independent of whether individual UI cubes are
conditionally hidden. An empty list remains accessible and shows `0.0 kW`, `0 cars`.

Unknown/unavailable power is **not zero**. Only fresh W/kW measurements from
available, nonfaulted chargers are accepted; positive power also requires actual
charging, enabled permission and physical connection. A partial known sum is
shown as `≥ 7.4 kW`; no known readings show `— kW`. Unknown physical connections
produce a lower-bound count such as `1+ cars`, never an invented disconnected car.
The association sensor's state/count is never used for physical presence.

Each individual always displays its configured name; during charging, fresh power
is shown on the second row. The third row shows a fresh confirmed vehicle name,
`Car connected`, `No car`, or an honest connection/availability indication.

| Precedence | Inner border | Shared energy wave |
|---|---|---|
| Fault, unavailable or offline | Red | Off |
| Disabled | Yellow | Off |
| Enabled, physically connected, ready/zero power | Green | Off |
| Enabled, connected, charging with fresh positive power | Green | On |
| Enabled, physically disconnected | Blue | Off |
| Unverified permission/connection | Neutral gray | Off |

Charger state owns its inner-border color, including fault safety. Outer borders,
inactive solid fills, 40% active gradients and normal style overrides retain the
shared renderer's rules. A mixed aggregate may warn with a red border while still
animating valid charging from another healthy charger; a faulted individual never
animates. The existing reduced-motion, hidden/offscreen and shared animation-budget
guards apply. Wave color inherits the resolved inner border unless overridden.

Power defaults to the existing bounded power-speed mapping, aggregate reference
19400 W. Per-charger peaks are independently configurable, e.g. 11000 or 7400 W.
Manual fixed speed is also supported. The module supplies real health/power, so
configured animation values cannot force a paused/faulted/zero-power charger active:

```yaml
type: charger
provider: generic
entity: sensor.charger_1_status
name: Charger 1
entities:
  power: sensor.charger_1_power
  enabled: switch.charger_1_enabled
  online: binary_sensor.charger_1_online
energy_wave:
  speed_mode: fixed
  cycle_ms: 1600
  color: '#42a5f5'
```

Power freshness uses HA `last_reported`, falling back to `last_updated`. Missing,
expired, future or invalid measurement timestamps/units suppress the wave and
exclude the number. On WS disconnect, pre-disconnect measurements are not reused
to restart animation. Long-unchanged sensor values can retain old timestamps in HA;
check reporting before choosing a larger `max_age`. Do not extend it to conceal
offline data. Permission/lock settings are persistent states, not expiring power
measurements. Expiry uses one-shot display timers, with no polling or HA writes.

## Level B: fixed physical slots and safe controls

The selected charger is promoted to **0b**. Back once returns to the overview;
idle close follows the normal 8-second module timeout. Passive state updates and
registry discovery do not reset idle or create navigation levels.

| Physical slot | Meaning |
|---|---|
| 0b | Same charger name, power/state and vehicle; tap Back |
| 1b | Enabled permission ON/OFF; explicit verified switch tap |
| 2b | Permanent-lock switch ON/OFF; separate physical Locked/Unlocked text; read-only when only physical sensor exists |
| 3b | Current Session energy in kWh, read-only |
| 4b | Confirmed current vehicle, generic connection fallback or unknown/unavailable |
| 5b | Actual current / allocated limit, A, read-only |
| 6b | Available status/diagnostics and ordinary HA more-info, read-only |

No field is repurposed when a capability disappears; its slot stays reserved and
truthfully disabled/unavailable. Opening, holding, Back, refresh, reconnect and
expiry never start charging or lock anything. Only deliberate slot-1/2 taps
perform one `switch.turn_on` or `switch.turn_off` against the verified exact entity.
There are no automatic retries, pause/resume shortcuts or price/automation overrides.

Controls show `Sending…`, then `Awaiting HA`; matching HA state clears pending.
Rejected requests show `Command failed`. No state confirmation within 15 seconds
shows `Not confirmed`. Easee can swallow upstream errors, so a service response
alone is not success. Even an HA acknowledgement is not independent hardware
confirmation. A timeout may mean the device received the command; inspect HA and
the charger before deliberately retrying. External automation may change permission
again; Honeycomb does not fight it. Pending actions are isolated by physical charger
and capability, with a bounded queue. Navigation remains available during failures.

## Easee source-backed adapter

Audited community integration `nordicopen/easee_hass` at
[`08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3`](https://github.com/nordicopen/easee_hass/tree/08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3),
not HA core and not confirmation of the owner's installed version.
[Definitions](https://github.com/nordicopen/easee_hass/blob/08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3/custom_components/easee/const.py),
[entity identity](https://github.com/nordicopen/easee_hass/blob/08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3/custom_components/easee/entity.py),
[switch behavior](https://github.com/nordicopen/easee_hass/blob/08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3/custom_components/easee/switch.py).

Exact definition keys: status `state.chargerOpMode`; power `state.totalPower`
(kW); energy `state.sessionEnergy` (kWh); permission `config.isEnabled` switch
`is_enabled`; physical `state.cableLocked` binary sensor with HA lock inversion;
permanent `state.lockCablePermanently` switch `cable_locked_permanently`; online
`state.isOnline`; actual current `state.inCurrentT2`/max phase; output allocation
`state.outputCurrent` (`output_limit`). Limits are never changed by this beta.

Known numeric/native statuses and underscore/space/case variants are normalized:
Car disconnected, Awaiting start, Ready to charge, Charging, Completed,
authorization/load/scheduled waits, suspended/disabled, pause, faults and offline.
Unknown strings remain unknown. Cable lock is not connection proof. Conflicting
explicit connection/status reports suppress animation and controls.

Automatic role discovery requires the same HA device, Easee registry platform,
and exact integration unique ID `${product.id}_${definition key}`. It never uses
friendly-name substrings. One bounded, deduplicated, read-only HA entity-registry
request is shared across Charger faces; denied/timeout discovery falls back to
explicit mappings. Registry/reconnect events refresh it without polling. Late
responses only refresh current subscribed faces and cannot reopen a menu.

## Optional dynamic vehicle association (later owner setup)

The module works without this sensor. The two-charger example shows optional
configuration; replace its exact external charger keys when the feed exists.
No direct Node-RED endpoint or Car module is required. The external system is
solely responsible for current, confirmed assignments; Honeycomb does not infer
identity from power, names, GPS, charging status or a previous session.

Expected HA sensor attributes (synthetic data; state may be the assignment count):

```json
{
  "assignments": [
    {"charger":"charger_1","car":"vehicle_a","car_name":"Vehicle A","mode":"auto_assigned"},
    {"charger":"charger_2","car":"vehicle_b","car_name":"Vehicle B","mode":"manual_until_disconnect"}
  ],
  "updated_at": "2026-10-22T23:00:00+02:00"
}
```

Only `auto_assigned` and `manual_until_disconnect` are confirmed modes.
`updated_at` must be timezone-aware, recent and not implausibly in the future.
Missing/unavailable sensor, expired timestamp, missing/invalid row, repeated charger
or conflicting vehicle assignment falls back to `Car connected` when physical
connection is confirmed. Disconnect immediately clears the displayed vehicle.
`lastAssignedCar` is never used. A linked car does not consume/remove a future
independent Car cube; that module remains out of scope.

Tomorrow the owner can expose the existing external assignment output as an HA
sensor using their chosen supported mechanism, verify its attributes in HA,
then add/change only each charger's `association` block. Publish `updated_at`
only with revalidated current assignments, not a heartbeat that renews stale data.
No Node-RED flow, optimizer, service route or HA configuration was modified tonight.

## Diagnostics and real-hardware acceptance

`getPresentationDiagnostics()` on a Charger face reports capability names,
availability/freshness, association reason and mapping issue codes. It does not
log product IDs, raw attributes, URLs, private vendor errors or tokens.

Owner-controlled acceptance, with external automation understood:

1. Confirm installed beta/resource version and each source entity's device, units,
   availability and actual integration version. Inspect the switch service target.
2. With no car, confirm Blue/No car; plug in and confirm Green/Car connected with
   no automatic command. Open/hold/Back repeatedly; verify HA's service log stays quiet.
3. Observe Ready, positive charging, zero-power, disabled, fault and offline
   transitions, partial aggregate data and separate physical lock vs permanent policy.
4. In a safe supervised session, deliberately tap one Enabled control, verify
   exactly that charger and HA/hardware confirmation. Then test permanent lock
   only if its capability/meaning is verified. Never blindly retry a timeout.
5. Confirm no effect on another charger, and that external scheduling remains in
   control. Test HA/browser restart, reconnect, reduced motion and tablet placement.
6. Add the optional feed later; test missing/stale/ambiguous mappings, disconnect
   and two-car reassignment. Independently verify actual vehicle identity.
7. Check existing Light brightness/Hue/Kelvin, Sonos Radio/Join/native Sleep,
   Hub visibility/placement, numeric/auto sizing and touch navigation.

Synthetic desktop/mobile browser tests, schema/unit tests and CI are evidence of
frontend behavior; they are not real Easee/HA hardware acceptance. Stable publication
and master integration require later explicit owner approval.
