# v1.9.0-beta.7 — published prerelease for HACS testing

[Public release](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.7).
Owner explicitly authorized beta.7 publication for development HA testing. This is
not stable approval or a merge authorization. PR #141 remains open/unmerged.

- Exact immutable tag/source: `63a9619d27fe503919389f1a51090a2a01193f80`.
- Source branch: `feature/issue140-info-cube-beta7`, unchanged and clean.
- [Publisher 40365698588](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40365698588):
  verify AND publish successful; all steps passed with authorized `publish=true`.
- Exact-source [push CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40358991329)
  and [PR CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40359002833)
  rechecked green, all jobs/steps successful. Guarded preparation 40363365512 was
  earlier `publish=false`; its publish job was skipped, not the actual publication.

## Public assets

| File | Bytes | SHA256 |
|---|---|---|
| honeycomb-menu-ng.js | 267605 | `c5ca926abd3a5dd5f58b7627c65218fff5b1d682b76d97639d94b82b39a7a62e` |
| release-provenance.json | 546 | `90f41dec2dd423157a5fc79a235dc1450ec7cb260426cfaadb3ebc745ae8c2bb` |
| SHA256SUMS.txt | 87 | `67c15697f36bb84fcd961a68570422a0178afe058c26c31eb0d97d2525a9a7e2` |

All three assets downloaded anonymously from the public release and checked
against sizes, GitHub digests, sums and exact-source provenance. The JavaScript
is byte-identical to tagged Git and the public tagged-root file. It is the normal
HACS runtime with banner v1.9.0-beta.7, not the separate development loader.
Provenance pins the exact branch/source and matching CI runs. `hacs.json` confirms
root filename/content metadata; no ZIP-only distribution or helper is required.

Direct local download of GitHub Actions artifacts remains blocked by the workspace
proxy's Azure-host HTTP 403. The guarded publisher successfully downloaded/compared
those artifacts inside GitHub, then verified draft/release asset bytes before
publication. Independent public release downloads above succeeded afterward.
No guard or permission restriction was bypassed.

## Install or update through HACS on the development HA instance

1. If needed, add `NicolaiTandrup/honeycomb-menu-ng` to HACS Custom repositories,
   category **Dashboard**, keeping the existing custom:button-card prerequisite.
2. Open Honeycomb Menu NG in HACS, choose Download/Redownload, enable **Show beta
   versions**, and explicitly select **v1.9.0-beta.7**. It is a prerelease; v1.8.1
   remains latest stable.
3. Use the normal JavaScript Module resource
   `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js`, retaining any HACS-managed
   query tag. When switching this DEV instance from the private loader, disable/
   remove its `/local/honeycomb-dev/honeycomb-menu-ng.js` resource entry before
   enabling the HACS NG runtime. Do not load both NG versions together. Old DEV
   files can remain; do not delete tags/releases or change production resources.
4. Reload the dashboard/browser. If it still executes old HACS code, refresh its
   browser/app cache. Tap the bee: the contained version reads **v1.9.0 beta 7**.
   Console `window.honeycombNG.version` should be `1.9.0-beta.7` without `-dev`.
   The normal runtime's `.commit` can be null; release provenance provides the SHA.

Resource configuration is instance-wide. Perform these steps only on development
HA; Codex has not changed any live HA configuration or executed an installation.
HACS metadata/public beta eligibility is verified; actual HACS/device acceptance
must be performed by the owner.

## What is included / acceptance

The generic read-only [Info Cube](INFO_CUBE.md) supports wrapped text, stacked
blocks, positioned x/y/z text, safe HA bindings, pagination, exact calling-menu
return and fixed 30-second close-all. It reuses the shared renderer and the owner-
approved regular enclosing hex for literal slots 0–7. It preserves all cumulative
beta.6 Light/Sonos/Charger, geometry, navigation, sizing, gradients/pulse and
coexistence behavior. No Climate/Car/CM implementation or charging commands.

Validation: 394 Node passes / three stable-only skips; 387 Chromium scenarios
(including 48 Info cases and 18 documentation interactions); six native Sleep
boundary contracts; 14 private dev/reload checks; build/HACS/GPL/metadata/docs/YAML/
links/performance/workflow lint. Normal and private builds reproduce. Official HACS
repository readiness 40359213589 passed; this checks repository eligibility while
Build/local gates validate the candidate bundle.

Owner tested available beta.6 Light/bee functions positively. New Info real-HA
acceptance remains pending; broader Sonos/Charger coverage is automated, not full
hardware acceptance. Chromium fixtures are synthetic; no Firefox/WebKit, native
pinch, real Pi or live HACS installation claim. Info bounds: 128 blocks, 32768
characters, 64 pages, fixed 30 seconds. Positioned overflow is explicitly limited;
use stack mode for pagination. Existing fixed-82px Light palettes can span 410px.

Owner checklist: try all [five examples](INFO_CUBE.md), tap/keyboard exact return
from root/Light zoom/Sonos/Charger, full 30-second close-all, no click-through or
HA commands, live values/unavailable/empty data, resize/editor/reload cleanup,
and available module smoke checks. Keep #140/#137/#138 open pending acceptance.

## Preservation audit exception

Independent comparison confirms 52 previous public releases and their 81 assets,
all 105 previous tags, latest stable v1.8.1 and master
`c1f178740c8181921033d0d18e0ac8d01afc7ea7` unchanged. No delete/overwrite/merge or
retention-setting calls were issued. The publisher's own before/after release
preservation assertions passed.

The local authenticated API no longer exposes the older private v1.7.1-beta.5
draft ID 419308278 (REST 404, GraphQL null), although the initial inventory included
it and three assets. This does not prove deletion or preservation. Owner UI
confirmation was requested; do not claim independent confirmation of this one
private record or attempt to recreate/delete/modify it. All release state is left
untouched after beta.7 publication while this visibility discrepancy is reviewed.
