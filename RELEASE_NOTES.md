## Honeycomb Menu NG v1.3.0 – Native Media Control

v1.3.0 starts a new media-control architecture. Sonos/media state is no longer rendered as a button-card template approximation of the persistent light control.

### Native media persistent control
- Adds `mode: media` to `honeycomb-persistent-control`.
- Media launchers in a persistent Hub now use the same native double-border SVG control architecture as lights.
- Idle/paused media: dark center with a configurable active-color inner ring.
- Playing media: center fills with the same active color.
- Volume percentage is shown natively while playing and hidden otherwise.
- Volume/state changes are read directly from the Home Assistant media_player entity, like light brightness is read directly for lights.
- Default media active color is `#00bcd4`.
- Per-item customization: `active_color: "#..."`.

### Sonos menu
The classic six-slot layout is retained:
1. Volume down
2. Play/Pause
3. Join
4. Volume up
5. Radio
6. Browse

- Volume +/- remain open after repeated presses.
- Native volume +/- automatically target all current `group_members` when the selected Sonos player is grouped.
- When the player is solo, volume +/- target only that player.
- Existing `group_volume_up_script` / `group_volume_down_script` settings are still honored as optional overrides for backwards compatibility.
- Play/Pause now always targets the selected media player explicitly.
- Favorite playback now targets the selected media player explicitly.
- Browse no longer closes the Honeycomb before opening more-info.

### Example Hub item
```yaml
- type: media
  entity: media_player.sommerhus
  name: Sonos
  active_color: "#ff9800"
```

The goal of v1.3.x is the same configuration model already established for lights: short dashboard configuration, native state-aware rendering, and reusable behavior inside the component.
