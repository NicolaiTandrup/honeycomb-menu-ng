# v1.6.0-beta.1 — Conditional Visibility and Priority Slots

This pre-release adds live Home Assistant-style visibility conditions and
priority slot placement while preserving Light, Media, Sonos and classic menu
configuration. It addresses #68.

- State, numeric-state, AND/OR/NOT conditions reevaluate without dashboard reload.
- Hidden hard cells remain reserved; priority controls reclaim preferred slots
  ahead of soft/automatic controls. Conflicts and overflow are deterministic.
- Existing show templates remain intact and update live. Hidden targets cannot
  execute actions; drag reflow waits until release/cancel and executes one tap.
- Complete anonymous Charging Hub example: aggregate power, active/total count,
  charger power/vehicle association/permission ring, optional visible vehicles,
  and manual guest controls even with no known vehicles.
- No manufacturer-specific code or charging-session/optimization automation.
- Unit and real button-card Chromium regression tests are included in CI.
- Release publication waits for validated master artifacts and includes checksums.

This is a beta pre-release, not a stable release. Validate real Home Assistant
entities and device actions before relying on the example in an installation.

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
