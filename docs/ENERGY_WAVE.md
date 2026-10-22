# Six-sided energy pulse — v1.8.0-beta.5

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
Only transform/opacity animate in CSS (three-second ease-out); no JS animation
loop or device polling. It uses the existing cube renderer and numeric sizing.

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
