## Honeycomb Menu NG v1.1.5 – Hub Anchoring & Edit Stability

This pre-release focuses on the new persistent Hub navigation and floorplan editing experience.

### Fixed
- Long-pressing a Hub launcher now opens the next Honeycomb level around the exact tile that was held.
- The promoted launcher becomes both the visual and physical center of the child menu.
- Back navigation restores the previous Hub anchor position.
- Persistent Hub overlays now follow their picture-elements anchor while it moves in Lovelace edit mode.
- Stale Hub overlays are closed when the persistent Hub element is disconnected or remounted.

### Hub interaction
- Short tap toggles the launcher entity.
- Long press opens the detailed Honeycomb control level.
- Hub tiles remain state-aware before opening detailed controls.
- Slot `0` remains the physical Hub center.

### Release automation
This release also adds repository-driven GitHub release automation. Future version bumps can create a tag and GitHub Release automatically from `release.json` and `RELEASE_NOTES.md`.
