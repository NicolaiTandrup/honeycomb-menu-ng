## Honeycomb Menu NG v1.2.9 – Classic Multi-Instance Hub

This pre-release replaces the experimental v1.2.x inline Hub renderer with the proven classic Honeycomb renderer used by v1.1.5, while removing the old global single-menu limitation.

### Root cause
v1.1.5 rendered a persistent Hub correctly because it opened the normal `honeycomb-menu` renderer around the dashboard anchor. However, the classic menu manager stored only one global active menu, so multiple persistent Hubs could not coexist.

v1.2.2–v1.2.8 tried to solve the multi-Hub problem by drawing Hub cells locally. That removed the singleton limitation, but created a second renderer whose sizing and positioning could drift from the classic Honeycomb.

### Changed
- Restores the v1.1.5 persistent Hub implementation as the visual/rendering baseline.
- Persistent Hubs again use the exact classic `honeycomb-menu` and `honeycomb-menu-item` renderers.
- Adds an independent menu context for each persistent Hub.
- Multiple persistent Hubs can now stay open at the same time without closing each other.
- Nested menus, promoted centers, back navigation and re-anchoring stay inside the originating Hub context.
- Local persistent Hub menus do not render the fullscreen popup shade.
- Standard popup Honeycomb menus continue using the existing global manager and behavior.

### Geometry
The persistent Hub once again uses the classic size relationship:

```
menu.size = anchorWidth * 3.586
itemSize  = menu.size / 3.586
```

This makes the rendered Honeycomb item width exactly match the dashboard anchor width, as it did in v1.1.5.

This release intentionally removes the duplicated v1.2.x Hub geometry instead of trying to approximate the classic renderer again.
