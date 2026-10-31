# Collapsible Hub

Put a single room control on a picture-elements floorplan. Tap performs the
primary action; hold opens the full Hub. On a phone it automatically enlarges in
a centered overlay. Tap center to return, or wait 30 seconds without activity.

```yaml
type: custom:honeycomb-persistent-hub
style: {left: 50%, top: 50%}
collapsible: true
items:
  - type: light
    entity: light.room_a
    slot: 0
  - type: light
    entity: light.room_b
    slot: 2
```

Paste this into the containing card's `elements` list and replace synthetic
entities. The card supplies the floorplan image. A [complete picture-elements
example](../examples/collapsible-picture-elements.yaml) is ready to paste.
Existing Hubs without `collapsible` keep their existing defaults and behavior.

## Automatic behavior

Collapsed size follows the floorplan responsively, with a normal maximum of
82 CSS pixels. Image calibration remains the shared 1536px display reference;
ordinary setups need no reference setting. When image geometry cannot be resolved
(e.g. unsupported stretching/transforms or no image), the safe numeric fallback
is 82px. Explicit `size: auto` and `auto_reference_width` remain supported.

Small-screen enlargement is enabled by default up to a 600px viewport. It uses
a separate browser top-layer overlay, preserving the original floorplan anchor
and escaping clipped/transformed parents. It tracks rotation and viewport changes,
blocks click-through, and restores the current floorplan size/position on collapse.
The normal 82px auto cap does not constrain the enlarged overlay.

Center is Back at the expanded root. The default keeps the primary's live visual
appearance there; tapping it collapses instead of performing its primary action.
Choose bee center below for direct access to the primary action while expanded.
Nested Back returns to its parent before collapsing. Escape follows the same
navigation. There is no separate rectangular Back button.

Configure exactly one hard item at `slot: 0`. This explicit designation avoids
ambiguity with soft/priority placement. Invisible primary items stay invisible.
Multiple Hubs own separate contexts. Removing/reconfiguring a Hub cleans up its
overlay and listeners. Dashboard editing previews do not execute actions.
Keyboard: Tab to the primary, Shift+Enter/Shift+Space to expand, Enter/Space on
the root center to collapse. Keyboard focus has a visible hexagonal ring.

## Optional settings

| Option | Default | Override |
| --- | --- | --- |
| `size` | `auto` when collapsible | Numeric `size: 82` (or another positive value) fixes collapsed size. Numeric sizes are not auto capped. |
| `collapsible.expanded_center` | `primary` | `bee` moves primary to `primary_slot` and shows bee as Back. |
| `collapsible.primary_slot` | Required for `bee` | Available slot 1–216. Hard collisions including hidden reservations fail; soft/priority use existing allocation. |
| `collapsible.idle_timeout` | `30000` | At least 1000ms. Meaningful user activity resets it; HA updates and resize do not. |
| `collapsible.small_screen` | `true` | `false` disables small-screen enlargement. |
| `collapsible.expanded_size` | `100` | Desired overlay cube width, 44–200px; viewport fitting may constrain it. |

Fixed collapsed size:

```yaml
size: 82
collapsible: true
```

Bee center with primary at slot 1:

```yaml
collapsible:
  expanded_center: bee
  primary_slot: 1
```

Custom overlay size:

```yaml
collapsible:
  expanded_size: 110
```

Disable small-screen enlargement:

```yaml
collapsible:
  small_screen: false
```

Migration: replace `collapsible.mobile` with `collapsible.small_screen`. The old
boolean alias still works. Matching old/new values are accepted; contradictory
values are a configuration error. [Bee example](../examples/collapsible-hub-bee.yaml)
and [calibrated auto element](../examples/collapsible-hub-auto.yaml) remain available.

Very large Hubs may need targets smaller than 44px to fit a phone; prefer compact
room Hubs with nested menus. Top-layer expansion requires modern Popover API
support (current Chromium/HA Companion WebViews). Physical Android, real HA,
Safari and Firefox acceptance remain separate from Chromium emulation.
