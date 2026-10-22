# Six-sided energy pulse — v1.8.0-beta.7

This is a **shared renderer capability**, not the future Charger module (#105).
It does not discover chargers, infer vendor states, call services or change
charging permissions. See the complete [synthetic demo](../examples/energy-wave.yaml).
It works without a real device or custom helper; paste the card into a manual
card editor. It intentionally represents **synthetic** power, not a live meter.

`energy_wave` is an optional Hub item / Control presentation object. It requires
explicit normalized `active`, `available` and `fault` booleans and numeric
`power_w`; optional `enabled` defaults to true. Existing HA JS template syntax
can supply these values when deliberately mapped to actual entities. Do not
map merely connected/ready to active; stale readings must set available or
active false. There is no universal vendor-specific status mapping here.

The wave is enabled only when active=true, available=true, fault=false and
finite power_w > 0, and the cube is enabled. If a configured entity is missing,
unknown or unavailable it also fails to static. Zero/negative/missing/nonfinite
power, paused/disconnected/offline/fault states never animate when correctly
normalized. Runtime template failures fail to static, not guessed charging.

An SVG **six-sided polygon contour** expands from center toward the fill edges.
Its actual wavefront is hexagonal; it is not a circular gradient clipped into
a hex. The fill clips it; borders, artwork, text and hit surface remain separate.
Transform/opacity keyframes remain the same three-second CSS ease-out. Speed
changes use a phase-preserving Web Animations playback rate, with a single
shared 350ms transition scheduler only while visible rates change. No per-cube
polling, animation timers or continuous JS render loop. It uses the existing cube renderer and numeric sizing.

## Test it safely

1. Paste the synthetic demo, choose an accessible view and turn OS/browser
   reduced motion off. Observe a soft hexagonal contour expanding outward.
2. Set power_w to 0 or active/available to false, fault to true, or enabled to
   false. The cube must remain static; no HA service is called by the demo.
3. Restore positive power and healthy active flags. Resize using a floorplan's
   `size: auto`; contour and fill should remain aligned. See [sizing](FLOORPLAN_SIZING.md).
4. Enable reduced motion, hide the tab or scroll the cube out of view: animation
   stops. Return it to view without changing device state: motion can resume.
5. Repeatedly open/close/remove the card. There should be no leftover overlays.

One shared IntersectionObserver and document/media-query listeners exist only
while eligible cubes are connected. Missing observer/motion support fails to
static. At most **24 visible contours** animate per tab; additional eligible
cubes remain static until budget frees. This protects resources, not a claim
about all hardware/GPU/battery performance. Animation is informational and must
never be the sole indication of active power. Reduced-motion users retain the
same labels/colors and actions. Explicit backgrounds and inactive fill rules
are unchanged.

## Power and fixed speed

The [complete synthetic power demo](../examples/energy-wave-power.yaml) has an
aggregate 10kW (3+7), independently scaled 11kW individual references and a fixed
1400ms cube. These are generic cubes, not a Charger module. No real device or
Home Assistant setup is required for the demo.

| Setting | Meaning |
|---|---|
| speed_mode omitted / fixed | Fixed cycle; old configurations keep 3000ms |
| cycle_ms | Fixed effective cycle; default3000, allowed500–10000ms |
| speed_mode: power | Follow live normalized power_w; requires max_power_w |
| max_power_w | Positive finite reference for this cube, explicitly configured |
| min_cycle_ms | Fastest effective cycle; default900ms |
| max_cycle_ms | Slowest effective cycle; default2200ms |

For power mode, `fraction = clamp(power_w / max_power_w, 0, 1)` and
`cycle_ms = max_cycle_ms + (min_cycle_ms - max_cycle_ms) * fraction`. Thus
small positive power approaches the slow bound and power at/above the reference
uses the fast bound. No under-200W cutoff. Cycle limits must each be500–10000ms,
with min <= max. Mixed fixed/power settings, invalid modes, missing/nonpositive
max power and invalid literal numeric types fail configuration validation.

19400W is an illustrative aggregate reference for 3×28A at400V line-to-line
(√3 ×400×28 ≈19.4kW, power factor≈1), not a promised available capacity or a
universal charger limit. Individual references can differ. The renderer never
adds powers, allocates supply or double counts; map actual measured total for
an aggregate, and each actual individual measurement to its own cube.

The constant CSS timeline is retained; playbackRate =3000/effective_cycle_ms.
Runtime changes ease playback rate over350ms using one shared requestAnimationFrame
scheduler, then stop scheduling. Existing animation identity/current time stay
continuous; no duration-replacement clock jump or DOM replacement per update.
The existing 24-visible-motion budget and all health/visibility/motion gates
remain. Browsers without phase-preserving rate support fail to static.

New numeric fields may use the existing frontend HA **JS** template syntax;
speed_mode stays literal. Jinja strings are not evaluated by the frontend.
Runtime template errors, nonnumeric/NaN/infinite/out-of-range limits suppress
the pulse until valid, and never become untrusted CSS. For an existing measured
sensor with normalized health attributes, this example changes only presentation:

```yaml
type: custom:honeycomb-persistent-control
module: generic
entity: sensor.charging_power_a
name: Power A
tap_action: {action: none}
hold_action: {action: none}
energy_wave:
  active: 'HCJS: return entity.attributes.active === true;'
  available: 'HCJS: return entity.attributes.available === true;'
  fault: 'HCJS: return entity.attributes.fault !== false;'
  power_w: 'HCJS: return Number(entity.state);'
  speed_mode: power
  max_power_w: 11000
  min_cycle_ms: 900
  max_cycle_ms: 2200
```

Replace the synthetic entity with a sensor reporting **watts**, and deliberately
map its real charging/availability/fault semantics. Missing attributes in this
example fail closed; don't invent healthy state or multiply kW incorrectly.
External HA owns measurements/freshness, not this animation primitive.

## Contour color — v1.8.0-beta.7

This addition starts in beta.7 and is **not in immutable beta.6**.
See the [complete inherited-green/custom-blue demo](../examples/energy-wave-color.yaml),
which needs no real device, helpers or service calls.

Omit `energy_wave.color` to inherit the cube's **resolved inner-border color**,
after Light/Sonos state and user `colors.inner_border` overrides. With
`inner_border: auto`, the module's actual resolved status/station color is used,
not the literal word `auto`, the center fill or a hardcoded fallback. The contour
updates live when the resolved border changes.

Set `energy_wave.color: '#00bfff'` to override only the contour. The inner/outer
borders, center, approved 40% gradient, alpha/animation opacity, six-sided
geometry and fixed/power speed remain independent. Existing healthy-state,
visibility, reduced-motion and performance limits still apply.

Supported syntax: CSS hex (3/4/6/8 digits), named colors, `rgb()`/`rgba()`,
`hsl()`/`hsla()`, and browser-supported `hwb()`, `lab()`, `lch()`, `oklab()`,
`oklch()`, `color()`, `color-mix()` and `var(--name, color)` expressions. Use a
defined color variable or a valid color fallback. The browser CSS color parser
is authoritative; Node documentation checks validate structure only. `auto`,
CSS-wide keywords, URLs/SVG paint, style declarations, markup, control characters
and strings longer than 512 characters are rejected. Values are bound through
Lit and the CSS **color** property, never injected as HTML/CSS declarations or
interpreted as an SVG paint URL.

Existing frontend HA JS templates also work, for example
`color: 'HCJS: return entity.attributes.accent;'`. They use the existing template
evaluator and update dependencies; no new expression language or polling.
Invalid literal configuration fails validation. A missing, invalid or throwing
template result suppresses the contour until valid, leaving the cube/actions
usable; it does not silently substitute another color. Color changes retain
the existing Animation and contour node. Power-only changes still cause no
face rerender. Real device health/power normalization remains your responsibility.
