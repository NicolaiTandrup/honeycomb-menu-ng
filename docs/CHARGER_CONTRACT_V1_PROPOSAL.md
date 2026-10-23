# Charger Level B contract review — proposal 1, 2026-10-23

**Review only: not implemented configuration, not an agreed cross-project contract.**
Beta.2 retains its existing detail slots and optional legacy assignment consumer.
This document is separate from urgent #125 and must not delay that release.
No runtime, forecast calculation, charging command or live HA configuration changes.

## Producer evidence and ownership

The initial default branches contained only preserved Node-RED exports. During
review, independent native integration proposals became available:

- [Brain PR #2](https://github.com/NicolaiTandrup/HA-EV-Charger-Brain/pull/2),
  reviewed commit `6236d5381dfbd51239313a48ec499fd66073ff56`:
  [association v1](https://github.com/NicolaiTandrup/HA-EV-Charger-Brain/blob/6236d5381dfbd51239313a48ec499fd66073ff56/docs/association-contract-v1.md).
- [Optimizer draft PR #2](https://github.com/NicolaiTandrup/HA-ev-charge-optimizer/pull/2),
  reviewed commit `9f446c6b06ac4a8dba0a94d8826ab0f73aa3a7e1`:
  [forecast API v1](https://github.com/NicolaiTandrup/HA-ev-charge-optimizer/blob/9f446c6b06ac4a8dba0a94d8826ab0f73aa3a7e1/docs/forecast-api.md).

These are proposals, not published/installed dependencies. Their own readiness
and real-HA acceptance gates remain. Pinning evidence does not endorse their
source data, forecasts or safety. Both integrations stay optional.

Brain owns inferred current car/charger association. Optimizer owns expected
completion, the SoC forecast for the strictly next **site-local** 07:00, and
expected next start. Honeycomb only validates, joins explicit identities, formats
and displays. It never calculates forecast energy, plans slots, identifies cars,
uses target SoC as a prediction, accesses Node-RED APIs or commands either producer.

## Future physical slots

| Detail slot | Display/source | Action |
|---|---|---|
| 0b | Selected charger summary, current verified power | Back exactly one level |
| 1b | Current associated vehicle; physical connection fallback | Read-only |
| 2b | Enabled, exact existing verified permission switch | Existing deliberate switch action |
| 3b | Cable lock, separate permanent policy and physical state | Existing verified policy action only |
| 4b | Optimizer expected finish for the current associated vehicle | Read-only |
| 5b | Optimizer predicted SoC at next site-local 07:00 | Read-only |
| 6b | Optimizer expected next charging start | Read-only |

This replaces, rather than appends another inner ring. Preserve current session
energy, current/allocation and diagnostics behind an optional explicit **Details**
action/menu with a meaningful single Back level; agree its launcher/gesture before
implementation. Never hide or repurpose Enabled/Cable lock actions accidentally.
Independent future Car Xa cubes retain visibility and slots when linked here.
No Car module or optimizer UI is added by this proposal.

## Association validation

Use an explicitly selected aggregate HA sensor and explicit charger key. Brain's
suggested entity ID is configurable/renameable, never an implicit lookup.

Accept schema_version integer 1 and available state; require fresh timezone-aware
aggregate `updated_at`. Inspect only `assignments`, never historical `chargers`
or `last_associated_vehicle`. Require unique charger and car keys, confirmed
`auto_assigned` / `manual_until_disconnect`, `valid: true`, `fresh: true`, a
nonempty car key and recent row timestamp. Reject conflicting duplicates and
unsupported schemas. A retained attribute list on an unavailable entity is invalid.

Freshness expires against wall clock even without new HA events. Proposed default
consumer evaluation age is 45 seconds against Brain's 15-second watchdog; confirm
this cadence with the producer. Future timestamps beyond a small agreed clock-skew
allowance fail closed. Browser disconnect invalidates external data immediately;
reconnect/reload requires newly verified HA state, never saved identity.

Physical charger disconnect clears identity immediately even before Brain updates.
Unavailable/expired/ambiguous association falls back to current `Car connected`,
`No car` or truthful charger unknown/offline labels. No automatic vehicle guessing.
Reassignment invalidates old forecast bindings before displaying a new vehicle.

## Forecast validation and identity join

Use explicit HA entity selections for each vehicle's three scalar forecast sensors
and status sensor. Do not reconstruct entity IDs from names. Optimizer's `car`
is an opaque persistent vehicle key; Brain currently uses configured stable slugs.
**Those keys are not automatically the same.** Agree an explicit crosswalk or a
shared stable identifier, never match display names. Validate the mapped Optimizer
key on every scalar and status update; changing association clears previous values.

Require schema 1, available scalar, fresh timezone-aware calculation `updated_at`,
consistent vehicle identity, `mode: log_only`, and forecast_basis
`proposed_schedule`. Label results as estimates from a proposed schedule, not a
promise that the physical charger will obey it. Check scalar availability separately
from overall status. Display only finite percent values in 0–100; never substitute
target/current SoC, zero, or another vehicle's sensor for unavailable data.

Optimizer calculates `forecast_cutoff` in the configured site IANA timezone with
DST handling. Honeycomb checks the supplied cutoff is the next local 07:00 for
that site; viewer timezone must not silently change the forecast's meaning. The
site timezone therefore needs an explicit agreed source. Formatting a timestamp
is allowed; computing predicted SoC or recreating a planning schedule is not.

Expired/historical expected start or finish becomes `Not available`, not a future
event. Current charging with no future start can display the producer's verified
`charging` status as `Charging now`; never invent a timestamp. After the cutoff
passes, the old morning forecast must expire even if its calculation age is small.

## Decisions required before consumer implementation

1. **Identity:** shared key versus an explicit Brain-to-Optimizer crosswalk. How is
   that mapping selected and validated without name inference?
2. **Freshness:** producer refresh cadence, scalar-specific maximum age, clock-skew
   tolerance and explicit reconnect behavior. Calculation time is not proof of
   upstream source freshness; producer validation remains authoritative.
3. **Scalar validity:** Optimizer documents justified partial morning forecasts even
   when overall `valid` is false. Agree scalar-specific validity/provisional flags.
   Until agreed, show `Not available` for invalid/provisional results rather than
   claiming every available scalar is a verified forecast.
4. **Coherence:** separate sensors lack a shared forecast revision ID. Agree whether
   identical `(car, updated_at, forecast_cutoff)` is a sufficient atomic snapshot;
   otherwise publish a revision. Mixed asynchronous generations must not render.
5. **Timezone:** publish site IANA timezone alongside cutoff, or require an explicit
   consumer mapping; do not assume browser/HA/user timezone equals site timezone.
6. **Schema:** beta.2's existing association keys are `entity`, `charger_key`,
   `max_age`; the Brain's illustrative Honeycomb YAML uses different keys and is
   explicitly unimplemented. Agree one supported consumer schema before documenting
   it as copy/paste configuration. No speculative YAML is introduced here.
7. **Details navigation:** agree the optional Details entry while preserving the
   existing controller/gesture ownership and safe actions.

## Synthetic fixture and acceptance matrix

[Contract fixture](../test/fixtures/charger-contract-v1-proposal.json) illustrates
producer payloads and a deliberately explicit identity crosswalk. It is **not** a
supported Honeycomb config or evidence of producer agreement.

Before shipping the future consumer, require unit and desktop/mobile cases for:

- Zero/one/many chargers, no integrations, one integration only, unavailable sensor,
  retained attributes, unsupported schema, invalid/future/stale timestamps.
- Unique valid association, duplicate charger/car, ambiguous/no identity, disconnect,
  reassignment, restart, HA disconnect, reconnect and late asynchronous data.
- Matching/mismatched vehicle key, mixed forecast generations, invalid/provisional
  plan, unavailable scalar, percentage bounds and no target-as-forecast fallback.
- Site/viewer timezone mismatch; just before/at/after 07:00; both DST transitions;
  old finish/start/cutoff; current charging versus future start.
- Exact slot layout, unchanged Enabled/lock targets, optional Details and one-level
  Back, unrelated Car cubes, touch/long-press, dynamic allocation and active gestures.
- No HA service call on render, association/state change, navigation or reload.

Use existing dependency-aware updates plus bounded one-shot expiry; no per-cube
polling or duplicate renderer. A state change for one vehicle must not rerender
unrelated chargers. Validate bounded listeners/subscriptions and cleanup with many
hubs. Producer cadence and hardware semantics require independent owner HA testing.
