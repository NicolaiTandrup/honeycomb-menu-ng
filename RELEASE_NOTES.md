## Honeycomb Menu NG v1.4.7 – Unavailable Status

This pre-release adds an explicit unavailable status to native persistent controls.

### Behavior
- Light entities that are unavailable keep the existing gray unavailable styling and now show `Unavailable` as the secondary label.
- Media/Sonos entities use the same behavior.
- Missing/unknown entity state follows the same unavailable presentation path.
- Normal brightness and volume labels are unchanged.

### Scope
Only Light/Media presentation adapters and their regression tests are changed. Navigation, anchor behavior, Sonos menus and Light controls are untouched.
