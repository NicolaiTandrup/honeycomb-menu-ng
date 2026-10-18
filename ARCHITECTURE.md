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


## v1.6 visibility and allocation

`core/visibility.js` is a pure, validated frontend-condition evaluator.
`core/slot-allocation.js` resolves template-stack fallbacks and owns hard
reservations, priority claims, soft placement and deterministic overflow. The
renderer supplies the existing `show` template evaluator without modifying YAML
source. Rendering reevaluates visibility, guards action delivery, and defers
allocation while the drag pointer is active. A completed drag suppresses its
compatibility mouse/touch tap so a reflowed cell cannot receive a second action.

The Charging Hub is a documented composition of native aggregate presentation, button-card templates and
Honeycomb menus. There is no charging domain module or session state.


## v1.6 shared presentation and nested ownership

`core/hex-face.js` owns pure geometry/width normalization. `hex-face.js` renders
one SVG face/ring contract for native controls and ordinary menu items. Wrapped
cards retain their content/actions below pointer-transparent rings. Opt-in
rings preserve a containing block for button-card's fixed content. Legacy
ordinary cubes keep their original geometry when no colors/border is supplied.

`core/text-template.js` parses equal bracket depths and guards final button-card
name/label templates. Presentation evaluation never mutates source configuration.
Honeycomb/native templates and button-card contexts remain separate; ancestor
button-card escaping is resolved before final text rendering.

Renderer-owned nested actions default to expansion in the current context. Core
still owns the local Hub base-to-module lock; deeper expansion preserves anchor,
size and back history. Reused templates keep their own defaults. A global menu
and each local Hub retain separate contexts; nested actions never choose a new
global context based on a lost shadow-DOM event. Explicit replacement remains
available via nested_expand:false. Animation-free close disposes immediately.

With `inherit_inner:true`, copy each inner control's resolved item configuration,
including parent `button_defaults`, before changing menus. Copying only raw
buttons loses inherited face fills and text styles. Do not propagate the whole
parent defaults object to new nested buttons or independent templates.


## Canonical persistent Hub (#72)

The public Hub and compatibility Control extend `honeycomb-cube.js` directly.
The Control is a thin registered adapter; the Hub selects single-control mode
when items is omitted, or grouped mode when items is present. Both share native
presentation, gestures, service delegation and menu configuration. Ordinary
button-card hosts use the same hex face and content metrics for layered visuals.

`core/cube-metrics.js` is the only physical width / classic menu extent boundary.
`cube_size` is explicit cell width; old classic `size` remains extent. Native
layout never contains its own incidental extent factor. The renderer is the
only reachable-menu envelope scanner. Legacy face modes and custom CSS remain.

`core/hub-items.js` extends the #68 allocator only with center slot 0 and legacy
configured-count defaults. All ring reservation/priority/soft/overflow behavior
still runs through `core/slot-allocation.js` and `core/visibility.js`. There is no
seven-item truncation. Dynamic resolved center data is included in navigation
snapshots, and hidden owners return through the ordinary back engine.

`cube-actions.js` routes Honeycomb actions in native and wrapped hosts through
one owning context and custom-action registry. Standard wrapped HA actions stay
with button-card/HA; native actions preserve existing service contracts and
otherwise delegate to HA. Native and wrapped drag targets share the renderer's
visibility guard and gesture deferral. Context history stores invoking owner
conditions; responsive base movement updates saved base anchors without moving
an active module. Replacement renderers are followed through the same context,
so auto-open cannot install a second base over a child.

See [migration matrix](docs/PERSISTENT_HUB_MIGRATION.md) for exact compatibility
boundaries and the supported generic/module extension contract.
