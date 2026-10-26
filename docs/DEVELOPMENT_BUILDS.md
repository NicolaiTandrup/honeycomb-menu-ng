# Development builds and the permanent resource

Current candidate: **unpublished v1.9.0-beta.7**, based on immutable public beta.6
`68bf88fe07aae0892705f2680a82f38c0e78848d`. Info Cube needs owner development-HA
acceptance and separate approval before public beta.7 publication. The private
package embeds `1.9.0-beta.7-dev+<source-commit>`; bee feedback shows the human label
`v1.9.0 beta 7` during its existing animation. No HACS/production resource changes.

## Terminal & SSH add-on installation (no PC or Node required)

Use the exact pinned package URL and installer checksum from the current PR/
development handoff. The package is stored on a separate development-delivery
branch, not a GitHub Release or tag. It includes `manifest.json`, the unchanged
validated loader, a SHA256-named runtime, checksums and `install-dev.sh`.

Download the provided pinned `install-dev.sh`, verify its published SHA256, then:

```sh
sh /tmp/honeycomb-install-dev.sh --url "$HONEYCOMB_DEV_PACKAGE_URL" --www /config/www
```

Set `HONEYCOMB_DEV_PACKAGE_URL` to the exact raw-GitHub directory URL supplied in
the handoff, including its 40-character delivery commit; do not use a moving branch
for a verified installation. This requires curl, jq, sha256sum and ordinary POSIX
tools (cp, mv, cmp, mktemp, grep, wc, tr, mkdir, rmdir, rm). The script fails with
an explicit missing-tool message rather than silently installing unverified files.
Standard Terminal & SSH add-on setups commonly supply these; other add-ons may
need their documented packages. No Windows PC, Git checkout or Node runtime on HA.
The exact download/install command is integration-tested against a local TLS fixture;
actual owner Terminal add-on acceptance remains separate.

The shell installer verifies manifest schema, source/version identity, byte count,
loader/runtime SHA256 and immutable filenames. It downloads all bytes before
changing `www/honeycomb-dev`, locks against concurrent Node/shell installs,
preserves old runtimes, rejects symlinks/conflicts, and replaces the manifest last
using destination-filesystem atomic renames. It only writes static DEV resources;
no HA API, YAML editing, HACS changes or charging commands. Run on the independent
development HA only. A leftover lock after interruption must be inspected first.

Offline package: `sh honeycomb-dev/install-dev.sh --from honeycomb-dev --www /config/www`.
The existing Node installer remains available on Node-equipped workstations.

## One-command update

Extract the supplied development ZIP on a machine with **Node.js 20 or later**
and filesystem access to the development HA `www` directory. Run:

```sh
node honeycomb-dev/install-dev.cjs --www /config/www
```

For a mounted directory, replace `/config/www` with its actual local mount path.
This command verifies the runtime, exact version/source commit, size, SHA256 and
loader checksum; copies only into `www/honeycomb-dev/`; retains older immutable
runtimes; and atomically replaces `manifest.json` last. It does not edit HA YAML,
Lovelace resources, HACS or production assets, contact an HA API or execute services.
Checksum failures, conflicting immutable bytes, symlink targets and concurrent
installs fail clearly. A leftover `.install.lock` after a killed process must be
inspected before retrying; an active install is never overridden automatically.

Configure **one** NG resource, type **JavaScript Module**, once:

```text
/local/honeycomb-dev/honeycomb-menu-ng.js
```

That file is the **small loader**, not the full runtime. Keep the provided
`manifest.json` and `honeycomb-build-<SHA256>.js` beside it. Do not rename the
runtime to the loader's filename. Existing original Honeycomb can coexist in its
separate namespace; stable NG and dev NG cannot register the same elements twice.
Reload the dashboard page normally (Reload / F5) after installing. Open documents
keep their current code until reload; switching views is not a full page reload.
No resource URL or `?v=` edit is needed between development builds.

## Verify what is actually running

Tap/click the golden bee or focus it and press Enter/Space. During its existing
430 ms interaction, **`v1.9.0 beta 7` appears inside that same cell**, then the
normal bee returns. This visual label deliberately omits `-dev`, commits and build
metadata. Future stable/beta versions are derived automatically, not hardcoded.
Reduced-motion users see the contained version feedback without flight motion.

For exact diagnostics use the browser console:

```js
window.honeycombNG.version  // e.g. 1.9.0-beta.7-dev+<12-character-source-commit>
window.honeycombNG.commit   // full source commit for a development build
```

Compare these with the installed `manifest.json`. The normal candidate/release
build shows its package version; its commit field can be null, with exact tagged
source instead provided by the guarded publisher's release provenance. Neither
visible text nor diagnostics are inferred from a resource URL parameter.

## Build your own package

Use a clean, committed checkout of the candidate branch and existing dependencies:

```sh
npm run build:dev -- --out-dir /tmp/honeycomb-dev
npm run install:dev -- --from /tmp/honeycomb-dev --www /config/www
```

The private build flag is passed only to the child compiler. Ordinary
`npm run build` uses normal `1.9.0-beta.7` metadata and direct HACS loading. The
private output includes loader, manifest, hashed runtime, SHA256SUMS, this INSTALL
and self-contained installer. A delivery/handoff commit may follow the compiled
source commit; the manifest and embedded technical identity name the actual source.
Do not publish/tag a private `-dev` package or weaken public version/provenance gates.

## Caching and troubleshooting

- The unchanged loader makes one no-store manifest request with a fresh nonce per
  document, then one import of the content-hashed runtime. No polling or per-cube
  request occurs. Concurrent loader imports share one promise; no class hot-swap
  or duplicate registration is attempted.
- If initially replacing an **old directly loaded runtime at the same URL**, its
  cached code cannot run the new loader. A **one-time** cache refresh can be needed
  for that installation. The owner has verified the loader/cache refresh on their
  development HA; subsequent loader-based updates use ordinary full-page reload.
- A proxy must honor cache bypass or include the manifest query nonce in its
  cache key. A proxy deliberately ignoring both needs a manifest-path exclusion;
  client code cannot repair arbitrary stale proxy responses. New deployment/
  browser/proxy combinations still need owner acceptance.
- An eight-second manifest timeout, HTTP error, invalid metadata, existing NG
  runtime or loaded-version mismatch gives console/HA feedback instead of silently
  using stale code. Install the complete verified folder, remove competing NG
  resources on development HA only, then reload.
- Older hashed runtimes are retained for open pages; this installer never deletes
  them. Their storage grows with development builds. Any later manual cleanup is
  separate, never a release/tag-retention action.
- Production and normal HACS resources still load their bundle directly and do
  not fetch a manifest or inherit development cache rules.

## Acceptance boundary

The owner tested available Light/OFF/bee features in beta.6 and gave positive
feedback. Info Cube in beta.7 still requires owner development-HA checks: all
three authoring modes, literal 0–7 footprint, Danish/long text, page swipe, exact
menu return, 30-second close-all, live bindings, ordinary reload and installer.
Broader Sonos/Charger/HACS lifecycle remains automated evidence unless separately
owner-tested. See [Info Cube](INFO_CUBE.md). No public beta.7 publication, stable
promotion, live production commands or PAHA01 changes are authorized.
