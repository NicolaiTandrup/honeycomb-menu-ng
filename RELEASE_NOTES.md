## Honeycomb Menu NG v1.4.8 – Shared Bee Branding

This pre-release replaces the old hand-drawn embedded SVG bee with the approved **Cute Flying Bee Mascot** PNG.

### One bee everywhere
The exact same optimized PNG bytes are now used for:
- `assets/honeycomb-bee.png` — canonical branding asset
- `assets/honeycomb-menu-ng-icon.png`
- `assets/honeycomb-menu-ng-logo.png`
- the bee rendered inside Home Assistant persistent Hub controls

The Home Assistant copy is embedded as a data URI during the build, so the frontend remains fully self-contained and works without GitHub/internet access.

### UI
- `honeycomb:bee` and blank persistent-control icons render the new right-facing profile bee.
- Tap feedback remains as a short whole-bee flight/bounce animation.
- No menu, Light, Sonos, anchor or layout behavior is changed.

### Regression protection
Tests verify that the three repository PNG assets are byte-for-byte identical and that the generated embedded data URI decodes to those exact same bytes.
