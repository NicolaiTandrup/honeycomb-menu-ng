## Honeycomb Menu NG v1.4.2 – Light Nested Context

This pre-release fixes Light Color/White palette navigation inside a persistent Hub.

### Symptom
Opening Color/White from a Light detail menu could leave the local Hub navigation path and open the palette through Home Assistant's global `fire-dom-event` route. In that path the click position could become the new popup anchor, making the palette appear centered on the Color/White button instead of the module's locked slot-0 center. A global shade could also appear.

### Fixed
- Light Color now uses the internal `honeycomb-open-nested` action.
- Light White/color-temperature palette uses the same internal action.
- Both use `honeycomb_nested_menu`, so the current Honeycomb instance and local Hub context are preserved.
- The module anchor remains the base-selected Light cube for every deeper Light level.
- No global Honeycomb/shade is created when opening a Light palette.
- Persistent controls detect both native and legacy nested menus when reserving the outer layout envelope, so 7 -> 19 cube expansion does not move slot 0.

### Tests
The regression suite now creates deterministic RGB and color-temperature Light states and verifies that both palette controls use native local-context navigation with 12 outer-ring buttons.
