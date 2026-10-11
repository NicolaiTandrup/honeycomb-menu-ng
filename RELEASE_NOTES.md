## Honeycomb Menu NG v1.2.6 – Classic Item Renderer

This pre-release removes the separate native hex renderer used by the inline Hub and reuses the exact established Honeycomb item renderer.

### Why
v1.2.2–v1.2.5 tried to duplicate the classic hex geometry with separate inline CSS. The result still did not match the existing menu reliably.

### Changed
- Hub root and detail cells now use `honeycomb-menu-item` directly.
- Shape, spacing, icon/name/label placement and button-card styling are therefore shared with the classic Honeycomb menu.
- Inline Hub cells remain local to each Hub; no global overlay is reintroduced.
- Tap remains a normal toggle.
- Hold opens the local detail level.
- Local nested controls remain supported.

This is the first v1.2 build where the Hub and classic menu intentionally share the same visual cell renderer rather than two implementations.
