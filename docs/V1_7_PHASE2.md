# v1.7.0 Phase 2: dynamic Hub items (beta.3)

This phase starts from `restart/v1.5.1` at merged PR #77,
`697dec5846fc6b73199fb39562eef5a733ba49c5`, including the beta.2 Issue #78 fix.
No v1.6 code is used. Hub, Control and module menus retain the shared full-cell
82 px renderer, Light/Media/Sonos features, presets, favorites and navigation.
The Phase 2 feature PR is **not merged** into restart; master and latest stable
v1.5.1 are unchanged. Car/Charger modules are not implemented.

## A complete example

```yaml
type: custom:honeycomb-persistent-hub
name: Demo Hub
size: 82
logo: false
items:
  - type: light
    entity: light.zone_a
    slot: 0
    slot_mode: hard
    presets:
      brightness:
        entity: input_number.zone_a_brightness
      kelvin:
        entity: input_number.zone_a_kelvin
  - type: generic
    entity: sensor.vehicle_a_battery
    name: Vehicle A
    icon: mdi:car
    label: "[[[ return entity ? entity.state + '%' : 'Unavailable' ]]]"
    show_label: true
    slot: 2
    slot_mode: priority
    visibility:
      - condition: state
        entity: device_tracker.vehicle_a
        state: home
      - condition: numeric_state
        entity: sensor.vehicle_a_battery
        below: 90
    tap_action:
      action: more-info
  - type: generic
    entity: sensor.charger_a_status
    name: Charger 1
    icon: mdi:ev-station
    slot_mode: soft
    tap_action:
      action: more-info
  - type: media
    entity: media_player.player_a
    name: Media
    slot_mode: soft
    favorites_sensor: sensor.favorites_a
    favorites_cache_sensor: sensor.favorites_cache_a
```

Vehicle A and Charger 1 are ordinary generic cubes, not new domain modules.
Use any supported Hub module with visibility. Honeycomb does not implement charging
sessions, vehicle discovery or automation. Those belong to Home Assistant.

## Exact visibility contract

`visibility` is supported on **Hub items only**. Omit it for always visible;
`visibility: []` also means true. A list is AND; a single condition object is
accepted as shorthand. Nested `conditions` must be nonempty lists. Supported
operators are `state`, `numeric_state`, `and`, `or`, `not`; other operators or
fields throw a path-specific configuration error. This is a documented subset of
HA Lovelace conditions, not the entire HA automation condition/template language.

- `state`: literal `entity` (or `entity_id`, not both), exactly one of `state` or
  `state_not` (string or nonempty string list), optional literal `attribute`.
  Lists match any listed value; state_not negates that match. Quote values such
  as `'on'` and `'off'` in YAML. Attribute values compare by string conversion.
- `numeric_state`: literal entity, optional attribute, `above` and/or `below`.
  Bounds are exclusive. Bounds may be finite numbers, numeric strings or literal
  entity IDs whose states provide thresholds. All are tracked dependencies.
  Missing/null/empty/boolean/nonfinite numeric values are indeterminate.
- `and` / `or`: AND / OR of the child results.
- `not`: negates the AND of its child list, as in Lovelace. For NOT of an OR,
  put one explicit `or` condition inside it.

Missing entities/attributes are indeterminate (`U`), not unconditional visibility.
Unknown/unavailable state strings resolve only when explicitly listed in a state
comparison: `state: unavailable` can intentionally show an item; a normal home
comparison or its negation stays indeterminate. `state_not: [unknown, unavailable]`
is an explicit availability gate. Attribute/numeric comparisons are indeterminate
when the entity state itself is unknown/unavailable, avoiding stale attributes.

| A | B | AND / top-level list | OR | NOT of AND |
| --- | --- | --- | --- | --- |
| T | T | T | T | F |
| T | F | F | T | T |
| T | U | U | T | U |
| F | T | F | T | T |
| F | F | F | F | T |
| F | U | F | U | T |
| U | T | U | T | U |
| U | F | F | U | T |
| U | U | U | U | U |

Single NOT maps T→F, F→T, U→U. Only a final T is visible. A known decisive branch
can determine a composite result despite another U, as shown above.
Indeterminate final results expose `visibility-indeterminate` diagnostics.

```yaml
visibility:
  - condition: or
    conditions:
      - condition: state
        entity: device_tracker.vehicle_a
        state: home
      - condition: state
        entity: device_tracker.vehicle_b
        state: home
  - condition: not
    conditions:
      - condition: state
        entity: input_boolean.hide_vehicle_controls
        state: 'on'
  - condition: numeric_state
    entity: sensor.charger_a_status
    attribute: charging_power
    above: input_number.minimum_power
```

**Availability is separate.** An unavailable Light/Media/entity cube remains
visible and keeps its existing unavailable appearance unless a condition hides it.

Legacy `show` is an additional AND gate: `visible = visibility_is_true AND show`.
An omitted show means true; literal values retain Honeycomb's existing conversion
(`'false'`, `'0'`, empty and `'undefined'` are false). Hub show templates reevaluate
live conservatively on every HA delivery; errors hide the item and produce a
`show-error` diagnostic. Declarative visibility is preferred for precise dependency
tracking. `item.show` takes precedence over `item.persistent.show`. Classic popup
button show behavior remains opening-time. Within Hub/Control YAML, new dynamic
keys on standalone Control, root Hub or submenu buttons are rejected. Direct
classic popup APIs do not implement this feature; use their existing show options.

