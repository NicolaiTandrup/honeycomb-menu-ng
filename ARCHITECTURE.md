# Honeycomb Menu NG architecture (v1.5+)

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
- resolve visual presentation through module adapters instead of domain-specific branches

### Modules
- describe launchers, actions, state, presentation and nested menus
- may request slots/ring expansion
- may not call reanchor, replaceConfig or mutate navigation context
- may register domain actions through the core action registry
- may expose a persistent presentation adapter for live state rendering

Current modules:
- `generic`
- `light` (Home Assistant light domain; Hue works through this module)
  - `controls.js`: palettes and presets
  - `actions.js`: light-specific custom actions
  - `presentation.js`: live light color/brightness presentation
- `media` (generic media player)
  - `actions.js`: group-aware media volume
  - `presentation.js`: playing/volume presentation
- `sonos`
  - `grouping.js`: Join/group UI
  - `favorites.js`: Radio/favorites UI
  - `index.js`: Sonos module composition

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


## Documentation contract

Public v1.5 documentation is split by responsibility:

- `README.md` — human-first overview and quick start
- `docs/AI_SETUP.md` — deterministic configuration contract for AI assistants
- `docs/LIGHT_MODULE.md` — Light/preset/helper behavior
- `docs/SONOS_MODULE.md` — Sonos favorites, artwork cache, grouping and volume
- `docs/CLASSIC_MENU.md` — classic popup/XY-pad/template compatibility reference

When changing a public module schema, update both the human module document and the AI setup contract in the same pull request.

## v1.7.0 Phase 1 extraction from restart/v1.5.1

`cube-element.js` extracts the v1.5.1 native renderer into the shared Lit engine.
Both public adapters and `honeycomb-menu-item` consume it. Modules still return
data through the existing registry; `core/cube-config.js` compiles the same item
for standalone Control and Hub. One action handler owns native and generic input.
The existing navigation core keeps local context/anchor ownership.

`core/layout.js` retains the first two ring coordinates and generates subsequent
axial rings. Configured population is not truncated to a viewport capacity.
Visibility/priority are deliberately absent in this phase; the future allocator
will operate on stable identities and an extensible physical slot pool, in order
hard reservations > visible priority claims > soft items. Domain adapters must
not acquire geometry or navigation responsibilities when that work lands.

State is forwarded by the owning menu, with model-signature checks per cube.
There is no periodic refresh timer or continuous Hub RAF. Root logo colors do
not become module item defaults. Full-cell drawing and its content metrics are
owned once, including palette backgrounds and favorite artwork.

See [Phase 1 migration and known limitations](docs/V1_7_PHASE1.md). The release is
an explicitly published, unmerged feature beta; PRs target restart/v1.5.1 and do
not merge into master as part of Phase 1.


## v1.7.0 Phase 2 from merged PR #77

`core/visibility.js` compiles the HA-style condition subset and indexes literal
entity/attribute dependencies using scalar snapshots. `core/hub-allocation.js`
is a pure allocator: hidden hard reservations, all priority preferred claims,
priority fallbacks, then stable soft positions. It reports collisions/overflow
without truncating configured identities. Logical IDs are configuration paths.

Hub owns desired visibility and last committed placement. Each navigation context
tracks held pointers and pending tap actions; structural commits wait for a base
menu and an idle interaction context. One on-demand frame coalesces the latest
mask and runs after native capture/target release callbacks. Returning through
nested/back or full close uses the same boundary; presentation can still update.
No polling or perpetual frame loop is introduced. Menu updates reuse the original
configuration preparation pipeline and shared renderer, preserving Issue #78.

Static faces snapshot entity state/attributes and skip unchanged config/model
updates; arbitrary JS presentation/show/custom content is conservatively updated.
Current physical capacity is eight rings plus center; configured population is
uncapped. See [Phase 2](docs/V1_7_PHASE2.md) for exact semantics, truth tables,
capacity/diagnostic policy, examples and benchmark limitations.
