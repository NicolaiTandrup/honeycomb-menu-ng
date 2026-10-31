# Generic module authoring

Use the registry and shared `CubeElement`, resolved numeric size pipeline,
physical slot allocator and navigation context. Modules return launcher/menu data;
they do not own coordinates, pointer handling, a new renderer or popup lifecycle.
Light remains the normal control layout reference. See [runtime](NG_RUNTIME.md),
[shared presentation](CUBE_PRESENTATION.md) and [terminology](TERMINOLOGY.md).

For read-only information in the beta.8 candidate (Info first shipped in beta.7), place
`tap_action: {action: 'honeycomb-info', info: payload}` on any ordinary menu button.
The payload follows the [Info Cube schema](INFO_CUBE.md). Alternatively call
`window.honeycombNG.openInfoInContext(context, payload, sourceElement)` with the active controller
context. The optional source element supplies the connector’s physical position
and resolved inner-border color; declarative actions pass it automatically.
A current global/classic menu uses `window.honeycombNG.openInfo(payload)`.
No active menu or dashboard preview returns null without opening anything.

The shared controller keeps the caller mounted, suspends its idle timer and makes
its controls inert. It freezes structural navigation/Hub allocation while the
Info view is open; passive values may update normally. Tap/Enter/Escape returns
without a stack push, reanchor or device command; fixed 30 seconds closes the
entire context. Closing/removing the caller tears the Info view down. Reuse this
contract for Light, Media/Sonos, Charger and future Climate/Car/EV modules.

Bindings are explicit scalar HA entities/attributes; no module-specific cache,
backend API, live charging command or guessed identity is part of Info Cube.
Never pass unbounded external objects or private production payloads into public
fixtures. Capture actual automated validation separately from owner device tests.

## Expanded Collapsible navigation

Use the existing nested/promotion descriptors. Shared navigation measures the
child footprint at the selected anchor, then the expanded root anchor, with
safe fitting when required. Do not implement per-module positioning. Saved
parents retain independent size/anchor snapshots; Back restores them. Outside
expanded Collapsible contexts, existing navigation behavior is unchanged. Shared
Bee descriptors live in `src/core/bee.js`; see [Bee contract](SHARED_BEE.md).
