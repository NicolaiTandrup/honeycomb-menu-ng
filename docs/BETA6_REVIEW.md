# v1.9.0-beta.6 candidate review and boundaries

**Unpublished review candidate.** The owner authorized preparation, testing and a
separate local development package, not beta.6 publication or master/stable merge.
Exact final source/checksums/CI are recorded in DEVELOPMENT_STATUS.md and the PR.

## Included / preserved

- Cumulative public beta.5 is the functional foundation; reuse its shared 82 px
  renderer, neutral submenu defaults, anchored navigation and cube-3 palettes.
- OFF Hub Light identification from #137: existing short `name`, HA friendly name
  or readable entity; secondary `OFF`; unchanged ON and unavailable handling.
  Owner confirmed the preceding private build's OFF naming on development HA.
- #138 corrected golden-bee feedback: human-readable release version inside the
  same cell, no technical hashes/suffixes in UI; full diagnostics preserved.
- Development-only permanent loader and verified atomic one-command installer.
  Normal HACS/candidate bundles remain direct resources with normal caching.
- Reproduced bee motion/lifecycle defects fixed narrowly; repeat/detach cancels
  pending animation work and reduced motion suppresses flight but keeps feedback.
- Full inherited Light/Sonos/Charger/Radio/editor/visibility/placement/sizing/pulse,
  original coexistence, documentation and packaging tests remain mandatory.
- CI checksum pipeline now propagates validator failures through `tee`; this
  strengthens failure handling and does not relax any publication guard.

No new YAML key, second renderer, numeric engine, backend, production command,
Climate/Car/guest-Charger feature, HACS catalog submission or retention change.

## Measured limitations and acceptance

Synthetic desktop/mobile tests are not actual HA/Sonos/charger hardware, Firefox,
WebKit or Raspberry Pi acceptance. Four-times CPU throttling is only a lab proxy.
At fixed 82 px, the anchored 19-cell palette spans 410 px; a centered 390 px view
therefore clips 10 px each side. The source preserves its exact anchor and Back
rather than silently shrinking/moving approved cells. Future paging/panning or a
viewport policy needs owner design agreement; no such feature is claimed here.
Existing `size: auto` and numeric configuration remain the sizing controls.

Before publication: owner checks the contained bee text/animation and new private
installer on development HA, palette/zoom/navigation, Sonos, Charger, editor and
multiple instances. Review exact green candidate CI, reproducibility, package,
version and immutable unused-tag/provenance gates; obtain separate publication
authorization. A successful synthetic test or CI run is not that authorization.

## Future modules — reviewed, excluded

| Work | Reviewed state / reusable boundary | Next safe step |
|---|---|---|
| Climate #87 / PR #131 | Separate `feature/v1.10-climate` at `d965f41214085abb1eb52d25948fb5a7d47bd020`; current head CI green. It adds a real capability-based module, cross-entity menu builder and registry adapter on beta.3. | Keep separate; when authorized, reconcile cumulative shared defaults/navigation and rerun exact-source tests instead of importing the older entire snapshot into beta.6. |
| Car #86 | Planning only; blocked on validated Climate reuse. | Reuse explicit Climate entity binding for HVAC; preserve per-item visibility, native units/actions and unambiguous capability discovery. No Car code now. |
| Charger #126/#129 | Rescheduled to v1.12+; no dependable new guest/forecast contract approved for this beta. | Keep existing standalone Charger API. Require external persisted authorization/readback and genuine freshness/identity contracts before UI work; no frontend unplug/guest state machine. |
| HACS #92 | Independent catalog preparation. | Preserve GPL/history/package validation; do not submit an external catalog PR without authorization. |

Reusable improvements in this candidate are covered by shared default/override,
exact anchor/Back, independent context/lifecycle, motion and throttled update
regressions. No speculative domain abstraction or duplicate future-module engine
was introduced just to prepare those features.
