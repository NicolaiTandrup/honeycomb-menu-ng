# v1.8.0 stable candidate — audit and final release checklist

**Preparation only. No merge or publication is authorized.** The owner reports
successful real-Home-Assistant testing through beta.7 with no outstanding defects.
This is functional acceptance, separate from final publication. The sole owner/user
has already migrated to 1.8 and selected v1.8.0; no separate migration guide or
additional legacy compatibility work is requested. Latest public stable/master
remain v1.7.1.

## Authoritative source and integration

Public [v1.8.0-beta.7](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.8.0-beta.7)
is commit `58e26543f13020912e6188a75863ecf06a2a2df4`, source tree
`92d6f3ce0e1d33bb9e213d9f23163dd2826208e6`. Its 218407-byte bundle SHA256 is
`6d7f78acdb3c40e939cf64523b5813ff9a4d55cfb3e1dd30f147e9b9986b1f8c`.
Tag, public non-draft prerelease, all three downloaded assets/digests, exact Git
bundle and CI provenance were verified directly from GitHub during preparation.
Beta publisher run: [39781368104](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/39781368104).

One integration branch starts at that exact commit and targets master
`4c548d7f45b3622438cde8b03d7ec01f1d7a30c2`. No historical PR is sequentially
merged/cherry-picked. Runtime `src/`, assets, HACS manifest, dependency graph and
build inputs are unchanged. Candidate metadata is 1.8.0; the rebuilt bundle may
change **only the deterministic version banner**, as enforced by
`release-approval.json` and the existing stable source gate. Documentation and
promotion tests are reviewable candidate changes. Exact tested candidate SHA,
checksum, CI/artifact links are recorded in the integration PR, avoiding a
self-referential commit hash embedded in its own tree.

## Open PR audit

All implementation heads below are actual Git ancestors of beta.7, not merely
similar patches. Keep them unmerged until this integration is reviewed; after
successful cumulative integration they can be closed as incorporated, without
merging their older snapshots separately.

