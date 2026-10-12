## Honeycomb Menu NG v1.4.1 – Base Cube Geometry

This pre-release is deliberately limited to the persistent Hub base geometry.

### Fixed
- Persistent Hub base cubes now use the full physical Honeycomb cell.
- The apparent gap between the base center and slots 2/4/6 now matches the classic/detail Honeycomb spacing.
- The actual center coordinates and ring navigation geometry are unchanged.
- Light/Sonos detail menus keep their existing inset persistent-center face and are not resized by this fix.

### Architecture
The persistent hex face geometry is defined in the generic layout core:
- `inset` — existing persistent/detail center geometry.
- `cell` — full-cell geometry used by the Hub base.

The Hub selects `cell` through `base_face_mode`; domain modules do not control base geometry.

### Tests
The core regression suite now verifies both persistent hex geometries before the bundle is built.
