## Honeycomb Menu NG v1.3.1 – Native Media Nested Context

This pre-release fixes nested Sonos/media levels opening outside the persistent Hub context.

### Symptom
Opening Radio (and potentially Join) from the native media menu could:
- dim the whole dashboard with the global Honeycomb shade,
- leave the original local media ring visible underneath,
- open a second Honeycomb on top,
- and make favorite buttons appear to overlap the existing inner ring.

### Root cause
The media submenu used `fire-dom-event`. Across the wrapped button-card/shadow-DOM path, the nested event could lose the originating local Hub context and fall back to the global Honeycomb manager.

### Fixed
- Native media Join/Radio submenus no longer depend on `fire-dom-event`.
- They are opened directly by the current `honeycomb-menu` instance.
- The owning per-Hub menu context is preserved explicitly.
- `nested_expand` now updates the existing menu in-place.
- No global shade should appear for persistent-Hub media submenus.
- The existing inner ring remains the actual inherited inner ring rather than a second menu underneath it.
- Radio favorites expand into the outer ring around the same persistent Sonos center.
