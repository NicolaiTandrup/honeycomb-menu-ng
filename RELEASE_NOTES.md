## Honeycomb Menu NG v1.2.3 – Inline Hitbox & Hex Shape Fix

This pre-release fixes the strange behavior visible in v1.2.2.

### Root cause
Adjacent inline Hub tiles still had rectangular pointer hitboxes even though they were visually clipped into hexagons. The transparent corners of one tile could therefore intercept a click or hold intended for a neighboring tile.

### Fixed
- Hit-testing is now limited to the visible clipped hex face.
- Long press uses pointer capture so the pressed tile remains the interaction owner.
- Adjacent tiles no longer trigger the wrong entity.
- Hex borders are rendered by scaling the inner face inside the outer shell for a more consistent Honeycomb shape.

The inline multi-Hub architecture remains unchanged.
