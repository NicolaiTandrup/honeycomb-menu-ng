## Honeycomb Menu NG v1.2.10 – Classic Dormant Light Launchers

This pre-release completes the visual handoff between the persistent Hub and the classic Honeycomb light control.

### What was still wrong in v1.2.9
v1.2.9 restored the classic Honeycomb menu engine and fixed the global single-Hub limitation, but light launchers in the Hub ring were still rendered as `honeycomb-menu-item` button-cards. That made a dormant light such as Kontor look different from the established classic persistent light control.

### Fixed
- Hub light launchers now render with the real `honeycomb-persistent-control` component.
- A dormant/on light therefore uses the exact classic double-border hexagon, state color, icon placement and brightness label.
- Light launchers no longer show the Hub-specific name + label layout.
- Short tap still toggles the light.
- Long press opens the light's classic Honeycomb detail menu.
- The detail menu opens inside the originating Hub's local menu context, so multiple Hubs remain independent.
- The selected light becomes the classic persistent center while menu 2 is open.
- Non-light Hub launchers keep their existing renderer for now.

### Architecture
There is no new visual approximation in this release. The dormant light tile and the promoted menu-2 center both use the same `honeycomb-persistent-control` implementation already used by the classic standalone control.
