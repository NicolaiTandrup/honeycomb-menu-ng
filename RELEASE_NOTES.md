## Honeycomb Menu NG v1.2.8 – Exact Classic Card Rendering

This pre-release fixes why v1.2.6 and v1.2.7 still did not visually match the classic Honeycomb.

### Root cause
The Hub reused `honeycomb-menu-item`, but still changed the wrapped `custom:button-card` from the classic `position: fixed` layout to an inline `position: relative` layout. The transformed Honeycomb parent is what makes the classic fixed card size and clip correctly.

### Fixed
- Removes the Hub-only button-card positioning special case.
- Hub cells now use the exact same wrapped-card layout as classic Honeycomb items.
- Keeps the v1.2.7 local anchor wrapper only for positioning the whole classic cell.
- Multiple inline Hubs remain independent; no global popup overlay is restored.

This release intentionally stops approximating any part of the classic cell renderer.
