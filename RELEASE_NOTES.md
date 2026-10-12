## Honeycomb Menu NG v1.4.5 – Persistent Hub Lifecycle

This pre-release fixes three persistent-Hub lifecycle/base issues observed in Lovelace.

### 1. No transient bee when a module returns/closes
The underlying `honeycomb-persistent-hub` element is only a bootstrap anchor while the real base Honeycomb is auto-open.

- The bootstrap element now stays hidden for auto-open Hubs.
- Local module idle timeout returns in-place to the Hub base instead of closing and reopening the entire Honeycomb.
- This removes the short default-bee flash between a detail module and the persistent base.

### 2. Native module support in physical slot 0
A no-logo base can place a real item in center slot 0.

Previously a native persistent launcher placed there was converted to a generic `center_button`, which broke Sonos native visuals and hold-to-open behavior.

- Native Light/Media/Sonos launchers now remain `honeycomb-persistent-control` when assigned to slot 0.
- Sonos center therefore keeps its media active color/volume presentation and native interaction.
- Generic/non-persistent center buttons keep the existing classic path.

### 3. Stable Lovelace edit-mode lifecycle
Lovelace edit/preview can disconnect and recreate cards before CSS close animations finish.

- Local Hub contexts now have a synchronous dispose path.
- A disconnected Hub immediately removes its menu overlay, timers and global pointer listeners.
- Scheduled auto-open RAF work is cancelled on disconnect.
- Reconnected Hub instances schedule one clean base render.
- Old preview/card instances can no longer leave ghost/duplicate base cubes after exiting edit mode.

### Scope
Light Color/White navigation from v1.4.2 and Sonos favorite/control behavior from v1.4.3/v1.4.4 are left unchanged.
