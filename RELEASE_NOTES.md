# v1.9.0-beta.4 — Capability-aware Light and anchored submenus

Cumulative prerelease from published beta.3, through the existing unmerged v1.9.0
candidate. No master merge or stable publication. Climate/Car and later Charger
redesign/guest authorization are excluded.

- Light uses advertised HA `supported_color_modes` to expose Color and/or White.
  For dual-capability lights, tap opens the current `color_mode` palette; hold
  opens the other supported palette. Center labels show displayed/alternative
  palette. UI navigation sends no light commands and manual selection survives
  passive HA updates. Off/null mode can use bounded entity/session memory; safe
  supported fallback otherwise. Fixed-white retains brightness, on/off-only toggle.
- Color and Kelvin selections recheck live capabilities/unavailability. Existing
  swatches, recursive zoom, native Kelvin limits, presets and Back remain intact.
- Shared promotion keeps the clicked cube at its pixel center at deeper levels;
  it becomes logical slot 0. Back restores each prior saved anchor. Existing
  Light expansion and Sonos Radio/Join/Sleep sibling navigation remain intact.
- Charger detail actions use neutral-gray inner borders, with explicit per-item
  overrides respected. Root status colors, selected center, outer borders, pulse,
  controls and current/aggregate measurements remain intact.
- Includes all beta.3 Radio artwork containment, two-row Charger labels,
  dashboard editor ownership, responsive sizing and coexistence fixes. Native
  Sonos Favorites/Join/Sleep, shared 82px geometry, gradients, energy-wave color
  and power speed, visibility/slots and pointer/touch behavior are preserved.

Validation: complete mandatory Build CI and manual beta publisher must pass at the
exact source commit. They validate unit/contracts, full Chromium desktop/mobile
(including Light/Sonos/Charger/editor/Radio), docs/YAML, performance, HACS/license,
workflow lint, reproducible committed/rebuilt/CI/staged bundles, SHA256 and provenance.
Public release notes/provenance identify the exact runs and checksum.

Known limits: synthetic HA tests do not establish real-device acceptance. Firefox,
WebKit and actual hardware are not covered. Large anchored palettes retain the
existing small-screen envelope/clipping behavior; this release does not redesign
protected Light/Sonos geometry. No new configuration keys are required. Retention
stays disabled; previous tags/releases/assets, including the private beta.5 draft,
remain untouched.

## Owner Home Assistant acceptance

1. HACS → Honeycomb Menu NG → Redownload → show beta versions → select
   `v1.9.0-beta.4`. Keep the existing resource path, then refresh dashboard/cache.
   Manual install: use only this release's `honeycomb-menu-ng.js`, verify against
   `SHA256SUMS.txt`, replace the existing local resource and refresh the browser.
2. Dual-capability Light: open while in White, then Color; confirm short tap follows
   mode and hold switches both ways. Check center labels, off/null mode, unavailable
   recovery and groups. Navigation/long press must never change the lamp itself.
3. White-only: no Color alternative. Fixed white: brightness only. On/off: toggle
   only. Test Color and Kelvin recursive hold/Back and an actual chosen swatch.
4. Charger overview at root and inside a real parent menu: promote different cells,
   check no center movement and exact Back restoration; repeat at auto/fixed sizes.
   Detail action inner borders gray; explicit overrides and root status stay correct.
5. Smoke-test Radio artwork/favorites, Join/Back, native Sleep, Light presets,
   touch/idle close, editor positioning, charging measurements/pulse and coexistence.
   Use owner-approved targets for any deliberate device commands.

Keep #133/#134 and relevant hardware-acceptance issues open until owner feedback.
Stable v1.9.0 requires separate explicit owner authorization and a new approved pin.
