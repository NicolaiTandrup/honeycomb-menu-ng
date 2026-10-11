## Honeycomb Menu NG v1.2.7 – Classic Renderer Anchor Fix

This pre-release fixes the remaining placement problem after v1.2.6.

### Root cause
The classic `honeycomb-menu-item` was reused, but the inline Hub applied center translation directly to that auto-height custom element. Its visible height is generated internally from the Honeycomb ratio, so the host was not a reliable box for percentage-based Y translation.

### Fixed
- Each inline cell is now positioned through a fixed-size local anchor wrapper.
- The wrapper uses the classic Honeycomb width and 114.76% height.
- The classic menu-item renderer is placed at the wrapper origin with no center transform of its own.
- Root, detail and outer-ring cells all use the same anchor model.
- Multi-Hub inline behavior remains intact.
