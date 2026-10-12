## Honeycomb Menu NG v1.4.7 – Unavailable Status

This pre-release adds an explicit status label to persistent Honeycomb controls when their backing Home Assistant entity cannot currently be reached.

### Behavior
- Existing light-gray unavailable colors are unchanged.
- HA state `unavailable` now also shows **Unavailable** as secondary text.
- A missing entity state is treated as unavailable as well.
- Normal off/idle/playing states are unchanged.
- HA state `unknown` is not relabeled.

### Generic implementation
The status is handled by the generic persistent-control layer, so Light/Hue, Sonos/media and future persistent modules all get the same behavior without domain-specific code.

### Optional overrides
- `unavailable_label: Offline`
- `show_unavailable: false`

### Scope
No anchor, navigation, layout, Light, Sonos, favorites or persistent-Hub lifecycle behavior is changed.
