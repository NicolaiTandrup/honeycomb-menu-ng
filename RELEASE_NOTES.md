## Honeycomb Menu NG v1.5.0 – Stable Modular Release

v1.5.0 is the first stable release of the modular persistent-Hub architecture developed through the v1.4 pre-releases.

### Documentation rebuilt

The README is now human-first and describes the current product instead of acting as a chronological release log.

New dedicated documentation:
- `docs/LIGHT_MODULE.md`
- `docs/SONOS_MODULE.md`
- `docs/AI_SETUP.md`
- `docs/CLASSIC_MENU.md`

New copy-ready examples:
- `examples/persistent-hub.yaml`
- `examples/light-presets.yaml`
- `examples/sonos-favorites-cache.yaml`
- `examples/sonos-toggle-member.yaml`

### AI setup contract

A deterministic AI-oriented setup specification now helps ChatGPT/Codex-style assistants:
- ask for real entity IDs
- choose the correct module
- avoid inventing optional helpers/scripts
- configure Light presets correctly
- enable/document Sonos favorites and optional artwork cache
- add Join grouping only when requested
- validate locked-center navigation

### Light preset helpers

Preset storage now supports both:
- `number.*` entities, including device-owned values such as Shelly numbers
- Home Assistant `input_number.*` helpers

This lets physical wall controls and Honeycomb share the same normal brightness/Kelvin/color values.

### Sonos documentation

Sonos setup now clearly separates:
- native group-aware volume (no scripts required)
- official `sensor.sonos_favorites` names/IDs
- optional thumbnail/artwork cache
- optional Join toggle script

The artwork cache remains a Home Assistant trigger-based template sensor by design. It refreshes independently of dashboard/browser sessions and avoids each frontend polling Sonos.

### Project identity

Honeycomb Menu NG is now described as a project that **originated as a fork** of Sian Croser's GPLv3 `honeycomb-menu`. The repository still retains portions of the original implementation and attribution, while NG is documented as its own substantially expanded project rather than merely an "enhanced fork".

### Stable v1.4 foundation included

- modular core
- isolated Light/Media/Sonos modules
- persistent Hub lifecycle fixes
- locked slot-0 module center
- native Sonos in physical slot 0
- live Light/media presentation
- unavailable-state labels
- shared bee branding
- automated architecture/regression tests

This is a normal stable release, not a pre-release.
