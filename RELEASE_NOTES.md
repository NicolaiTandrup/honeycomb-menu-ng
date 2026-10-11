## Honeycomb Menu NG v1.2.5 – Classic Cell Spacing

This pre-release corrects the remaining visual difference between the inline detail menu and the classic Honeycomb menu.

### Root cause
The classic menu calculates a cell pitch from `size / 3.586`, but the actual visible hex is smaller because each `honeycomb-menu-item` has 2px padding. The inline implementation used the full pitch as the visible hex size, which made cells look too large and crowded even though their centers were positioned correctly.

### Fixed
- Keeps the classic cell pitch.
- Applies the equivalent 2px visual spacing to inline detail cells.
- Uses the classic 114.76% hex aspect ratio.
- Applies the same rule to center, inner ring and outer ring detail cells.

The root Hub layout and multi-Hub inline architecture are unchanged.
