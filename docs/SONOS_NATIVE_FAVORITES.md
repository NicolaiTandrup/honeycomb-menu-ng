# Optional native Sonos favorite artwork — v1.8.0-beta.4

This beta can retrieve favorite thumbnails directly through Home Assistant's
supported, authenticated **read-only** `media_player/browse_media` WebSocket API.
No `templates.yaml`, helper, script, automation or backend integration is needed
for this option. The official Sonos favorites sensor must still be enabled; its
actual entity ID, favorite IDs and ordering remain authoritative.

## Copy, replace IDs, test

[Complete Hub example](../examples/sonos-native-favorites.yaml):

```yaml
type: custom:honeycomb-persistent-hub
logo: false
size: 82
items:
  - type: sonos
    entity: media_player.player_a
    name: Player A
    favorites_sensor: sensor.favorites_a
    favorites_browse: true
```

Standalone Control uses the same option:

```yaml
type: custom:honeycomb-persistent-control
module: sonos
entity: media_player.player_a
favorites_sensor: sensor.favorites_a
favorites_browse: true
```

Replace the synthetic IDs with the actual available Sonos player and enabled
favorites sensor from HA. Leave `favorites_browse` absent or `false` for the
existing sensor/cache-only behavior. Only literal booleans are supported. This is
a **v1.8.0-beta.4+ option**, not supported by v1.7.1 stable or beta.3.

## Precedence and fallback

1. `favorites_sensor` defaults to `sensor.sonos_favorites`. It must expose an
   `attributes.items` map such as `{"FV:2/57":"Station Alpha"}`. Without that map,
   browsing is not attempted; browsing alone never populates Radio or playback IDs.
2. `favorites_cache_sensor` continues to default to `sensor.sonos_favorites_cache`.
   Existing templates and the [optional cache recipe](../examples/sonos-favorites-cache.yaml)
   remain supported unchanged. Configured cache entries take precedence **by exact
   favorite ID**. A valid configured thumbnail/title/type is never replaced by
   browse metadata; only missing fields/invalid artwork may be supplemented.
   Duplicate cache identities stay ambiguous; native browsing does not conceal them.
3. With `favorites_browse: true`, missing metadata comes from Browse Media. Sonos
   returns `favorites_folder` children of `favorites`; only those exact returned
   folders are read. Favorite leaves supply FV ID/title/thumbnail. Native enrichment requires both
   exact FV ID and agreeing sensor/browse favorite title (Unicode normalization
   and outer whitespace only); stale or foreign-library collisions fall back.
   Existing explicit cache labels retain their established compatibility. No services,
   playback commands, stream scraping or HA configuration writes are involved.
4. Radio keeps sensor order and its existing twelve physical choices/playback IDs.
   Artwork updates live. Opted-in Radio uses the shared image-error fallback: a
   broken image restores the radio icon/title. A valid known playing station also
   updates the parent launcher and promoted Sonos center. Paused/idle fill remains
   solid neutral; active fill retains beta.3's 30% edge darkening.

Browse Media does **not** provide a universal FV-to-stream URI mapping. Existing
strict exact ID/explicit URI or corroborated radio-channel/programme recognition
is retained. Ambiguous names, arbitrary track titles and unknown stream URLs
never identify a station. Such playback keeps the standard Sonos presentation;
its Radio favorite may still have a thumbnail. No automatic identity learning.

## Lifecycle, limits and performance

The cache is browser-memory only, shared by cards in **one tab and HA connection**.
Other tabs fetch independently. Browser reload starts fresh; no local storage,
new sensor or shared global authentication state is created. Separate connections,
players/coordinators and favorite ID/name maps cannot share results. A follower
uses only its available reciprocally verified coordinator. Known non-Sonos
registry entries and unavailable/unknown groups do not browse.

Limits: 32 active cached contexts per connection, 512 map entries/returned leaves,
eight folders and **two actual outstanding WebSocket reads**. Oversized or
unexpected data falls back safely. A 120 ms debounce coalesces rapid state/config
changes; an eight-second operation deadline bounds waiting, including queued work.
Cancellation invalidates application ownership; the HA WebSocket API has no
request-abort operation. An unresolved transport retains its concurrency budget
until reply/disconnect, preventing an accumulation of hung reads.

One shared five-minute expiry refresh runs only while a context has connected
consumers, to refresh changed/signed thumbnail URLs even when the map is unchanged.
There is **no per-cube polling**. Reorder reuses the cache; rename/deletion, group or
connection changes invalidate the appropriate context. API/permission/schema
failure uses a 60-second negative cache; a later relevant state update/reopen can retry,
without an automatic failure-retry loop. Disconnect/HA restart invalidates all
results; ready/reconnect refetches. Removed cards release listeners/timers and
logically cancel unowned pending work. Late responses cannot restore an old group
or reopen a menu. Complete configured caches need no browse at all.

Thumbnails are validated image locations returned by HA, including its signed
proxy URLs. Images load normally in the dashboard browser, which must be able to
reach them. Failed artwork falls back; a later successful refresh can retry.
No raw station names, entity IDs, URLs/tokens or backend exception strings are
logged. Explicit cube diagnostics add only a finite `browse` status (`ready`,
`pending`, `unavailable`, `offline`, `not_requested`); normal errors are icon fallback.

## Real HA acceptance checklist

- Enable the official favorites sensor, opt in, confirm thumbnails without templates.
- Check Radio order/actions and both launcher/promoted-center station images; switch
  stations, pause/play, unknown content and ambiguous names. Volume stays legible.
- Add a cache sensor: its valid artwork wins; missing artwork can use browsing.
- Join/unjoin or select a follower; confirm metadata follows the verified group.
- Reload browser, restart/reconnect HA, test offline/permission failures and recovery.
- Leave a panel open beyond five minutes; verify renewed artwork, no request flood.
- Check Light Hue/Kelvin zoom, Sonos Sleep/Join/Back/idle and original/NG coexistence.

Synthetic unit/browser CI proves the client contracts; it does not replace owner
real Sonos/HA validation. This optional feature requires that beta approval before
stable. No backend integration or live HA setup is installed by the HACS bundle.
