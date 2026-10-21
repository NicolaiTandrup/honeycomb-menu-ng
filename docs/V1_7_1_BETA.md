# v1.7.1 beta testing

PR #91 and Light PR #94 remain unmerged. Integration metadata targets **v1.7.1-beta.6** with
`prerelease=true`. It is intended for real Home Assistant/HACS owner testing,
not stable v1.7.1 approval. See [beta publishing](BETA_RELEASES.md) for the
branch-independent, explicitly authorized publication workflow.

## Cumulative beta.6 candidate and release gate

Based on exact beta.4, retaining recognized station artwork/colors and owner-tested
Light Zoom. Adds responsive playing/paused artwork, deterministic Join Back and
slot-4 Sleep. Includes terminology PR #96 without a master merge.

**Sleep now uses official Sonos set/clear actions with no manual HA setup.**
The speaker owns the countdown. Remaining time is a local estimate, discarded on
reload/reconnect; HA does not expose actual remaining seconds. [Native timer
behavior and real HA checklist](SONOS_SLEEP_TIMER.md).

**Beta.6 is a candidate, not a published release.** Existing beta.5 tag
`74c3b166088242965c7e8270062d99511f70597f`, unpublished draft and uploaded assets
remain frozen. Do not publish that helper-backed draft. Safe next path: review the
separate native-timer PR, validate matching push/PR CI and reproducible HACS bundle,
then obtain explicit owner approval to manually publish a new unused beta.6 tag
from that exact branch head. No tag reuse, overwrite, master merge or retention
operation. All publisher guards still apply. Latest public installable cumulative
beta remains beta.4 until a new release is successfully published.

## Preserved beta.4 station recognition checklist

PR #95 retains the published cumulative beta.4 station-recognition corrections
and Light Color Zoom. After publication, install cumulative beta.6 using the instructions
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
   from its menu, enable **Show beta versions**, and select **v1.7.1-beta.6**.
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
state updates, full close/reopen reset, Shift+Enter zoom and Escape close. White/
Kelvin and presets remain unchanged. See [the exact grid](LIGHT_MODULE.md#recursive-color-zoom-issue-85-beta3).

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
