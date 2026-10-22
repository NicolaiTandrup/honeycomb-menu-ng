# Shared CubePresentation — v1.8 beta.2 candidate

One renderer (`src/cube-element.js`) owns the 82px cell geometry, hex clipping,
fill and independent inner/outer borders, typography/text zones, icon/artwork,
interaction surface and updates. `src/core/cube-presentation.js` centralizes
fill policy and bounded artwork layout. It is not a second renderer. Light
remains the visual baseline; actions, slots and navigation are unchanged.

Domain adapters supply `active: true/false`, resolved colors, icon/artwork,
labels and capabilities. They do not create gradient CSS or infer another
module's state. Light supplies on/off; Media supplies playing; Sonos additionally
checks the verified coordinator/recognized favorite's playback state. A retained
station accent is not proof of playing. Unknown/disabled states stay solid.
Generic action/favorite/palette cubes have no declared active semantic state and
stay solid; future modules must supply explicit normalized active semantics.

## Fill policy and precedence

For a truly active cube without an explicit fill override, a shared SVG radial
fill begins at **exactly the resolved inner-border color** and darkens toward the
edge by 30% per RGB channel (same hue). It is clipped inside the original fill
polygon. Inner/outer border colors and geometry are independent. Inactive,
off, paused, unavailable and disabled cubes default to a solid fill.

1. Preserve existing explicit `colors.center` and generic background/card fill
   choices as solid by default. `auto` is not an explicit color override.
2. `colors.fill_gradient: false`, `"solid"`, or `{type: solid}` requests solid.
3. `{type: radial}` explicitly requests active radial fill. Optional `edge`
   overrides the edge; optional numeric `darken` is bounded 0–0.4, default 0.3.
   With no explicit center, the center equals resolved inner-border color.
   Combining explicit radial with existing `colors.center` deliberately chooses
   that center stop. Inactive states still use solid fill.
4. Explicit foreground, artwork and legacy style overrides keep their existing
   precedence. Existing Sonos unavailable/paused safety colors remain in force.

RGB, hex and hue-wheel HSL status colors support deterministic darkening. Named/CSS-variable colors use feature-detected CSS `color-mix()` without DOM
reads; older browsers without that support fall back to solid unless an
explicit edge is supplied; never invent a color or issue new device commands.
Only literal gradient option shapes/darkening values are accepted; edge/color
strings follow existing template evaluation. Invalid option keys/types fail
configuration validation, rather than silently selecting a different mode.

See [tested presentation example](../examples/presentation-light.yaml).
`colors.fill_gradient` is new in this beta; do not put it in v1.7.1 YAML.

## Artwork/layout boundary

The shared `artworkLayout` helper preserves the existing Sonos 62% usable-fill
width, text-dependent 36/48/62% height and 14/19% top position. Module data can
request bounded scale 0.75–1.05, horizontal offset ±5 and vertical offset ±4
percentage points. Values are clamped/rounded centrally. Preserve aspect ratio
and the separate primary/secondary zones. This is a module presentation data
contract, not a new public free-form YAML layout schema. Existing user styles
remain supported; do not copy Light geometry/CSS into future modules.

## Performance and acceptance

No animation or polling is introduced. Active cubes add one static, uniquely
identified SVG gradient in their shadow root; inactive cubes add none. Existing
dependency snapshots and presentation signatures suppress unchanged renders.
The focused browser benchmark uses 91 actual Light cubes: 1,000 unrelated HA
updates cause zero cube renders; one relevant Light update causes one render.
This is fixture evidence, not a Raspberry Pi/hardware speed guarantee.

Unit and desktop/mobile browser coverage includes RGB/Kelvin/off/unavailable,
playing/paused Sonos on launcher and promoted center, artwork/volume, exact
center/inner equality, independent borders, fill-only clipping, explicit solid
and edge choices, bounded artwork metrics and large-Hub update counts. Inherited
full Light/Sonos/navigation/dynamic-slot regressions remain required in CI.
Screenshots require owner night-time/mobile visual review before stable.

Charging-wave work is a separate research primitive; no Charger/Climate/Car
module or experimental animation is bundled in this candidate.

## Optional module data lifecycle (v1.8.0-beta.4)

A module presentation adapter may provide `observe(notify)`, returning
`{update(hass, config), dispose()}`. The existing cube controller updates that
observer on relevant state/config/connection changes and disposes it on removal
or module change. An asynchronous notification resolves the current presentation;
it never opens menus, resets idle timers or changes placement. Modules own their
read-only metadata and cancellation guards; the renderer owns no Sonos browsing.
An optional resolved `name` replaces the primary text (empty while Radio artwork
is shown); absent keeps ordinary configured labels. The existing shared artwork
image/error path and 82px geometry are reused. No additional renderer or polling.
