## Honeycomb Menu NG v1.4.0 – Modular Core

v1.4.0 is an internal architecture release focused on making Honeycomb NG safer and easier to extend without cross-feature regressions.

### Core navigation invariant

The persistent Hub now has an explicit navigation contract:

- A base cube may establish a new physical module center.
- Once inside a module, the center is locked to slot 0.
- A module/submodule may expand from the classic 7-cube layout to larger ring layouts without moving the center.
- Deeper levels can change buttons and ring population, but cannot re-anchor the module.
- Returning to the Hub base clears the lock so another base cube can establish a new center.

### Modular monolith

Domain behavior is split from core/rendering:

- `src/core/` owns navigation, anchor state, layout geometry, entity inheritance, module lookup and custom-action dispatch.
- `src/modules/light/` owns light menus, palettes, presets and preset actions.
- `src/modules/media/` owns generic media behavior and group-aware volume actions.
- `src/modules/sonos/` owns Sonos menu/group/favorites behavior.
- `src/modules/generic/` is the fallback module.

The persistent Hub no longer contains light/Sonos menu builders. It resolves an item through the module registry and renders the returned declarative config.

### Renderer isolation

`honeycomb-menu.js` no longer implements Sonos group volume or light preset business logic. Custom domain actions are dispatched through the action registry.

Light palette/preset expansion and entity inheritance have also moved out of the renderer.

### Backwards compatibility

Existing Hub YAML remains supported:
- `type: light` resolves to the light module.
- Existing `type: media` keeps Sonos-oriented behavior.
- Generic media can explicitly use `module: media`.

No dashboard rewrite is required for the current light/Sonos configuration.

### Regression protection

A new core test suite verifies:
- base -> module may establish the anchor,
- module -> nested cannot move the anchor,
- back to base clears the anchor lock,
- global/non-Hub menus are unaffected,
- 7-cube and expanded layouts keep deterministic geometry,
- module resolution and explicit module overrides work.

GitHub Actions now runs these tests before compiling the release bundle.

See `ARCHITECTURE.md` for the module contract and extension rules.
