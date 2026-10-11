## Honeycomb Menu NG v1.2.0 – Inline Hub Architecture

This pre-release changes the persistent Hub from a global overlay into a true inline Lovelace component.

### Why this changes
The overlay-based Hub could only behave reliably as one global menu. That model does not scale to one Hub per room on a floorplan and caused edit-mode positioning problems.

### New inline Hub
- Every Hub is rendered inside its own picture-elements/Lovelace element.
- Multiple Hubs can coexist independently on one dashboard.
- Moving a Hub in edit mode moves its entire cluster with it.
- No persistent Hub uses the global Honeycomb overlay manager anymore.

### Navigation
- Short tap on a root tile toggles its entity.
- Long press opens detail controls around the exact tile that was held.
- The held tile remains on the same pixels and becomes the local center.
- Tap the promoted center to return to the Hub.
- Nested Color/White, Sonos Join and Radio rings also stay local to that Hub.

### Controls retained
- Automatic light capability detection.
- Brightness helper/fallback behavior.
- Kelvin/HS standard preset behavior.
- Color and White Ambiance palettes.
- Sonos play/pause, volume, Join, Radio and Browse.
- Hub state-aware root tiles and center slot 0 layouts.

The normal Honeycomb popup system remains available and unchanged outside `custom:honeycomb-persistent-hub`.
