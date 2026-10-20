# Honeycomb NG v1.7.0-beta.2 — Light navigation fix

Fix #78: menu-owned cubes no longer hide themselves when opening nested menus.
Lit reuses those cells during in-place navigation; the old dashboard-launcher
hide/restore logic left a preset and the returned Hub launcher invisible.
Standalone launchers retain their normal hide/restore behavior.

The v1.5.1 Light mapping is unchanged: 100%, brightness preset, Color/White,
standard color/Kelvin preset, −5%, +5%. Color was already present. The reported
empty position is the reused hidden preset cell (physical slot 2 for the first
Light; slot 4 for the second Light in the three-item fixture).

- Preserve the shared 82 px renderer, all Light/Media/Sonos features and drag-select.
- Add desktop/mobile repeated nested/back/close/reopen, preset/capability and
  standalone restore regressions, including Chromium touch input.
- Validate unit/contract tests, production build and the complete browser suite
  before publication; exact results/commit are recorded in the GitHub release.
- Generalize the guarded manual publisher to validated v1.7.0 beta tags, retaining
  exact tag/commit/CI/artifact checks and prerelease=true/latest=false.

This beta is published from PR #77's tested feature commit, **not merged into
restart/v1.5.1**. Master and stable v1.5.1 remain unchanged. Dynamic visibility,
priority placement and Car/Charger are not implemented. Existing narrow-screen
outer-ring clipping and simulated-HA/Chromium-only test limitations still apply.

See [the investigation and slot map](docs/ISSUE_78.md) for details.

---

# Honeycomb NG v1.7.0-beta.1 — Shared Hub and Control Engine

Phase 1 of #76, developed exclusively from `restart/v1.5.1` at
`c1d9507ee48e65b951f6302c668dadf17043c195`. No v1.6 implementation was merged,
cherry-picked or ported.

**This pre-release is published from the tested feature-branch commit. Its PR is
not merged into restart/v1.5.1. Master and latest stable v1.5.1 are unchanged.**

- Hub, standalone Control and managed menu cubes share one full-cell renderer,
  proportional content metrics, configurable fills/rings and action handling.
- Both public components default to a physical width of 82 px. Control selects
  the same modules with `module: light`, `media`, `sonos` or `generic`.
- Preserve logo:auto count behavior. logo:false removes branding while allowing
  ordinary cubes at center slot 0. Empty Hubs do not invent a fallback control.
- Preserve Light palettes/preset apply/store, Media/Sonos playback, group volume,
  grouping, favorites/cache artwork and anchored nested navigation.
- Expandable axial ring geometry removes the seven-item Hub truncation and the
  fixed 18-position core ceiling. Regression coverage renders 50 configured items.
- Forward HA events instead of polling every 200 ms; avoid unchanged model renders
  and continuous Hub anchor RAF. Do not infer unmeasured performance gains.
- Capture checksum-recorded v1.5.1 desktop/mobile visual references and add browser
  checks for painted parity, geometry, module actions, live state and gestures.

## Validation

The release assets are built and syntax/metadata checked from the tagged feature
commit. Unit/contract and Chromium browser results and the exact commit are
recorded in the GitHub release description after final validation. Browser tests
use synthetic HA state/services, deterministic icon glyphs and real pinned
button-card 7.0.1 at desktop/mobile sizes.

## Known limitations

- Dynamic declarative visibility and priority placement are not yet implemented;
  these configuration keys are rejected with a clear later-phase message.
- Car and Charger modules are not implemented.
- Existing `show` remains evaluated when opening/configuring a menu.
- Large anchored scenes can extend beyond narrow viewports; no auto-shrink/paging.
- Continuous CSS-only anchor animations are not followed on every frame.
- Advanced button-card-only template/action contexts need installation validation.
- Actual HA/device integrations and browser engines other than Chromium are untested.

Read [docs/V1_7_PHASE1.md](docs/V1_7_PHASE1.md) for configuration and migration.

---

## Honeycomb Menu NG v1.5.1 – Light State Clarity

This stable patch improves Light status presentation and adds native handling for simple on/off-only lights.

### Light status
- Dimmable light on: shows live brightness percentage.
- Dimmable light off: shows `Off`.
- On/off-only light on: shows `On`.
- On/off-only light off: shows `Off`.
- Unavailable light: keeps the existing gray `Unavailable` presentation.

### On/off-only lights
If Home Assistant explicitly reports `supported_color_modes: ['onoff']`, Honeycomb treats the entity as a simple toggle:
- short tap toggles the light
- no Light detail level is opened on long press
- no meaningless brightness/preset/palette controls are presented

The detection is deliberately conservative. Missing capability information, including temporary remote/unavailable states, does not classify a light as on/off-only.

### Documentation/tests
README, Light documentation and the AI setup contract now document this behavior. Regression tests cover On/Off labels, on/off-only menu suppression and unavailable-state capability uncertainty.
