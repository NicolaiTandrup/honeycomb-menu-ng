## Honeycomb Menu NG v1.4.3 – Sonos Visual Polish

This pre-release is isolated to the Sonos module and its regression tests.

### Sonos control layout
- All six Sonos inner-ring controls now use an explicit Sonos-owned grid instead of relying on generic persistent button defaults.
- Volume, Radio and Browse use a consistent two-row icon/name layout.
- Play/Pause and Join use a three-row icon/name/label layout.
- Secondary media/group text is clipped/ellipsized inside the hex instead of pushing the icon/name out of alignment.
- Existing colors and actions are unchanged.

### Radio favorites
- The radio icon remains the fallback when a favorite has no cached artwork.
- When cached favorite artwork/logo exists, the fallback radio icon is explicitly hidden through the button-card icon style.
- The existing logo/background image remains untouched.

### Locked Light contract
The regression suite now also asserts that the Light module contains no `fire-dom-event` navigation path and continues using `honeycomb-open-nested` for Color/White.

### Scope
No core navigation, anchor, layout or Light behavior is changed by this release.
