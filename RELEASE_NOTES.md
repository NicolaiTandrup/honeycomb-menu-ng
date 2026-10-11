## Honeycomb Menu NG v1.2.12 – Live State Refresh

This pre-release fixes live state values that could freeze while a Honeycomb menu stayed open.

### Fixed
- Open Honeycomb items now receive the current Home Assistant `hass` state every refresh cycle.
- Wrapped `custom:button-card` instances therefore re-evaluate live JavaScript templates while the menu remains open.
- Sonos volume percentage updates dynamically after repeated volume up/down actions.
- Dynamic play/pause labels and other state-driven button-card templates benefit from the same refresh path.
- Persistent center controls and XY pads also receive the latest state.

### Root cause
The previous refresh path only propagated state when the top-level `hass` object reference changed. Home Assistant can update state without that identity check being sufficient for an already-open custom menu, leaving the wrapped card with stale rendered template output.
