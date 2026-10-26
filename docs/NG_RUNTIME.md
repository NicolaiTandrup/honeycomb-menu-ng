# NG runtime API v1 — v1.8.0 candidate

Introduced in beta.1, this API is part of the owner-tested cumulative beta.7
source for the proposed stable candidate. The namespace slice preserves YAML
card identity; the full candidate also contains the approved shared presentation.
The rename map below documents the current API; the owner already uses this track.

| v1.7 internal/global name | NG-owned name |
|---|---|
| `honeycomb-menu` | `honeycomb-menu-ng` |
| `honeycomb-menu-item` | `honeycomb-menu-ng-item` |
| `xy-pad` | `honeycomb-ng-xy-pad` |
| `window.honeycomb_menu(config)` | `window.honeycombNG.open(config)` |
| `honeycomb_menu_create_context()` | `honeycombNG.createContext()` |
| `honeycomb_menu_in_context(ctx, cfg)` | `honeycombNG.openInContext(ctx, cfg)` |
| `honeycomb_menu_context_update_base(ctx, cfg)` | `honeycombNG.updateBase(ctx, cfg)` |
| `honeycomb_menu_back()` / `honeycomb_menu_close()` | `honeycombNG.back()` / `honeycombNG.close()` |
| `honeycomb_menu_context_back/close/dispose(ctx)` | `honeycombNG.backInContext/closeInContext/disposeContext(ctx)` |
| `window.honeycomb_menu_templates` cache | `window.honeycombNG.templates` |
| Shared audio ID `honeycomb-audio` | `honeycomb-ng-audio` |
| Menu `closing` / `closed`, XY `drag*` events | `honeycomb-ng-closing/closed`, `honeycomb-ng-drag*` |

`honeycombNG.apiVersion === 1`. No unconditional legacy element/global aliases
are installed. Unknown existing NG API versions fail clearly instead of being
overwritten. Original APIs, elements, template cache and audio are left alone.
Menu-private `--honeycomb-menu-*` tokens now use `--honeycomb-menu-ng-*`;
NG-only persistent-card CSS tokens are unchanged. IDs/classes/keyframes inside
shadow roots are scoped, not document globals. HA APIs/events remain HA-owned.

## Configuration compatibility and mixed installations

Public `custom:honeycomb-persistent-hub` / `custom:honeycomb-persistent-control`
card names, resource path, `menu`, `buttons`, `entity`, `slot`, actions and
`honeycomb_menu_templates` dashboard **configuration** remain unchanged.
Existing NG-only external `fire-dom-event` / `honeycomb_menu` popup YAML works.
Nested NG menu actions remain bound to their NG controller directly.

**Mixed-install routing must be explicit.** Both projects historically listened
to `ll-custom.detail.honeycomb_menu`; no metadata identifies the intended plugin.
When original Honeycomb is loaded, that unmarked external key belongs to original.
Use `honeycomb_ng_menu` in an external `fire-dom-event` action to select NG, or
call `window.honeycombNG.open(config)`. Persistent Hub/Control need no YAML change.
This disambiguates a previously unsupported mixed install; do not claim arbitrary
legacy external popup actions can select both plugins without a marker.
Existing custom JavaScript callers of old globals or internal DOM selectors must
select the new API/tags. No collision-prone migration shim is supplied. Review
this API boundary with the owner before stable; no change is applied to v1.7.1.

## Verification scope

Pinned full original bundle: commit `16a2ac09a98c6837cb092603696e97e3a6102b45`,
SHA256 `dc72dfe01fef91eb720c464eae7374c71c3739773c7503492a30f1f0c7c0c35c`.
Real Chromium tests load original alone, NG alone and both orders at desktop and
touch-mobile sizes. They assert no runtime/duplicate-element errors, unchanged
original API/class/cache identity, independent popup routing, NG classic actions,
XY service dispatch, persistent Hub/Control and screenshot evidence. Inherited
regressions cover Sonos Sleep/Join/Radio/artwork and Light Hue/Kelvin zoom,
82px geometry, dynamic slots, gestures and idle/sibling navigation.
No physical Home Assistant installation is contacted by tests.

## Read-only Info view (beta.7; visual refinements in beta.8 candidate)

`honeycombNG.openInfoInContext(context, payload, sourceElement)` and `openInfo(payload)` share the
[Info Cube contract](INFO_CUBE.md). A current mounted caller is required. Declarative
menu actions use `action: honeycomb-info` plus `info`. Explicit external
`ll-custom.detail.honeycomb_ng_info` targets an owning menu or the current global
menu; it does not open another unrelated Hub. The controller owns modal lifetime,
input blocking, exact return and teardown. No renderer/domain duplication.
