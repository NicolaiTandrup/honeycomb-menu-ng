# v1.7.1 beta testing

Cumulative **v1.7.1-beta.7** targets the exact published beta.6 source, retaining
native Sonos device Sleep without helpers, Radio/cache, Join Back and Light Color
Zoom. PRs remain unmerged; real HA owner approval is required before stable or
master promotion. [Manual beta publisher guards](BETA_RELEASES.md) apply.

## Cumulative beta.7 scope and release gate

- Sonos functions use ordinary Light's icon/text layout. Playing station artwork
  sits slightly lower with clear volume text; paused/idle artwork stays compact
  with visible gray fill and station-colored inner border. Same 82 px geometry.
- White's twelve outer-menu swatches are clean Kelvin-color fills without dots
  or visible numbers. Accessible names keep exact values. Tap applies once; hold
  refines using a bounded integer linear Kelvin grid, never circular Hue logic.
  Anchor slot/value, exact Back, close/reset and existing Color zoom are preserved.
- Native Kelvin bounds are required. Minimum client precision is 1 K; hardware may
  quantize. Too-narrow original ranges retain twelve legal samples with repetitions
  and no zoom; further refinement never creates duplicates or out-of-range data.

Publication must use a NEW unused beta.7 tag at the exact tested branch head after
all matching push/PR CI, metadata, reproducibility and SHA256 checks pass. Existing
beta.5 tag/private draft/assets and all published beta tags/assets stay immutable.
No master merge, stable publication or retention operation. Beta.6 remains the
published installation baseline until beta.7's guarded publication succeeds.

## Real HA checklist for beta.7

1. Compare Sonos Pause/Join/Radio/Sleep/volume icons and text with Light. Check long
   text, volume 0/2/42/100%, slightly lower playing artwork, compact paused/idle
   artwork, visible gray fill and station-colored inner border on both surfaces.
2. On a temperature-only Light, open White: twelve filled hexagons, no visible
   dot/code/text. Verify native min/max, exact short-tap temperatures, keyboard and
   touch holds with no HA call, anchored endpoints/middle slots and repeated zoom.
3. Back restores each exact palette; full close/reopen resets to current bounds.
   Check the 1 K zoom limit, narrow/fixed/missing range behavior and real device
   quantization. Do not expect infinite distinct temperatures or display colors.
4. Confirm Color zoom and presets, Radio identity/cache/artwork/playback, Join/Back,
   native Sleep leader/follower/Cancel/expiry/HA restart expectations and dynamic
   Hub placement. Follow the [native timer checklist](SONOS_SLEEP_TIMER.md).
5. Report only synthetic entity/station names publicly. #90/#97/#99 stay open
   until owner validation is documented. #83/#92/#93/#87/#86 are excluded.

## Preserved beta.4 station recognition checklist

PR #95 retains the published cumulative beta.4 station-recognition corrections
and Light Color Zoom. After publication, install cumulative beta.7 using the instructions
below; existing beta tags remain unchanged. The owner's sanitized station/programme tuple is now covered
by unit and desktop/mobile regressions, without fuzzy station matching.
Use [privacy-safe diagnostics](SONOS_MODULE.md#station-recognition-diagnostics)
for unsupported formats. Existing beta tags remain immutable.

1. Select Station Alpha from Radio; compare parent Hub launcher and promoted
   Sonos center. Both should show the cached logo and identical station inner hue.
2. While playing, center fill equals the hue; pause/stop makes the center neutral
   while retaining logo/ring only when identity still matches.
3. Switch to Station Beta while the submenu remains open; test updates without a
   dashboard reload, then return to the parent and compare again.
4. Open Radio/Join and tap the center to verify Back still works with artwork.
5. Test unknown content, missing/failed artwork, grouped leader/follower playback,
   native Join/Unjoin, Sleep, favorite order/playback and Light recursive Zoom.
6. If recognition fails, capture the privacy-safe diagnostic result for each
   surface and the minimal sanitized tuple described in the Sonos reference.

## HACS installation after publication

1. Back up dashboard YAML. In HACS, open Honeycomb Menu NG, choose **Redownload**
   from its menu, enable **Show beta versions**, and select **v1.7.1-beta.7**.
   If needed first add `NicolaiTandrup/honeycomb-menu-ng` as a Dashboard repository.
2. Confirm that the selected version is the beta, download it, then hard-refresh
   dashboard clients/clear frontend cache. Keep the existing JavaScript module
   resource; the asset remains `honeycomb-menu-ng.js`.
3. Verify slots: 1 Radio, 2 Play/Pause, 3 Solo/Join, 4 Sleep, 5 Down, 6 Up.
4. Check favorite order/playback/logos, new ring colors and Join/unjoin via the
   configured script. Confirm current HA favorite IDs/URIs/cache metadata before
   expecting launcher recognition. Unknown metadata must fall back safely.
5. Play, pause, stop and change stations, then test grouped playback. Paused/stopped
   center must be neutral; failed/missing logos must restore the standard icon.
   Check explicit styles and center/back navigation.
6. Review README layout on desktop/mobile in light/dark GitHub themes.

Return the installed beta version, observed HA state and result using synthetic
identifiers in public reports. Beta.1 and beta.2 remain immutable. Beta.3 cumulatively contains all tested
Sonos beta.2 fixes plus Light Color Zoom from independent PR #94. Never move tags.
For Light: open Color; short tap applies once; hold 500 ms refines without changing
the light. Verify slots 7/8/10/18, several zoom levels, exact stepwise back, live
state updates, full close/reopen reset, Shift+Enter zoom and Escape close. Color interpolation and presets remain unchanged; White/Kelvin has its separate
bounded beta.7 zoom. See [the exact grid](LIGHT_MODULE.md#recursive-color-zoom-issue-85-beta3).

Beta.2 also recognizes unique exact radio-channel/favorite/cache-title correspondence
for validated Sonos radio transports. Media titles and fuzzy matching are excluded.
Join discovers real Sonos registry entries; native grouping needs supported
features/services. Beta.6 replaces default Browse with native Sleep; explicit custom
HA Media panel navigation remains possible. Color assignment is stable across reordering
of the same favorite set; changing the set can reassign colliding palette entries.

Every future version must ship an installable prerelease and receive explicit
owner confirmation from real HA testing before merge/promotion or stable
publication. PR #91 cannot merge and v1.7.1 cannot publish stable until that
approval. Stable releases, retention settings, existing tags, branches and history
are not changed by beta publication.
