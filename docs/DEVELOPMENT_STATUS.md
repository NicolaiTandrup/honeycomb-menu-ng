# v1.10.0-beta.2 — PUBLISHED AND VERIFIED; STOP

Owner-authorized issues #146/#147/#148 implemented cumulatively over published beta.1
8619c9a74f50ffbbdb6206a45b18e5b81265912d. Previous network handoff
0985d10921104ae5686a290e967c066dd24c1397 reviewed; no implementation to reapply.

## Immutable source and release

Feature branch: feature/v1.10-beta2 (frozen).
PR #149 OPEN/unmerged: https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/149
Exact tested/tagged/released commit: 8bbc45af72936630c39f87c4697a0148cc38a047.
Public prerelease: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.10.0-beta.2
Release ID: 429284888. Normal HACS JS: 303003 bytes.

honeycomb-menu-ng.js: SHA256 d3c595891094a59625a06102d08d999e636ba2e332d33ef0a29d420e7c8399eb (303003 bytes).

release-provenance.json: SHA256 a22d06fde883da78668fa0fb378ba1ac40e2464d5c29021888ed8f9878fac1c3 (535 bytes).

SHA256SUMS.txt: SHA256 3d695d200d6c00557d9ad47d216018a9f542549c5f0aa233834a55e174c9922a (87 bytes).

This documentation-only handoff is separate from the frozen feature/release head.
Do not recreate/reapply completed work, republish beta.2, move its tag, merge master,
publish stable, start other modules or modify production HA. Stop and await owner
real-HA feedback. No acceptance issues were closed.

## Implemented

- Climate roles use neutral fill and zero default inner width; center retains its
  independent live fill/borders. Explicit function descriptors can override styles.
  Native units/steps/capabilities/range/commands/navigation remain unchanged.
- Join shows actual room playback/content, individual volume and accessible group
  status/reasons. Joined rooms inherit the opening Sonos center's artwork, full
  configured paint, alpha/gradient, borders and icon policy; live updates retained.
  Native/external grouping, Favorites/Radio/Sleep/volume services preserved.
- Opt-in collapsible Hub: hard primary slot 0, original tap, isolated held-pointer
  expansion, primary/bee policies with validated shared allocation, Back/Escape/
  configurable 30s activity collapse. Phone top-layer/safe-area fit and interaction
  shield preserve floorplan anchor and restore original size. Resize/rotation,
  multiple Hubs, preview/disposal, keyboard and nested Info return validated.
- Native YAML/docs/examples and mandatory beta2_features.py CI coverage added.
  Shared renderer/controller reused. Publisher/stable/retention workflows, HACS
  metadata, Light/Charger modules and Info component unchanged from beta.1.

## Actual validation and publication

- Node: 430 pass / 3 existing stable-only skips; no failures.
- Chromium: 468 scenarios, including 20 new beta.2 cases, 36 Climate, 69 Info,
  complete Light/Charger/Sonos/navigation/sizing/artwork/touch/performance regressions.
  6 native Sonos Sleep device-boundary contracts pass.
- Docs: 63 YAML blocks, 54 complete cards + 11 contextual fragments, 258 local
  links, 22 browser interactions. HACS/GPL/package, pinned checksum-verified
  actionlint and repeated deterministic production build pass.
- Exact-head push CI 41092154490 and PR CI 41092163821, attempt 1: both build and
  workflow-lint jobs successful; mandatory steps successful. CI bundle checksum
  annotations independently match committed/local JS.
- Official HACS readiness 41092153458: successful on exact final source.
- Unchanged guarded release.yml publish=true run 41095143263: verify and publish
  jobs successful. Workflow reproduced committed JS and matched actual CI artifact
  and staged assets/checksum before creating a new tag/release.
- Independent public verification: normal unauthenticated-client curl downloads
  match GitHub digests/sizes, exact local committed JS and SHA256SUMS. Provenance
  pins exact source/branch/repository and both CI attempts. Tagged package/HACS
  metadata valid; downloaded public HACS JS passes desktop+phone smoke tests.

CI: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41092154490
PR CI: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41092163821
HACS: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41092153458
Publisher: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41095143263

Browser plugin not available; repository Playwright used installed Chromium, plus
pinned CI Chromium. Local Playwright CDN denied by policy, so no repeated download
or bypass. Local CI artifact redirects to Azure Blob are denied; matching checksum
annotations were read through allowed GitHub API, and the guarded GitHub runner
compared actual CI artifact bytes. All public assets independently downloaded.
API and dry-run push permissions passed in this corrected environment; ordinary
sandbox denied proxy sockets but authorized escalated shell used inherited proxy.
No credential replacement, policy bypass or production Home Assistant connection.

## Evidence and preservation

Evidence outside Git: /tmp/honeycomb-beta2/. public/verification.json contains all
asset digests, exact tag/source/CI and preservation results; publisher-final.json
and ci-*-final.json record completed jobs. features-final/ and public-install/
contain final phone/desktop collapsed/expanded screenshots; comparison/ contains
published beta.1 before/after scenes. Final after images also in features-final/.
CI shared-cube-evidence artifact retains full browser screenshots. No screenshots,
secrets, production identifiers or temporary QA scripts were committed.

Before/after: all 57 prior release records and assets retained; total 58. All prior
113 tag-reference lines retained, one new beta.2 reference (114 total). Master
unchanged at ba95dade58fa64c5183a312e0d1d00044feeb096; latest stable remains v1.9.0.
No prior tag/release/asset overwrite/delete, history rewrite, branch deletion,
retention mutation or cleanup workflow invocation. Historical private beta.5
visibility uncertainty remains separate; no action taken on it.

## Owner testing and limits

HACS -> Honeycomb Menu NG -> Redownload -> enable beta versions -> v1.10.0-beta.2.
Keep normal NG and button-card resources. Use examples/collapsible-hub.yaml or
examples/collapsible-hub-bee.yaml and replace synthetic entities with verified
ones; Climate and Sonos examples/docs remain available. Combined synthetic testing
card: /tmp/honeycomb-beta2/home-assistant-test.yaml. Both center policies documented
in docs/COLLAPSIBLE_HUB.md. No production configuration was edited.

Real HA/hardware acceptance is pending. Firefox/WebKit, actual owner dashboard,
kiosk and physical touch devices untested. Modern Popover API required for phone
overlay; very large populations may need sub-44px cells to fit. Existing ordinary
non-collapsible anchored submenus retain edge/capacity limits. Existing Climate
registry/capability/device-permission/confirmation limitations still apply.

Next action: STOP. Await owner real-HA acceptance or new authorized scope.
