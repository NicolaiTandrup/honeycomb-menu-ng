# Collapsible Hub

Available in v1.10.0-beta.2. Existing Hubs stay expanded unless `collapsible`
is enabled. Use [the primary-center example](../examples/collapsible-hub.yaml)
or [the bee-center example](../examples/collapsible-hub-bee.yaml); replace synthetic
entities with your actual lights. Keep the normal NG resource and button-card.

`collapsible: true` uses defaults. An options object accepts:

| Option | Default | Behavior |
| --- | --- | --- |
| `expanded_center` | `primary` | Keep the primary center, or `bee` to move the primary to `primary_slot`. |
| `primary_slot` | Required for `bee` | Available physical slot 1–216. Hard collisions, including hidden reservations, are errors. Priority and soft items use the shared allocator. |
| `idle_timeout` | `30000` | Milliseconds, at least 1000. Pointer/actions reset activity; HA updates and resize do not. |
| `mobile` | `true` | At viewport widths up to 600px, use a centered top-layer overlay. |
| `expanded_size` | `100` | Desired mobile cube width, 44–200px. The viewport can constrain it further. |

Configure exactly one hard primary item at `slot: 0`. The collapsed view shows
only that cube, preserving its live entity styling, size and floorplan position.
Short tap performs its configured primary action. Hold expands without running
the tap or the primary cube's normal hold menu. While expanded, ordinary module
holds work again. Use Back above the Hub (or the bee center) to collapse; a nested
menu's Back first returns to its parent. Escape and inactivity collapse the Hub.
Primary and bee policies share the existing allocation, renderer and navigation.
Invisible primary items stay invisible; they do not expose surrounding controls.

For picture-elements, retain the ordinary element `style` coordinates and use
`size: auto` plus your existing `auto_reference_width`. Expansion does not move
that dashboard element. The mobile overlay uses the browser top layer to escape
transformed/clipped floorplan ancestors, tracks viewport resize/rotation, and
blocks interaction with the floorplan behind it. Closing restores the original
anchor. Multiple Hubs own independent contexts; removing/reconfiguring a Hub
cleans up its overlay and listeners. Editing previews do not execute actions.
Keyboard users can focus the collapsed primary and press Shift+Enter or Shift+Space
to expand, then use the labeled Back button. No animation is required.

Very large slot populations may require targets smaller than 44px to fit a phone;
prefer a small room Hub and nested module menus. The top-layer overlay requires a
modern browser with Popover API support (current Chromium/HA Companion WebViews).
Real HA/device acceptance, Safari and Firefox remain separate from Chromium QA.

See [configuration](../README.md), [Climate](CLIMATE_MODULE.md) and
[Sonos](SONOS_MODULE.md).

## beta.3 auto-size stabilization

For a floorplan element, `size: auto` and `auto_reference_width: 1200` use the
ordinary shared image-sizing engine. Collapsed size is independent of the
expanded overlay's `expanded_size`; an incidental layout width must not replace
a valid auto-size result. Back and inactivity restore the current auto size and
original picture-elements anchor, including after rotation while expanded.
Unsupported transformed images retain the existing normal sizing fallback.

[Auto-sized element example](../examples/collapsible-hub-auto.yaml): paste into
your existing picture-elements `elements` list and replace synthetic entities.
The containing card supplies the floorplan image.
