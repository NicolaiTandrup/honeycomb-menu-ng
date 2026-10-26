# Info Cube — beta.7 development contract

Available in the **published v1.9.0-beta.7 prerelease**. Published
beta.6 is the baseline; v1.8.1 remains stable. Do not generate this configuration
for older versions. No Home Assistant helper, backend, PE/CM integration or device
service is required. All examples use synthetic entities and mock plans.

## Open and return

An ordinary Hub item or any module/menu button can use the same action:

```yaml
type: custom:honeycomb-persistent-hub
size: 82
logo: auto
items:
  - type: generic
    name: Info
    icon: mdi:information-outline
    slot: 1
    tap_action:
      action: honeycomb-info
      info:
        title: Home overview
        text: A long plain-text message wraps safely inside this hexagon.
```

The Info Cube is one read-only surface; it does not call an HA device service.
Tap anywhere on the hexagon, Enter, Space, Escape or normal Back returns to the
same mounted menu with its stack, selection, slots and physical anchor preserved.
Underlying cubes are inert. The backdrop absorbs input without dismissing or
click-through. Focus returns to the opener when it still exists.

Exactly **30 seconds from opening**, the complete calling menu closes. Scrolling,
HA updates and interactions do not extend this lifetime. A persistent Hub returns
to its normal floorplan base; it is not removed from the dashboard permanently.
A fresh explicit opening replaces the Info view and starts a new lifetime.
Component removal/editor teardown cancels timers and modal listeners immediately.
Normal caller idle-close restarts after explicit return. Late asynchronous menu
navigation while suspended is discarded; it cannot resurrect another submenu.

## Verified footprint and coordinates

![Literal slots 0–7 enclosed by one left-shifted Info hexagon](assets/info-cube-footprint.svg)

Logical 0 is the center, 1–6 the inner ring and **7 the outer-left cell**.
Owner approved enclosing literal **0–7**, not silently interpreting it as 0–6.
The minimal regular pointy hex enclosing their full shared-cell polygons is:

| Numeric cube width | Info width | Info height | Center relative to slot 0 |
|---|---|---|---|
| 82 px | 328 px | 378.7416 px | x −41 px, y −0.205 px |
| 41 px | 164 px | 189.3708 px | x −20.5 px, y −0.1025 px |

The tiny y offset follows the existing `.865`/`1.725` layout table precision.
Geometry derives from `src/core/layout.js`, including the real cell vertices.
Numeric sizing and `size: auto` use the caller's existing resolved numeric width.
The Info view alone shrinks to fit the viewport with a 12px margin when necessary,
and clamps its own position at edges. It never moves/resizes the caller.
Fonts remain at their configured CSS pixel sizes; long text paginates instead of
shrinking into illegibility. Browser zoom causes a new viewport layout.

Positioned blocks use normalized **x/y from 0–100**, measured from the left/top
of the complete large hexagon bounding box. `z` is drawing order, not 3D depth.
Pixel conversion: `x_px = x / 100 × info_width`, `y_px = y / 100 × info_height`.
x is the text anchor (`left`, `center`, `right`); y starts the block's line box.
Per-line safe widths follow all six sides, including the line's top and bottom,
5px border allowance and content padding. Invalid coordinates fail validation;
valid coordinates too close to a sloping edge clamp inward, with diagnostics.

## Three modes, one schema

| Field | Contract |
|---|---|
| `mode` | `text` (default), `stack`, `positioned` |
| `title` | Optional plain string or safe entity binding |
| `text` | Required in text mode; string or binding |
| `blocks` | Stack/positioned array of strings or objects with `text` |
| `spacing` | Stack gap, 0–40 CSS px, default 6 |
| `padding` | Content padding, 8–40 CSS px, default 12; added to border allowance |
| `font_size` | Body default 14 CSS px; permitted 12–32; never automatically shrunk |
| `weight` | 400/500/600/650/700/800; default 400; title 700 |
| `align` | `left` default, `center`, `right` |
| `colors` | Optional `center`, `inner_border`, `outer_border`, `foreground` CSS colors |

