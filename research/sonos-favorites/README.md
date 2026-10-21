# Sonos Favorites without mandatory template YAML — design proof (#93)

**Research only, 2026-10-21. Not imported by the production entry point, not
installed by HACS, and not enabled by dashboard configuration.** No HA files,
entities, services or user configuration are modified. Existing
`favorites_sensor` / `favorites_cache_sensor` and optional template cache remain
supported unchanged. No release is requested from this branch.

## Evidence and recommendation

Current first-party Home Assistant sources:
[WebSocket browse contract](https://github.com/home-assistant/core/blob/dev/homeassistant/components/media_player/__init__.py),
[Sonos browse implementation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/sonos/media_browser.py),
[Sonos player delegation](https://github.com/home-assistant/core/blob/dev/homeassistant/components/sonos/media_player.py).
The audit source commit is recorded in the PR checkpoint; revalidate API support
against the user's installed HA version before production implementation.

`media_player/browse_media` accepts `entity_id`, optional `media_content_type`
and `media_content_id`. Sonos accepts type `favorites`, ID empty string; this
returns `favorites_folder` children, which are browsed serially by their exact
returned type/ID. Folder leaves expose `favorite_item_id`, FV ID, title and
thumbnail (including HA-signed proxy URLs). They **do not expose a playback URI**.
Do not scrape station websites, embed tokens, invent an FV-to-stream conversion,
or assume every favorite type is a radio station.

The official favorites sensor remains the authoritative ID/order source. Browse
metadata supplies thumbnail enrichment in the same shape as the existing cache.
For playing-station recognition, retain the existing exact ID/URI or strict,
corroborated `Station Alpha · Programme` channel strategy; ambiguous channels
remain unknown. This proof shows thumbnails are feasible without template YAML,
not that browse data solves arbitrary stream-URI identity.

**Recommendation:** a narrow, opt-in frontend metadata provider first, subject to
owner architecture approval. Keep the optional existing HA template cache as
explicit first-choice data when configured; fallback to frontend browsing only
with documented opt-in precedence. No forced backend integration.

| Option | Setup / persistence | Costs and limits |
|---|---|---|
| Supported frontend browse | No templates; HA WebSocket permission; browser-memory cache | Metadata available, per-connection dedup; browser reload refetches; tabs are separate; no universal URI mapping |
| Existing template cache | Optional manual template setup; shared HA sensor | Already working across browsers/restart; no forced migration; remains fallback |
| Optional backend integration | Separate HACS Integration repository + HA config flow/restart | Central cache possible, but extra lifecycle/support/security cost; NOT approved or bundled by Dashboard plugin |

A Dashboard plugin cannot silently install Python or edit HA configuration.
If central persistence is later necessary, propose a separate integration with
UI config flow, one config entry per verified Sonos household, a coordinator,
registry-owned diagnostics/metadata entity and an explicit unload lifecycle.
That is an alternative proposal, not implementation authorization.

## Isolated proof

`prototype.js` accepts an authenticated connection's `sendMessagePromise`, an
already verified online Sonos coordinator, and an official FV map. It only issues
read-only HA browse requests; it never fetches thumbnails or arbitrary URLs.
It preserves favorite-map order, validates IDs/URLs, rejects duplicate identities,
deduplicates pending work by connection/coordinator/map, caches for five minutes,
serializes at most eight folders and 512 leaves, and caps contexts at 32. Failure
is surfaced without retry/polling; production must handle it as safe generic-icon
fallback. No station metadata is logged.

Connection WeakMap prevents sharing authentication across users/connections.
A module-scoped provider instance would share cache across cards in **one tab**;
there is no cross-tab dedup/persistence. Reload or HA reconnect creates a fresh
context. A favorites rename/reorder invalidates the key; TTL/manual invalidation
is still needed for unchanged-map artwork changes. Old data must not become a
wrong station. Group resolution stays in the existing verified grouping logic;
caller must validate current group/coordinator before requesting and before
applying a result. Two households/offline players must not share a result.

Synthetic tests verify request shape, map order, concurrent panels, expiry/map
changes, connection/player isolation, safe artwork fallback, offline no-retry,
bounded in-flight contexts and compatibility with real FV/stream/programme-shaped
station recognition. Run `node --test research/sonos-favorites/prototype.test.js`.
They do not verify physical Sonos, auth permissions or every HA version.

## Production approval gates / remaining limitations

- Review provider configuration/precedence before adding any public YAML key.
- Integrate live subscriptions without per-cube polling; debounce map changes and
  reject late responses after group/config/connection changes or disposal.
- Add a bounded timeout/cancellation policy: this small proof leaves unresolved
  transport promises to the connection; it is not a production request manager.
- Signed thumbnail expiry, API errors, HA restart, browser reload, multiple tabs,
  no sensor, huge/offline libraries and household switches need real HA tests.
- Add browser fixtures for logo fallback, live artwork updates and existing cache
  precedence. Do not publish a beta or silently change working Radio behavior
  until the architecture is approved and complete regressions pass.
