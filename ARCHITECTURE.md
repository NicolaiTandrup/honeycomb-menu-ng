# Honeycomb Menu NG architecture (v1.4+)

Honeycomb NG is a **modular monolith**. Domain modules describe capabilities and menus; the core owns geometry, navigation and rendering.

## Non-negotiable navigation invariant

A persistent Hub has two navigation scopes:

- **Base scope** — selecting a base cube may establish a new physical module center.
- **Module scope** — after entering a module, the physical center is locked to slot 0 until navigation returns to the base.

A module or submodule may change from the classic **7 cubes** (center + six inner buttons) to a larger ring layout, but it may never change the physical module anchor.

Only the navigation core may create, change or clear a module anchor.

## Responsibilities

### Core
- menu context and navigation state machine
- anchor ownership
- ring geometry and slot allocation
- entity/action inheritance
- custom action dispatch
- module registry

### Renderer/components
- render declarative configs
- dispatch interactions to core
- never contain Sonos/Hue business logic

### Modules
- describe launchers, actions, state and nested menus
- may request slots/ring expansion
- may not call reanchor, replaceConfig or mutate navigation context

Current modules:
- `generic`
- `light` (Home Assistant light domain; Hue works through this module)
- `media` (generic media player)
- `sonos` (Sonos-oriented grouping/favorites behavior)

## Module contract

A module can expose:

```js
{
  id: "sonos",
  priority: 400,
  matches(item, hass) {},
  buildMenu({ item, hass }) {},
  buildLauncher({ item, index, slot, submenu, hass }) {}
}
```

The module returns data only. Core decides where it is rendered and keeps the center invariant.

## Backwards compatibility

Existing Hub YAML remains valid. `type: light` resolves to the light module. Existing `type: media` keeps the Sonos-oriented behavior for backwards compatibility; a generic media player can explicitly use `module: media`.

## Adding a module

Create the module under `src/modules/<name>/`, register it in `src/modules/index.js`, and add core-contract tests. New modules must not import the menu renderer or manipulate anchor/navigation state.
