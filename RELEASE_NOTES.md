## Honeycomb Menu NG v1.2.11 – Persistent Border & Instant Hub Return

This pre-release fixes the two remaining differences observed after v1.2.10.

### Persistent light border parity
Hub light launchers now preserve the same default gray outer border as a standalone `honeycomb-persistent-control` when the light is on.

The root cause was that embedded persistent controls receive configuration directly through Lit, while standalone controls normally receive the defaults through `setConfig()`. With no explicit `outer_border`, an embedded on-state control therefore allowed the outer polygon to follow the live light color, making the border disappear.

- missing `outer_border` now defaults to `#34383d`
- explicit `outer_border: auto` still follows the live light color
- off-state behavior is unchanged

### Instant persistent Hub return
The persistent Hub base is now explicitly non-animated.

- Hub root tiles appear immediately when the dashboard loads
- returning from menu 2 restores the complete Hub base immediately
- no staggered/floating population of root tiles
- classic Honeycomb menu/detail levels retain their normal animation
- nested menus are unaffected

The new `animate: false` path is used by the persistent Hub root only; normal Honeycomb menus default to `animate: true`.
