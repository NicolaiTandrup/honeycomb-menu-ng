# Private development builds

Issue #137/#138 candidate: **v1.9.0-beta.6-dev**. This is not a public beta release
or HACS update. Keep the production HA instance and existing HACS/stable resource
unchanged. Use an independent development HA instance: Lovelace resources are
instance-wide, not limited to one dashboard.

## Build and deploy

From a clean, committed development branch:

```sh
npm run build:dev -- --out-dir /tmp/honeycomb-dev
cd /tmp/honeycomb-dev
sha256sum --check SHA256SUMS.txt
```

The output contains a small permanent `honeycomb-menu-ng.js` **loader**, a
`manifest.json`, the complete immutable `honeycomb-build-<SHA256>.js` runtime,
checksums and these instructions. The runtime embeds the source Git commit as
`v1.9.0-beta.6-dev+<12-character-commit>`. The delivery/handoff commit may follow
that source commit and contain generated artifacts only; inspect the manifest.
Do not rename the runtime to the loader's name or deploy only the loader.

1. On the development HA instance only, copy the complete directory to
   `/config/www/honeycomb-dev/`. For later updates copy the new immutable runtime
   first, then loader/checksums, and replace `manifest.json` **last and atomically**.
   Keep previous hashed runtime files while older pages may still use them.
2. Configure **one** Honeycomb NG Lovelace resource, type **JavaScript Module**:
   `/local/honeycomb-dev/honeycomb-menu-ng.js`. Remove/disable the competing NG
   resource on this development instance; do not load stable NG and dev NG
   together. The original Honeycomb namespace can still coexist as before.
3. Reload the dashboard page normally (browser Reload / F5), not only HA's
   dashboard soft navigation. No resource URL/query edit or cache clear is needed
   for subsequent deployments. Open pages keep their loaded build until reload.
4. Tap/click or focus the bee and press Enter/Space. During the existing 430 ms
   flight, its label shows the executing version/commit, then disappears.
   You can also inspect `window.honeycombNG.version` / `.commit` in the console.
5. When upgrading from the earlier **direct runtime at this same URL**, a cached
   old file cannot execute the new loader. Perform a **one-time** browser cache
   refresh when installing the loader for the first time. Thereafter even a cached
   loader performs its manifest check on every ordinary full page reload.

### Caching contract and failure handling

The stable loader performs **one** no-store manifest request with a fresh nonce
per document, then one import of the content-hashed runtime. It does not poll or
request per cube, and deduplicates concurrent loader imports. Native module cache
and a document-wide promise prevent duplicate custom-element registration. It
never attempts to replace classes inside an already running document.

A proxy must forward `/local/honeycomb-dev/manifest.json` requests, honor
cache-bypass requests and/or include their unique query in the cache
key. A proxy deliberately serving stale content while ignoring both cache policy
and query parameters cannot be corrected by client JS: bypass caching for this
manifest path. No such proxy/real HA installation has been remotely verified.
An 8-second timeout, HTTP error, malformed manifest, existing NG runtime or version
mismatch produces a clear console/HA notification; no stale fallback is silently
installed. The build verifies SHA256; deploy checksums with the bytes. This is a
private static-file workflow, not the guarded public release provenance chain.

Normal release/HACS resources continue to load their complete bundle directly;
they do not use this loader, fetch a manifest or receive new caching behavior.
Public packaging/release checks intentionally reject the private `-dev` suffix.
Do not change those guards or publish/tag this candidate.

## OFF lamp names

Existing per-item `name` is the OFF primary label; HA `friendly_name`, then readable
entity ID, are fallbacks. Secondary is `OFF`. A short name is useful at 82 px:

```yaml
type: custom:honeycomb-persistent-hub
logo: auto
items:
  - type: light
    entity: light.zone_a
    name: A
  - type: light
    entity: light.zone_b
```

ON presentation is unchanged. Unknown/unavailable remains `Unavailable`. Existing
explicit secondary-label overrides retain precedence. Long names use the same
shared ellipsis; no new name or styling configuration is necessary. Promoted
submenu Back centers and standalone/classic Light controls remain unchanged.

## Real-HA acceptance (pending)

- Verify two successive deployed builds show different embedded revisions after
  ordinary reload, using the identical permanent resource definition.
- Verify desktop/touch/keyboard bee animation/version, disappearance and no shift.
- Verify multiple OFF lamps/custom short names, fallback friendly names and long
  names; ON/OFF/unavailable transitions, refresh and existing color rings.
- Verify Color/White short/hold, White-only restrictions, recursive zoom/Back;
  smoke-test Sonos Radio/Join/Sleep, Charger and root Hub geometry/style.
- Keep #137/#138 open until owner acceptance is recorded. No live HA command,
  production deployment, official release, tag, merge or retention change is
  implied by this build.
