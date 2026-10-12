## Honeycomb Menu NG v1.4.9 – Bee Asset Repair

v1.4.8 introduced the shared Cute Flying Bee branding correctly in code, but the PNG binary committed to GitHub was corrupted during the binary/base64 upload step.

### Fixed
- Replaced the canonical bee asset with the verified 256×256 approved Cute Flying Bee Mascot PNG.
- Replaced `honeycomb-menu-ng-icon.png` and `honeycomb-menu-ng-logo.png` with the exact same verified bytes.
- Build-time embedding continues to generate the Home Assistant data URI from that canonical asset.

### Regression protection
The test suite now verifies the exact SHA-256 hash and 256×256 dimensions of the approved PNG, in addition to checking that the canonical asset, icon, logo and embedded bundle data are identical.

No UI logic, Light, Sonos, navigation, anchor or layout behavior changes in this release.
