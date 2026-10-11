## Honeycomb Menu NG v1.2.2 – Native Inline Hub Tiles

This pre-release replaces the broken wrapped-card rendering in the inline Hub with native local hex tiles.

### Fixed
- Removes the collapsed vertical-line rendering introduced in v1.2.1.
- Hub hexagons are rendered directly as local CSS-clipped tiles.
- Multiple Hub instances remain fully independent.
- Short tap toggles the root entity directly.
- Long press opens the selected tile's local detailed controls.
- Detail service actions run directly through Home Assistant.

The normal Honeycomb popup/menu engine is unchanged.
