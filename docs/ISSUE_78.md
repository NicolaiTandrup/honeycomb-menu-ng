# Issue #78: Light navigation regression in beta.1

Reproduced against the published v1.7.0-beta.1 bundle and compared with the
unchanged v1.5.1 bundle (`c1d9507ee48e65b951f6302c668dadf17043c195`), using
synthetic Zone A / Zone B lights, number helpers and a Media launcher.

## Root cause and fix

The shared cube's menu opener set its host's inline `visibility: hidden`, with
restoration registered only for the overlay's `closed` event. This is appropriate
for a dashboard launcher behind a popup. In-place nested navigation emits no
`closed` event and Lit reuses menu cells by their array position. A Light launcher
was consequently reused as a hidden preset control, then as a hidden launcher
again on return. It stayed connected, in its correct position, with correct HA
state; it was neither removed nor displaced or covered by another cube.

In v1.5.1 the launcher and generic submenu used different element templates, so
Lit replaced that node rather than carrying its hidden style through navigation.
Beta.2 lets the menu scene own the visibility/lifecycle of its child cubes.
External dashboard launchers still hide behind their overlay and restore on close.
No renderer, geometry, slot allocation, module action or configuration key changes.

## Actual Light slot mapping

Physical YAML slots start at 1 around center slot 0. DOM `data-honeycomb-slot`
indices for the ring start at 0; confusing these shifts the reported position.
Both v1.5.1 and beta.1 assign the following six controls:

| Physical slot | DOM index | Control |
| --- | --- | --- |
| 1 | 0 | 100% brightness |
| 2 | 1 | Brightness preset: apply on tap, store on hold when a helper exists |
| 3 | 2 | Color palette for color-capable lights; White for temperature-only lights; passive Light for brightness-only lights |
| 4 | 3 | Standard color preset when color helpers exist; otherwise Kelvin preset, or 2700 K fallback |
| 5 | 4 | Decrease brightness by 5% |
| 6 | 5 | Increase brightness by 5% |

Color is present, consistent with the issue's screenshot observation. The first
Light launcher occupies DOM index 1 in the three-item Hub; its reused element
hides the brightness preset at physical slot 2. Opening the second Light at DOM
index 3 can instead hide the standard color/Kelvin preset at physical slot 4.
That explains an apparently missing colored/preset cube without adding or
relocating the Color action. Slot 4's content depends on capabilities and helpers,
not on a newly introduced action.

Palette expansion retains the six inner controls and adds 12 choices at physical
slots 7–18. These are hue swatches for Color and temperature choices for White.
The Light menu/control source remains byte-for-byte unchanged from v1.5.1.

## Regression evidence

The new tests fail on beta.1 because the submenu's DOM index 1 has computed
visibility `hidden`, at both 1100×900 and 390×844. They cover both Light launchers,
repeated hold → palette → center-back → center-back → reopen, full close from a
palette, stable root nodes/positions, one overlay, visible unique cells, 82 px CSS
width, preset apply/store, and capability-dependent Color/White/Light mapping.
Mobile cases dispatch real Chromium touch input for hold/tap. A standalone Control
regression checks its hide/restore behavior through repeated closes.

Validation passes: 13 existing contract groups, 6 shared-engine unit tests and
36 Chromium checks (18 each at desktop and mobile sizes), plus production build,
bundle syntax/metadata/hash checks, workflow lint and whitespace checks.

The full existing suite also checks drag-select, Light, Media/Sonos, favorites,
cache artwork, state delivery, logo:false, nested defaults and lifecycle teardown.
Screenshots are uploaded by CI in `shared-cube-evidence`. The Browser plugin is
unavailable, so regular Playwright is used with simulated HA services/state and
real checksum-pinned button-card 7.0.1. Actual HA/device integration and other
browser engines still require installation testing.

Beta.2 is a prerelease from the tested PR #77 feature commit. The PR remains
unmerged; neither master nor restart/v1.5.1 is changed. Dynamic visibility,
priority placement and Car/Charger modules remain unimplemented. Narrow viewports
can still clip the outer palette; automatic shrinking/paging is outside this fix.