| PR | Evidence / disposition |
|---|---|
| [#110](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/110) | Ancestor `cd82acf`; NG tags/API/events/CSS isolation, full original coexistence included |
| [#111](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/111) | Ancestor `4b3bbede`; one shared presentation included; its30% default superseded by approved40% |
| [#114](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/114) | Ancestor `355caa6`; native-only Browse Media, cache-removal migration included |
| [#116](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/116) | Ancestor `ece8f9e`; gradients, true hex contour, auto sizing and docs/package work included; raster-reference bug corrected later |
| [#118](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/118) | Ancestor `b5be01a`; stable display reference and phase-preserving power/fixed speed included |
| [#120](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/120) | Exact beta.7 `58e2654`; resolved-inner/default and optional wave color included |
| [#107](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/107) | Not an ancestor, intentionally consolidated in beta.5. Terminology/SVG are byte-identical; README stable badge/English terms/Light baseline and stronger docs tests preserved. Recommend close without merging as superseded |
| [#108](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/108) | Full LICENSE/NOTICE byte-identical, README/readiness docs superseded. Unique automatic validate.yml was deliberately replaced by manual no-ignore catalog readiness in beta.5. Recommend closure without merging once owner accepts that workflow disposition; track remaining external gates in #92 |
| [#113](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/113) | Research only, not an ancestor. Production true hex wave supersedes its prototype; prototype/research workflow should not ship. Recommend close without merging, preserving branch/history |
| [#112](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/112) | Unique future-module matrices/mocks; keep deferred for review with #105/#87/#86. Do not merge into this candidate |

Already closed #109 is obsolete native-Favorites research; do not reopen/merge it.
No PR or issue is automatically closed by this preparation.

## Open issues and scope

At audit, six feature/distribution/roadmap issues are open (PRs excluded):

| Issue | Recommendation |
|---|---|
| #104 shared renderer | Implementation and owner beta acceptance complete; close after reviewed stable integration/public verification, not during preparation |
| #92 HACS catalog/Marketplace | Keep open; local payload passes but external catalog gates remain |
| #106 roadmap | Keep open; reconcile stale beta queue after stable integration |
| #105 Charger, #87 Climate, #86 Car | Keep open/deferred; no implementations or research renderer included |

#93/#115/#117/#119 were already closed by owner validation at this audit. Do not
reopen or change them. Completed feature issues and beta PRs are not evidence of
master integration; all historical releases and branches remain intact.

## Version and compatibility scope

The owner confirms they are the sole current user, have already migrated away
from1.7.x and want the1.8.0 track. Per that instruction, no separate migration
guide or expanded breaking-change documentation is prepared. Preserve beta.7
behavior exactly; do not restore old cache support/global aliases. Current
native-only Sonos and runtime API references remain the configuration contract.

## Validation and coverage

Run all existing Node unit/contract tests, including previously skipped stable
approval tests now applicable. Full Playwright coverage is235 scenarios:
136 module/navigation/Light/Sonos/visibility/gesture cases,8 full-bundle coexistence,
10 presentation,22 native Favorites,26 beta.5,21 beta.6 and12 contour-color cases.
Documentation adds16 desktop/mobile interactions, plus6 native Sleep device-boundary models. Validate every README/docs
YAML example/link and production compiler, diagram geometry and external recipes.

Also run visibility/allocation and browser render/rate/lifecycle benchmarks,
production build, HACS payload/GPL checks, actionlint, a second byte-identical
build, approved-beta source/ancestry/banner checks and exact-head push/PR CI.
CI uploads screenshots/performance evidence and the JS/checksum artifact.

Browser plugin unavailable; existing Playwright Chromium fixtures cover desktop,
tablet and touch-mobile, page identity/content, error overlays, console health,
real pointer/touch and live HA-shaped updates. Tests do not contact live HA or
run HA's backend config validator. Owner reports real-HA beta.7 acceptance;
independent Safari/Firefox, physical fresh HACS installation, arbitrary HA/custom
DOM variants, GPU/battery and external hardware are not claimed automated coverage.
Known static-image/unsupported-frame82 fallback, small proportional touch targets,
browser-dependent CSS colors, required explicit power/health mapping and native
Sonos identity/cache/Sleep limits are unchanged.

## HACS and publisher readiness

HACS custom repository identity, root filename/content_in_root and module resource
are unchanged. `1.8.0` sorts after beta.7 and1.7.1; stable users need no prerelease
opt-in after an actual stable publication. Beta users can redownload stable,
disable beta versions and hard-refresh, keeping one NG resource. No actual stable
upgrade is available before owner-authorized publication.

Official catalog admission is separate: fresh GitHub metadata still has empty
topics, an upstream-only description, fork=true and default-branch license
NOASSERTION. Full GPL/NOTICE is in the candidate; GitHub recognition needs reviewed
default-branch integration and owner topics/description action. The manual HACS
catalog workflow is absent from master and cannot be dispatched from an unmerged
candidate. Its earlier topics/license failures are not claimed resolved; no checks
are ignored. No external catalog submission, settings change or repository detach.

Stable publisher/retention safety code and workflow remain unchanged from beta.7.
They already accept canonical stable versions via the reviewed manifest; no
hardcoded v1.7.0 gate needs removal. Master-only/manual authorization, exact
master/checkout/latest matching CI, public approved beta/tag/assets, source tree,
reproducible bundle/checksum, immutable new tag/Release and preserved inventory
remain mandatory. The feature-branch candidate cannot pass the live master gate
until separately authorized integration. Unit tests verify failure paths; they do
not claim that a live stable workflow or publication ran during preparation.

## Final release checklist — owner gated

- [x] Sole owner/user already migrated and selects the v1.8.0 track.
- [ ] Owner reviews integration PR exact SHA/checksum and all green CI/evidence.
- [ ] Explicit authorization to merge and publish the selected stable version.
- [ ] Freshly verify beta.7 assets/provenance and unchanged candidate runtime;
  no future modules, legacy cache shim or unrelated behavior.
- [ ] Merge the single cumulative PR using a **merge commit**, preserving beta.7
  ancestry; do not squash/rebase away the approved source or merge old PRs in turn.
- [ ] Run/wait for full CI on the exact final master SHA; PR CI alone is insufficient.
- [ ] Keep RELEASE_RETENTION_ENABLED=false. Workflow reads the variable itself;
  do not query/change the inaccessible Variables API or bypass conflicting state.
- [ ] Confirm unused selected stable tag/Release, matching metadata and release notes.
- [ ] On master only, run stable publisher with publish=false at the exact green
  master SHA; inspect verified assets/provenance, with no tag mutation.
- [ ] Only with explicit authorization, run publish=true for that SHA and repeat
  all source/CI/bundle/inventory gates. Never overwrite or retry failed mutations.
- [ ] Independently verify public stable/tag/latest, downloadable JS/sums/provenance,
  HACS manifest/payload and all preserved previous releases/tags/assets/private draft.
- [ ] Verify forced read-only retention report; never enable deletion or change settings.
- [ ] Owner tests stable fresh install/update and beta-to-stable transition; then
  close incorporated PRs/#104 with evidence. Keep #92/roadmap/future-module work open.

**Stop here for this task:** no merge, stable workflow dispatch, stable tag/Release,
retention mutation, cleanup or external HACS submission is authorized.
