## Honeycomb Menu NG v1.2.4 – Classic Inline Detail Geometry

This pre-release corrects the scale and spacing of inline Hub detail controls.

### What was wrong
The inline Hub was using the persistent launcher size (for example 82px) as the size of every detailed control cell. The original Honeycomb menu does not work that way: its cell size is calculated from the overall menu size.

### Fixed
- Root Hub tiles keep their configured persistent size.
- Detail controls use the original Honeycomb formula: `menu_size / 3.586`.
- Default `menu_size: 250` gives ~69.7px cells, matching the established seven-cell Honeycomb appearance.
- The selected Hub tile remains at exactly the same center coordinate while the detail ring opens around it.
- Nested outer-ring controls use the same classic detail size.

Multiple inline Hubs remain independent and no global overlay is used.
