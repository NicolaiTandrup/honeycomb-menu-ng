# Development status — v1.9.0-beta.6 PUBLISHED AND VERIFIED

Updated 2026-10-26 (Europe/Copenhagen). Read AGENTS.md and live Git/PR/issues before
future work. This release-finalization task is complete. **STOP; do not start
Info Cube #140/beta.7 without a separate run/instruction.** Do not republish beta.6.

## Exact immutable release / source

- Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.6
- Tag `v1.9.0-beta.6` -> exact authorized `68bf88fe07aae0892705f2680a82f38c0e78848d`.
  Branch `fix/v1.9-beta6-ux-hardening` is unchanged/frozen, clean; PR #139 remains
  OPEN, ready for review, unmerged. No master/stable merge or source substitution.
- Normal HACS runtime: 250854 bytes; SHA256
  `707350de766c562ed95ba37246cb75f377a9a29e91b2b37043c5f5da5b72d42f`.
  This is not the development loader/private runtime. Package/lock/release/HACS
  metadata agree; tagged-root and downloaded release JS are byte-identical.
- Other public asset SHA256:
  - `release-provenance.json`: `f20616f60a4f6146c81ae19350df75844802b2848cc63d03caadd33342713d47` (541 bytes).
  - `SHA256SUMS.txt`: `9a6c5b73da44a7f4f914621e973562137ef4099a4577c7009b788c07c7d01c8b` (87 bytes).
- All public assets independently downloaded without authentication; digest/size,
  normal banner, exact Git bytes, sums and source/branch/version/CI provenance
  verified. HACS metadata and public-beta API eligibility checked against current
  HACS filename and show_beta filtering source; no live HACS installation claimed.

## Validation and authorized publication

- Exact push CI 40236365304 and PR CI 40236370674 (attempt 1) rechecked green:
  all jobs/steps successful and artifacts available. Full inherited evidence:
  381 Node passes / 3 stable-only skips; six Sleep boundary contracts;
  337 Chromium desktop/mobile/tablet/doc cases; 14 extra private A/B dev cases.
- Fresh release-task local units: 381 passes / 3 skips; reproducible normal build,
  syntax, HACS/GPL packaging and unchanged Git bundle checks passed. Mandatory
  publisher again ran unit/contracts and compared committed/rebuilt/CI/staged/
  downloaded assets and checksums, with fresh exact branch/CI/tag/release guards.
- Owner explicitly authorized **beta.6 only** in the release-finalization request.
  [Normal guarded publisher](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40334795265), run 40334795265:
  verify AND publish successful; every step passed; `publish=true`. No guard bypass.
- Prior prepare-only run 40237969423 remains read-only historical evidence, not
  this publication. Latest stable remains v1.8.1 at master
  `c1f178740c8181921033d0d18e0ac8d01afc7ea7`.
- Preservation: 52 prior releases, 104 prior Git tags, 81 prior assets retained
  unchanged, including private v1.7.1-beta.5 draft ID 419308278. New totals 53
  releases/105 tags. No deletion/overwrite, production HA action or retention
  setting/API change. Retention remains disabled per owner-established setting.
- Publication documentation follow-up separately validated: 58 YAML blocks,
  38 cards + 11 fragments, 223 local links and 16 desktop/mobile documentation
  interactions pass. Only Markdown files changed on this follow-up branch.
- Publication evidence under `/workspace/build-output/v19-beta6-publication/`:
  fresh-ci.json, unit/build logs, publisher.json, public-verification.json,
  preservation.json, hacs-verification.json, public/ assets and before/after inventories.

## Owner-tested versus automated / known limits

Owner installed/visually tested available Light behavior, OFF names and central
bee/version on development HA and reports they look good. Broader Sonos/Charger,
full HACS cache lifecycle and other module/hardware acceptance remain unavailable
there; keep these as automated-test evidence, not real-hardware claims. No actual
HA installation or production deployment was executed by Codex. #137/#138 remain
open; no broad issue closure. Full test details/screenshots are in PR #139 and
prior preparation evidence `/workspace/build-output/v19-beta6/`.

Contained bee/version, existing animation/reduced motion, same shared geometry,
Color/White/zoom, OFF/ON/unavailable, gray defaults/semantic overrides, Sonos/
Charger/Radio/editor and navigation are the exact tested candidate, unchanged for
release. Private cache-loader/installer facilities are separate, not the HACS asset.

Fixed 82px full palette spans 410px and clips 10px each side on centered 390px
view; anchor/Back remain exact. No paging/shrinking redesign, full localization,
Firefox/WebKit or real Raspberry Pi validation claimed. Existing labels English.

## Documentation follow-up / HACS / stop point

This publication documentation lives on `docs/v19-beta6-validated-handoff`, separate
from the immutable source. Tagged candidate docs necessarily predate publication;
use this follow-up and V1_9_BETA6_RELEASE.md plus public evidence as current state.

HACS: repository Dashboard custom entry if not listed; Honeycomb Menu NG ->
Download/Redownload -> Show beta versions -> select v1.9.0-beta.6; keep the existing
normal HACS module resource and reload/cache-refresh if needed. Do not replace it
with the DEV loader or load duplicate NG resources. Current custom:button-card
prerequisite remains. See V1_9_BETA6_RELEASE.md for complete steps/checksums.

STOP. No Info Cube code/branch/beta.7 was created; #140 is only the next stage
specified for a separate Codex run. No stable v1.9.0, PR merge, HACS catalog
submission or future Climate/Car/Charger expansion is authorized here. Those
branches/issues remain independent. Never overwrite beta.6 or earlier tags/assets.

## Reconstruct before future work (do not repeat release)

```sh
git status --short
gh pr view 139 --repo NicolaiTandrup/honeycomb-menu-ng --json headRefOid,state,mergedAt
gh release view v1.9.0-beta.6 --repo NicolaiTandrup/honeycomb-menu-ng
gh run view 40334795265 --repo NicolaiTandrup/honeycomb-menu-ng
```

Read latest owner instructions for any separately authorized next task. Preserve
master/stable/retention and all releases/tags/history. No production HA commands.
