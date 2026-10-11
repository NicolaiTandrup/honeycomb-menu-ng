## Honeycomb Menu NG v1.3.2 – Lock Module Center

This pre-release fixes center movement across persistent Hub modules and restores native Sonos nested actions.

### Center/anchor rule
Persistent Hub navigation now follows one explicit rule:

1. **Base Hub → selected module:** the center is allowed to move to the physical position of the selected base tile.
2. **Inside that module:** the center is locked.
3. **Any deeper level** (Color, palettes, Radio, Join, etc.) expands around the same locked center.
4. **Back to the Hub base:** the lock is cleared, so selecting another base tile can establish a new center.

This behavior is shared by light and media modules rather than implemented as a Sonos-specific workaround.

### Sonos nested menu repair
v1.3.1 used `action: none` for native Radio/Join navigation. Some wrapped button-card paths suppress that action, so the nested menu could fail to open.

- Radio and Join now use the explicit internal action `honeycomb-open-nested`.
- The nested menu opens directly in the owning local Hub context.
- No global Honeycomb overlay/shade is created.
- The selected Sonos center remains fixed when entering Radio/Join.
- `nested_expand` continues to reuse the existing Honeycomb instance.

### Internal context
Local persistent-Hub contexts now track a `moduleAnchor`. It is created only when leaving the Hub base and is cleared only when returning to the base or closing the context.