## Slots, stability and migration

| Mode | Visible | Hidden |
| --- | --- | --- |
| hard | Exact fixed slot | Slot remains reserved and visually empty |
| priority | First claim to its preferred slot | Releases its position |
| soft | Deterministic unreserved position | Releases its position |

1. Reserve all valid hard slots, including hidden items. Duplicate hard slots
   use original configuration order; the losing item is not rendered and a
   `hard-collision` diagnostic identifies it and the winner.
2. Claim **all** visible priority preferred slots in configuration order before
   assigning **any** priority fallback. Hard reservations win. Ties fall back.
3. Retain free previous priority fallback positions; place remaining priority
   fallbacks in free slots, preferring holes over evicting unaffected soft cubes.
4. Retain free previous soft positions before allocating returning/new soft items.
   New items use their requested hint when free, otherwise the lowest free slot.
   Vacated holes are not eagerly compacted; this prevents unnecessary motion.

Priority requires an explicit preferred `slot`. Soft without a slot starts from
the lowest free slot, including center when available. An explicit soft slot is
an initial hint, not a reservation or a recurring reclamation claim. Determinism
is over configuration order, current visibility and previous committed placement;
it does not imply identical layouts for different visibility histories.

For old items with no slot_mode, the default stays hard at the existing automatic
Hub layout position (or explicit slot). The old 3-item Light/Light/Sonos layout
is unchanged. Slots accept nonnegative safe integers, including decimal integer
strings for existing YAML. Negative, fractional or malformed slots produce an
`invalid-slot` diagnostic and do not render that item; no silent wrapping.
Placement fields belong directly on the item, not inside its persistent overrides.

`logo: false` removes branding, leaving ordinary physical slot **0** available.
`logo: auto` keeps the Phase 1 configured-count policy: branding for 2–6 configured
items, ordinary center for one item, no branding from seven. Explicit slot 0
(including a hidden reservation or priority preference) overrides branding. Logo
policy and implicit layout use configured count, not changing visible count, so
visibility does not make branding or unrelated cells jump. All-hidden Hubs are
valid; logo:false produces no cubes, while configured auto branding may remain.

The browser currently supports physical slots **0–216** (eight rings plus center),
not a limit on configured item identities/dependencies. Items beyond available
physical positions produce `overflow` diagnostics, remain evaluated, and can
appear when capacity becomes free. Preferred/fixed slots beyond the physical
range also report overflow; they never wrap. There is no paging or auto-shrink.
Diagnostics are available as the Hub element's `diagnostics` array and deduplicated
console warnings. Fix invalid inputs rather than relying on fallback from them.

## Menu and gesture boundaries

Each Hub has its own state, allocation history and navigation/interaction context.
No structural update removes or reallocates cells while its module or descendant
menu is open, a pointer/touch/drag is active, or a delayed tap action is pending.
State and presentation still update. Latest desired visibility is retained; after
returning to the base or full close, and after interactions end, one on-demand frame
commits the latest complete placement atomically. A round trip back to the committed
visibility mask needs no allocation. No animation-frame loop or polling is added.

A cube frozen through a gesture remains actionable for that gesture. Release
resolves its original item identity, even if its visibility condition changed in
the meantime; it never activates a replacement newly assigned to the same slot.
Cancellation and lost window focus cancel the gesture without firing an action.
Logical identities use the configuration path/index, not entity ID; duplicate
entity references do not merge items. Removing a Hub cancels its pending work.
The beta.2 Issue #78 fix remains: menu cells never acquire launcher hide styles.

## Dependency and performance contract

Condition compilation builds a dependency index. HA delivery reads snapshots for
unique configured entity/attribute dependencies, reevaluating only affected
conditions. It handles the same hass object and in-place attribute mutations.
setConfig rebuilds the index when entity IDs/configuration change. Entity IDs in
conditions must be literal; computed IDs, arbitrary JS visibility and HA duration,
screen/user/zone conditions are not supported by this subset.

Static faces snapshot their own entity; identical configuration/model updates do
not request a render. Arbitrary existing JS presentation/show templates and custom
content remain conservative because their dependencies cannot be inferred safely.
Scanning tracked inputs is O(D) per HA delivery; this is not a zero-work promise
for unrelated events. Hidden configured items retain their dependency entries.

Run `npm test`, `npm run benchmark:hub`, the production build and the Playwright
command documented in the Phase 1 guide. `test/performance/hub-benchmark.js` tests
5/20/50 populations with 1,000 relevant vs unrelated updates and records timings,
evaluations, allocations and heap snapshots. Browser tests measure rendered counts,
condition/allocator/render operations, DOM/listener counts, two HA providers per
Hub, frame-paced relevant timings, and GC-assisted heap snapshots at the same sizes.
CI uploads JSON alongside screenshots in `shared-cube-evidence`.

Tests assert no condition reevaluations, allocations, rerenders or DOM/listener
population changes for unrelated updates of the declarative/static fixture.
Relevant changes reevaluate one dependent condition and preserve unaffected faces.
Heap measurements include engine/framework caches and do not establish leak freedom;
frame-paced timings include waits. No historical performance improvement is claimed.

## Validation limits

Synthetic HA state/services and deterministic icon glyphs are used with real pinned
button-card 7.0.1. Real HA/device installations, other browser engines and long-term
memory behavior need owner validation. Large anchored menus may extend beyond narrow
viewport edges. No Car/Charger modules or charging automations are added in Phase 2.
