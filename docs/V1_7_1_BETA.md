# v1.7.1 beta testing

Cumulative **v1.7.1-beta.8** is based on exact published beta.7 source
`737a13c8f1a1020db18e14325a40240708dc2706`. All Sonos visuals, native no-helper
Sleep, Radio recognition/cache, Join grouping, Light Hue/Kelvin zoom, presets,
dynamic slots and 82 CSS-px geometry remain. PRs remain unmerged; explicit real HA
owner approval is required before stable/master promotion.
[Manual beta publisher guards](BETA_RELEASES.md) apply.

## Cumulative beta.8 scope and release gate

Radio, Join and Sleep replace each other as sibling views, including repeat opens.
One Back returns to Sonos main. The three inherit `idle_timeout` (8000 ms default),
including deliberately configured zero. Passive HA updates/discovery cannot renew
the deadline or resurrect an abandoned submenu. Actual nested menus retain history.

Publication requires a NEW unused beta.8 tag at the exact tested branch head after
all matching push/PR CI, metadata, reproducibility and SHA256 checks pass. Preserve
all earlier tags/assets, especially beta.5's unpublished private draft. No master
merge, stable publication or retention operation.

## HACS installation

Open Honeycomb Menu NG in HACS → Redownload → enable **Show beta versions** → choose
**v1.7.1-beta.8**. Keep the existing `honeycomb-menu-ng.js` JavaScript module resource,
then hard-refresh each desktop/mobile dashboard. The existing official HA Sonos
integration/services remain required; no new helpers, scripts or automations.

## Real HA checklist for beta.8

1. Test all Radio/Join/Sleep switch directions, rapid taps and repeated same-view
   opens on desktop and touch. Back once must return to Sonos main; another Back
   returns to the Hub. Standalone Control must close cleanly and restore its launcher.
2. Leave each sibling idle for 8 seconds. Hub returns to its base; Control dismisses
   its overlay. Playback/group updates and room discovery must not extend this.
   Interact shortly before expiry to confirm a fresh deadline; check custom positive
   `persistent.menu.idle_timeout` and intentional zero if used.
3. Open Join during slow registry discovery, then switch, Back, close or leave idle.
   A late response must never reopen a stale view, create extra history or leave an
   overlay behind. Reopen Join and verify fresh rooms and working join/unjoin.
4. Set/cancel native Sleep on the selected coordinator/follower group, switch menus
   and let the UI close. The device timer must remain independent; remaining time
   is only a local estimate. Use the [native timer checklist](SONOS_SLEEP_TIMER.md)
   for physical expiry, browser closure and HA restart checks.
5. Recheck Radio playback/order/artwork/cache and playing/paused volume spacing.
   Exercise recursive Hue and Kelvin zoom, endpoint/middle holds without service
   calls, exact Back, full close/reset, Light presets and dynamic Hub placement.
6. Report only synthetic entities/names publicly. #90/#97/#99 stay open until owner
   validation is documented; #83/#92/#93/#87/#86 remain out of scope. Stable v1.7.1
   still requires explicit owner approval after successful real HA beta testing.

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
