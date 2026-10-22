# HACS catalog readiness — audit 2026-10-21

This is a submission preparation report, not a claim of official listing or a
real-device installation test. Current public stable is **v1.7.1**. Normal users
should leave “Show beta versions” disabled. Existing custom repository identity,
`hacs.json`, `honeycomb-menu-ng.js`, and resource path remain unchanged.

## Authoritative requirements

The HACS documentation website was unreachable from this execution environment
(HTTP 403). Its current first-party source was read directly:
[include requirements](https://github.com/hacs/documentation/blob/main/source/docs/publish/include.md),
[plugin packaging](https://github.com/hacs/documentation/blob/main/source/docs/publish/plugin.md),
[general manifest](https://github.com/hacs/documentation/blob/main/source/docs/publish/start.md),
[validation action](https://github.com/hacs/documentation/blob/main/source/docs/publish/action.md).

- “Only the owner or a major contributor” may submit.
- The repository must work as a custom repository and be public.
- HACS Action must pass “without any errors or ignores”. Hassfest is for
  integrations, not this dashboard plugin.
- A full release must be created **after** successful validation.
- The catalog entry belongs alphabetically in the JSON `plugin` list.
- A description, issues, topics, recognizable OSI license and README images
  are required. The action uses the branch under test on pushes/PRs.
- Root `honeycomb-menu-ng.js` matches the repository name. With no `dist/`,
  HACS looks in the latest release before the root. No zip format is needed.

The published requirements do not categorically prohibit forks or promise
acceptance alongside an upstream entry. Original Honeycomb is already listed;
reviewers must evaluate distinct identity, maintenance and derivative scope.
Do not claim upstream endorsement, a transferred listing, or guaranteed acceptance.

## Verified package and blockers

| Item | Result / owner action |
|---|---|
| Public stable payload | v1.7.1, non-draft/non-prerelease; bundle, sums and provenance independently verified during #102 |
| Product identity | Honeycomb Menu NG; distinct repo, JS filename and `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js` |
| Runtime coexistence | v1.7.1 collides on menu/item/XY tags, globals and legacy popup event routing; #104 must validate both full bundles in both orders before claiming coexistence |
| Official validation | PR #108 proposed validate.yml; cumulative beta.5 stages manual hacs-readiness.yml, category plugin, no ignored checks or PR comment permission |
| License | Existing abbreviated grant was reported NOASSERTION by GitHub. Preserve it verbatim in NOTICE and supply the complete GPL-3.0-or-later text in LICENSE. Verify GitHub recognition after review/merge |
| Repository topics | Empty at audit: owner should add `home-assistant`, `hacs`, `lovelace`, `dashboard`, `honeycomb` |
| Description | Existing text describes upstream popup only; owner should describe NG's persistent Hub/Control, Light and Sonos capabilities |
| Issues / archived | Issues enabled; repository active |
| Optional companions | v1.8 beta native Sonos Browse Media needs an enabled official favorites entity; no template-cache support. Light preset helpers remain optional; native Sonos Sleep needs none |
| Real HA installation | Requires owner fresh-install/update smoke test; synthetic browser tests are not HACS installation proof |

No repository settings, releases, assets, tags or fork-network metadata are
changed by this PR. This documentation/CI PR does not alter the stable binary.
A successful HACS action and a subsequent approved release are still required
before catalog submission. Do not bypass missing-topic/license failures.

## Owner installation and update checklist

1. Add `NicolaiTandrup/honeycomb-menu-ng` as a HACS Dashboard custom repository.
2. Install the stable release; verify v1.7.1 is selected with beta versions off.
3. In dashboard Resources, verify the JS module path above. Avoid duplicate
   manual `/local/` copies; preserve any separately installed original resource.
4. Hard-refresh each browser. Use the tested quick start in README, then check
   Light tap/hold, Sonos Radio/Join/Sleep and persistent Hub/Control navigation.
5. For an existing installation, redownload the stable version, preserve YAML,
   refresh clients and verify native favorites, presets and dynamic visibility.
6. Original+NG coexistence is gated on #104; do not promise it on v1.7.1.

## Submission checklist and draft

After namespace acceptance, green official validation and a newer approved
release containing the reviewed packaging, the **owner** can fork `hacs/default`,
create a branch from its current master, insert the repository alphabetically in
`plugin`, validate JSON/order, and fill the current PR template honestly.
Do not use an organization fork if it prevents maintainer edits. No external PR
has been submitted. Recheck upstream requirements at submission time.

Suggested description:

> Add Honeycomb Menu NG (Dashboard/plugin), independently maintained development
> derived from Sian Croser's GPL-licensed Honeycomb. Shipped features include
> persistent Hub/Control, shared 82px cubes, state visibility/placement, recursive
> Light Hue/Kelvin palettes and Sonos Radio/Join/native Sleep. It retains upstream
> attribution and GPL obligations. Original Honeycomb remains a separate listed
> project. Include links to green HACS validation, public stable payload, distinct
> resource identity and both-order runtime coexistence evidence. Charger, Climate
> and Car are planned, not shipped. Please review suitability as a coexisting
> derivative entry; no upstream replacement/endorsement is claimed.

Use the upstream template rather than replacing its checkboxes with this draft.
No separate Marketplace binary format is established by the cited dashboard
requirements; do not invent an integration manifest/backend installer.

## Repository strategy assessment

| Option | HACS certainty | History/update risk | Recommendation |
|---|---|---|---|
| Keep current fork network | Reviewer decision; no published blanket ban | Lowest; existing issues, releases and HACS identity remain | Preferred |
| Leave fork network | Does not itself prove acceptance | Permanent metadata consequences require account-specific GitHub verification and backup | Not authorized |
| New mirrored repository | Still requires review | New IDs/links, releases/assets/settings and HACS update migration | Not authorized |
| Rewrite derived source | Does not remove GitHub fork flag | Large regression/provenance cost; GPL/attribution obligations remain | No demonstrated need |

Code separation and GitHub fork-network metadata are independent. Never detach,
recreate or rewrite history to improve a listing's appearance. An owner-approved
maintainer inquiry is safer than asserting undocumented acceptance rules.

## Cumulative beta.5 packaging status

The reviewed full GPL text/NOTICE from PR #108 and SPDX package metadata ship
in the candidate. CI checks local HACS filename/root asset, metadata, attribution
and reproducible bundle. The official HACS catalog workflow is **manual only**
for readiness review, with zero ignored checks; it is not an automatic beta
publication gate. It remains expected to fail on repository-wide topics and
default-branch license recognition until the owner resolves those settings via
the later approved stable/default-branch process. This separates local payload
validity from external catalog admission; it does not claim official validation
has passed. No repository settings change or hacs/default submission occurs.

Current beta namespace coexistence and native-only Sonos are production code
from beta.4; the old v1.7.1 behavior above is stable-specific. Master remains
v1.7.1. Owner must review topics/description, GitHub license recognition, fork
listing suitability and final physical HACS install/update before resolving #92.

A new manual workflow is dispatchable only after GitHub recognizes it on the
default branch through a later approved integration. Beta.5 does not alter master
to enable that catalog review. The already observed #108 HACS failures remain
reported rather than claimed resolved.
