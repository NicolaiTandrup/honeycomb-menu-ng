# Development status — v1.9.0-beta.7 PUBLISHED AND VERIFIED

Updated 2026-10-26 (Europe/Copenhagen). Read AGENTS.md and fresh Git/PR/issue state
before future work. **Do not republish beta.7, merge PRs or start another feature.**
Owner authorized beta.7 for testing only; stable approval remains outstanding.

## Immutable release and exact state

- Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.7
- Exact tag/source: `63a9619d27fe503919389f1a51090a2a01193f80`.
- Branch `feature/issue140-info-cube-beta7` stays unchanged/clean. PR #141 stays
  open, unmerged; no code/source substitution or stable/master merge.
- Normal HACS runtime: 267605 bytes, SHA256
  `c5ca926abd3a5dd5f58b7627c65218fff5b1d682b76d97639d94b82b39a7a62e`.
- Provenance: 546 bytes, SHA256
  `90f41dec2dd423157a5fc79a235dc1450ec7cb260426cfaadb3ebc745ae8c2bb`.
- SHA256SUMS.txt: 87 bytes, SHA256
  `67c15697f36bb84fcd961a68570422a0178afe058c26c31eb0d97d2525a9a7e2`.
- All three public assets anonymously downloaded and verified: digests/sizes/sums,
  exact source/branch/CI provenance, normal banner, tagged Git and public tagged-
  root JavaScript. HACS root filename/content metadata correct; not the DEV loader.
- Latest stable remains v1.8.1; master remains
  `c1f178740c8181921033d0d18e0ac8d01afc7ea7`. Retention untouched; no Variables API
  requests, stable publication, production HA deployment or device/charging calls.

## Completed feature / validation

Info Cube #140 is generic and reuses shared CubeElement. Literal slots 0–7
(owner confirmed) are enclosed by one regular hex: at size 82, 328 × 378.7416px,
center −41/−0.205px relative to slot 0. Paragraph/stack/x-y-z modes, measured
six-side text containment, protective clipping, pagination, explicit safe HA
bindings and empty/stale/unavailable fallbacks. Caller stays mounted/inert with
its stack/slots/anchor; tap/Enter/Escape returns, fixed 30 seconds closes all.
Focus/reopening/async navigation/resizing/removal/multiple-host cleanup covered.
Existing Light/Sonos/Charger/module trees and physical geometry are unchanged.

- Final exact-source push CI 40358991329 and PR CI 40359002833: all jobs/steps
  successful, freshly rechecked before publication. 394 Node passes / three
  stable-only skips; 387 Chromium scenarios including 48 Info cases and 18 docs
  interactions; six native Sleep boundary contracts. Full inherited protection
  for modules, navigation, touch, editor, scaling, gradients/pulse and coexistence.
- Fourteen extra private dev/reload checks; nine Info and eight installer Node
  contracts included. Terminal installer tested over local TLS, two successive
  installs, integrity/path/symlink/lock failure paths and actual pinned public
  GitHub download into disposable local www. No actual HA/Terminal installation.
- Normal/dev/ZIP reproduction, HACS/GPL/package, metadata, docs/YAML/links,
  performance and workflow lint pass. Code-head docs: 59 YAML / 234 links;
  final Markdown handoff separately validated: 60 YAML, 45 cards + 11 fragments,
  255 local links and 18 desktop/mobile documentation interactions. Fifteen extra representative
  paragraph/stack/positioned/mock-plan screenshots outside Git.
- Official HACS repo readiness 40359213589 successful (repo/default-branch
  eligibility); candidate Build/local gates validate this actual bundle.
- Prepare-only run 40363365512: verify successful, publish skipped. Actual owner-
  authorized publisher 40365698588: verify AND publish successful, all steps,
  explicit publish=true. No gate weakening or bypass.
- Local independent Actions artifact download was blocked by workspace Azure proxy
  HTTP 403; the permission request was aborted. No bypass/retry outside permission
  was attempted afterward. Publisher downloaded/compared CI and staged/draft assets
  successfully inside GitHub. Public release downloads independently verified
  afterward, closing the release-byte verification path.

## Preservation audit exception — owner confirmation pending

All 52 prior public release records / 81 public assets and 105 prior tags verified
unchanged. Publisher's own before/after preservation assertions passed. No
release/tag delete, overwrite or force command was issued; old Git history/branches
remain. Source branch and every existing PR were left unmerged.

However, local authenticated REST now returns 404 and GraphQL null for the private
v1.7.1-beta.5 draft ID 419308278 (initial inventory included it and three assets).
Its independent preservation cannot be confirmed from this token/API result.
This does not establish deletion or its cause. Owner UI confirmation was requested.
Do not assert it retained/deleted, recreate it, change it, or issue further release
mutations to hide the discrepancy. Record the owner's confirmation when available.

## Owner acceptance / next authorized work

[Published release and HACS steps](V1_9_BETA7_RELEASE.md) are current. If switching
DEV from private loader to HACS, use exactly one NG resource; retain button-card
and use normal `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js` Module resource.
Show beta versions, select v1.9.0-beta.7, reload; actual version is 1.9.0-beta.7
without -dev. Resources are instance-wide; owner operates development HA only.

Owner tested available beta.6 Light/OFF/bee positively. New Info needs real-HA
acceptance, and wider Sonos/Charger/HACS lifecycle remains automated evidence.
No Firefox/WebKit/native pinch/real Pi or live HACS install claim. Keep #140,
#137/#138 open where acceptance remains pending. Bounds: 128 blocks, 32768 chars,
64 pages, fixed 30s; positioned overflow limited, use stack for pagination.
Existing 410px fixed Light palette clipping remains. No Climate/Car/CM expansion.

Next: owner confirms private-draft UI visibility and tests HACS beta.7/Info modes,
return/timeout, live/fallback data, touch/resizing/editor/reload and available
modules. Wait for feedback/explicit further authorization. Do not repeat completed
implementation, publish another beta or promote stable on automated success alone.

## Handoff/source separation and evidence

This publication documentation is on `docs/v19-beta7-validated-handoff`, separate
from frozen release source; tagged docs necessarily predate publication. PR #141
publication notice points to current evidence. Optional private DEV delivery
`ff4ada2106855edb7cfb5eb2bc54361e7034d700` remains untouched; its runtime embeds
source 63a9619 and has a different development checksum. Do not install its loader
as the HACS bundle. Earlier a8acf8a/fbefc85/b9decd2 are historical checkpoints.

Workspace evidence: `/workspace/build-output/v19-beta7/` includes publisher-run.json,
public-verification.json, public-beta7/ assets, before/after inventories, CI records,
rebuild/HACS logs, complete prior full/validation.json, final-unit.log, empty-info.log,
candidate-dev-validation.log, review/ and Markdown validation. CI `shared-cube-evidence`
contains synthetic desktop/tablet/mobile screenshots. Browser plugin unavailable;
used repository Playwright/Chromium. No owner private config committed.

```sh
git status --short
gh pr view 141 --repo NicolaiTandrup/honeycomb-menu-ng --json headRefOid,state,isDraft
gh run view 40365698588 --repo NicolaiTandrup/honeycomb-menu-ng
gh release view v1.9.0-beta.7 --repo NicolaiTandrup/honeycomb-menu-ng
```

STOP after publication handoff. No stable approval or new feature authorization.
