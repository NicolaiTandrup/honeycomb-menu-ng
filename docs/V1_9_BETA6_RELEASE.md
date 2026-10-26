# v1.9.0-beta.6 — published prerelease

Published and independently verified 2026-10-26 (Europe/Copenhagen).

- [GitHub prerelease](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.6); tag `v1.9.0-beta.6`.
- Exact authorized/tested source: `68bf88fe07aae0892705f2680a82f38c0e78848d` on
  `fix/v1.9-beta6-ux-hardening`; [PR #139](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/139)
  remains unmerged. No substitution or source change for publication.
- [Guarded manual publisher](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40334795265): verification and publication jobs/steps
  successful, explicit owner-authorized `publish=true`.
- [Push CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40236365304)
  and [PR CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40236370674)
  are green at that exact source (attempt 1).
- Latest stable remains **v1.8.1**. This is not stable v1.9.0, a master merge or
  external HACS catalog inclusion. No production HA deployment occurred.

## Verified assets

All three public assets were downloaded without authentication and checked against
GitHub digests, sizes, checksums and exact source/CI provenance. JavaScript matches
both tagged Git bytes and the public tagged-root file used by HACS fallback.

| Asset | Bytes | SHA256 |
|---|---:|---|
| `honeycomb-menu-ng.js` | 250854 | `707350de766c562ed95ba37246cb75f377a9a29e91b2b37043c5f5da5b72d42f` |
| `release-provenance.json` | 541 | `f20616f60a4f6146c81ae19350df75844802b2848cc63d03caadd33342713d47` |
| `SHA256SUMS.txt` | 87 | `9a6c5b73da44a7f4f914621e973562137ef4099a4577c7009b788c07c7d01c8b` |

The JavaScript is the **normal HACS runtime**, not the separate development loader
or private `-dev+commit` build. It has the normal beta.6 version banner. `hacs.json`
points to this root filename with `content_in_root: true`. Public GitHub inventory
exposes beta.6 as the newest prerelease while stable selection stays v1.8.1.
Current HACS source filters prereleases unless `show_beta` is enabled. This is
package/API/source verification, not a live HACS installation test.

## Changes and evidence

- OFF Light Hub primary configured name, HA friendly-name/entity fallback, and
  secondary OFF; ON/unavailable, cube-3 Color/White and Hue/Kelvin zoom preserved.
- Human-readable `v1.9.0 beta 6` inside the same golden bee cell during the existing
  interaction; no visible dev hash/suffix, same geometry/animation and diagnostics.
  Reduced motion and detached/repeated animation cleanup covered.
- Existing shared submenu gray defaults/semantic overrides, anchoring/Back,
  Sonos/Radio/Join/Sleep, Charger/editor, sizing/gradient/pulse and coexistence
  protected. Development cache/installer facilities remain separate and optional.
- 381 Node passes, three stable-only skips; six native Sleep boundary contracts;
  337 desktop/mobile/tablet/doc Chromium scenarios and 14 private dev A/B cases.
  Docs: 58 YAML, 38 cards + 11 fragments, 217 links, 16 interactions. HACS/GPL,
  workflow lint/performance and reproducible build checks pass. Fresh local units
  and normal build plus mandatory publisher units/rebuild/asset comparisons pass.
- Preserved 52 previous release records,
  104 previous Git tags and 81
  previous assets, including the private v1.7.1-beta.5 draft; zero overwrites/deletes.
  Master/stable/retention unchanged. No unfinished future module is included.

## HACS install/update

1. If needed, add `NicolaiTandrup/honeycomb-menu-ng` as a **Dashboard** custom
   repository in HACS. Existing custom:button-card remains a frontend prerequisite.
   Catalog submission is separate; no external listing was submitted here.
2. Open Honeycomb Menu NG, choose **Download/Redownload**, enable **Show beta
   versions**, explicitly select **v1.9.0-beta.6** and download. If absent, refresh
   repository information/check updates and reopen the version list.
3. Keep the existing normal HACS JavaScript Module resource (normally
   `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js`) and reload the dashboard;
   refresh the browser cache if stale. Use the existing resource, not a second NG
   copy or the independent `/local/honeycomb-dev/` loader.
4. Tap the bee to confirm `v1.9.0 beta 6`. Exact source is in tag/provenance; normal
   runtime diagnostics use the package version and may have null commit. Do not
   infer version from a resource URL query. No backend/helper migration required.

## Acceptance and limits

Owner tested available **Light/OFF and bee/version** on development Home Assistant
and reports they look good. Sonos/Charger/other module results are automated
regressions, **not full hardware acceptance**. No real HACS install/cache-lifecycle
or production HA test was executed by Codex. Firefox/WebKit and real Raspberry Pi
hardware are untested. Keep #137/#138 open for remaining acceptance/follow-up.

At fixed 82px a 19-cell palette spans 410px, clipping 10px each side on a centered
390px viewport; anchors/Back are preserved. No new paging/shrink policy or full
localization is claimed; built-in labels remain English. New hardware reports
should use synthetic/sanitized entities in public material.

**Stop after this release.** Info Cube #140/beta.7 belongs to a separately authorized
Codex run; no beta.7 development, tag, release or stable promotion is authorized here.
