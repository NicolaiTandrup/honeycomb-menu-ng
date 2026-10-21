# Charging-wave renderer primitive — isolated research (#104 / #105)

Not imported by production code or included in any beta. No Charger adapter,
Easee state/actions, scheduling, HA calls, browser service timer or backend exists
here. This is a CSS overlay capability study, not another production renderer.
Demo geometry uses the exact existing fill polygon/scales and synthetic data.
After owner review, port the overlay into the **existing** shared fill layer;
do not copy this mock shell into a production module.

Normalized input requires active + available + positive finite numeric powerW,
no fault, explicit enabled flag not false. Merely connected/ready, paused, fault,
unavailable or zero/missing/stale power must not animate; freshness belongs to the
future capability adapter. Set active/available false for stale measurements.
There is no heartbeat/polling or JS animation interval. Static radial texture
animates only transform and opacity over three seconds, clipped inside fill.
Borders and text layers are unchanged. No will-change is forced on every cube.

IntersectionObserver limits motion to visible samples; page visibility hides
motion, reduced-motion disables it, missing observer falls back to static, and
dispose disconnects observer/listener. A production host should share observers
across instances and disconnect on removal; this small study attaches one per
sample to make ownership/lifecycle explicit. Test browser/driver, GPU/layer
memory and real tablet power before adopting. CSS efficiency is a design intent,
not a measured battery-life claim.

`primitive.test.js` verifies positive-power/state gates. Browser study creates
180 synthetic 82px samples, checks reduced-motion/offscreen/page-hidden/disable
behavior and records creation/render metrics. It has no service calls or real
charger test. A production animation flag/config shape is **not finalized**;
use the shared presentation contract after owner review. Future Charger passes
normalized state, never renderer-side Easee strings. Static fallback must remain
readable and show identical status/accent information.