Each object block can override `font_size`, `weight`, `align`, `color` and
`background`. Positioned mode additionally requires x/y and permits z (−1000 to
1000, default 0). Blocks draw in ascending z; equal-z order is stable. Overlapping
blocks are an explicit authoring choice; containment still applies. Title remains
automatic at the top. No HTML, Markdown rendering, CSS URLs or JavaScript templates
are executed inside Info text; special characters remain literal text.

Neutral fill/inner border and dark outer border reuse the shared renderer's Light
submenu defaults. Explicit Info colors override only this view. Existing Light,
Sonos station colors and Hub base styles remain unchanged.

- [One wrapped paragraph](../examples/info-text.yaml)
- [Automatic vertical stacking](../examples/info-stack.yaml)
- [Positioned x/y/z blocks](../examples/info-positioned.yaml)
- [Dynamic HA information](../examples/info-dynamic.yaml)
- [Complete synthetic quarter-hour EV plan](../examples/info-charging-plan.yaml)

## Live data without JavaScript

A text binding is an object with required `entity` and optional `attribute`,
`prefix`, `suffix`, `fallback`, `format`, `time_zone`, `max_age`, `stale_text`.
The default reads HA state; `attribute` reads one scalar attribute. Missing,
unknown, unavailable and non-scalar values show `fallback` (default Unavailable).
`format: datetime` accepts an ISO timestamp and formats in explicit `time_zone`
(default UTC), including DST. Invalid timestamps fall back safely. `max_age`
(1–86400 seconds) evaluates HA `last_updated` on each relevant HA update; an old or
missing timestamp shows `stale_text` (default Stale). It does not poll or invent a
live backend timer. Prefix/suffix also surround fallback/stale text, so choose
wording appropriately. Binding entities are the only redraw dependencies; unrelated
HA updates do not remeasure text or restart the lifetime. Blank payloads show
No information available.

## Overflow, accessibility and bounds

Text and stack modes paginate at fixed readable sizes. Wheel, vertical swipe or
PageDown/PageUp/ArrowDown/ArrowUp change pages. A tap always returns. The fixed
30-second lifetime still applies to long payloads; this is a brief information
view, not a persistent document reader. The page footer and screen reader announce
page number. No wheel/touch scroll propagates to the floorplan. Screen readers get
title, full text, return instructions and diagnostic messages; Tab stays in the
modal. Only the topmost modal handles keyboard events across multiple Hubs.

Positioned content that cannot fit vertically is explicitly truncated; use stack
mode for automatic pagination. Bounds: 128 blocks, 32768 resolved characters,
64 pages, bounded configuration size. A visible Content limited indication and
accessible diagnostics report truncation. Coordinates/font sizes/unknown fields
outside the contract produce `Info Cube:` configuration errors. Text is protected
by both line geometry and a conservative SVG hex clip. No arbitrary font loading,
external artwork, scripts, polling or HA commands belong to this component.

## Module author API

See [module authoring](MODULE_AUTHORING.md). Internal modules call
`honeycombNG.openInfoInContext(context, payload)` from their existing menu context.
`honeycombNG.openInfo(payload)` targets the currently open classic/global menu.
These return the Info view, or null if no active caller/preview. Do not create a
separate modal, push fake Back levels or duplicate the cube renderer. All future
Climate/Car modules can use this API without importing another domain module.
No Climate, Car or speculative CM integration is implemented in beta.7.

## Acceptance

Automated Chromium covers synthetic desktop/tablet/mobile, per-line bounds,
root/module/palette return, timeout, repeated opens, touch/keyboard, live state,
late navigation, removal and multiple hosts. Screenshots live in CI evidence.
Actual owner Info Cube, Terminal add-on and HACS acceptance are separate. Beta.7 publication was separately authorized for owner HACS testing. Do not close
#140 or promote stable until owner acceptance and explicit further approval.
