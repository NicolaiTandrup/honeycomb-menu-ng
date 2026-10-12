## Honeycomb Menu NG v1.4.6 – Native Sonos Slot 0

This pre-release fixes the remaining no-logo three-item Hub issue where a Sonos item assigned to physical center slot 0 still rendered/behaved like a generic center button.

### Root cause
The Hub decided whether slot 0 was a native persistent control by inspecting the generated launcher's private `_persistent_launcher` flag. Ring rendering already knew how to use that flag, but slot 0 has a separate center path and could still fall back to the classic `center_button` route.

### Fixed
- Sonos now explicitly declares `launcherKind: persistent` as part of its module contract.
- A new core `hub-launcher` helper converts a resolved module launcher into a deterministic center descriptor.
- Slot 0 renderer selection now uses the module contract, not an incidental/private launcher flag.
- A Sonos center keeps:
  - `mode: media`
  - its real media entity
  - active color / live media presentation
  - native hold-to-open submenu
  - normal media tap action
- Generic center items still use the classic `center_button` path.

### Regression test
The test suite now builds the actual `type: media` / `media_player.sommerhus` Sonos launcher in slot 0 and verifies that it normalizes to a native persistent media center with its submenu intact.

### Scope
The v1.4.5 bee/edit lifecycle fixes and the locked Light behavior are unchanged.
