# v1.9.0 stable candidate — owner review required

**Preparation only: no master merge or stable publication authorized.** Latest
public stable/master remain v1.8.1. Owner beta.2 testing accepted Charger two-row
labels, dashboard editor placement, simultaneous charging, individual/aggregate
values and pulse. The latest #125 feedback still requires actual beta.3 radio
artwork acceptance; #105 still requires hardware control/association acceptance.
Do not mark those gates complete from synthetic tests.

## Exact cumulative source

Published [v1.9.0-beta.3](https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.3)
is commit `8a57ccd225cf95a22685c86fafda1a674bd649d2`, source tree
`802a5db2a2e4cad7b06bfd8c197f325f274ff472`. Bundle: 244847 bytes, SHA256
`29879439c38eb46c95cb0fd6f87407e5dd4c33d182aef7318748ca1a7c2a415b`.
Fresh unauthenticated downloads of JS/checksums/provenance match Git, public asset
digests and exact source. Beta.3 CI and guarded publication succeeded.

One branch, `release/v1.9.0-stable-candidate`, starts at this exact beta source and
targets master. It includes cumulative PRs #124, #127 and #130 by ancestry; do not
merge their older snapshots separately. The Climate PR #131 is independent and
must not be included. Runtime `src/`, assets, dependencies, HACS manifest and build
configuration are unchanged. Only package/release/version metadata, deterministic
bundle banner and preparation/handoff documentation differ from beta.3.

`release-approval.json` is the **proposed source pin for owner review**. Its existing
`approved_beta` schema records the exact candidate beta, tree, checksum and bytes;
this unmerged proposal is not a claim that artwork/hardware or stable approval has
already occurred. The publisher still requires master, exact green CI, this public
beta, unchanged source, immutable new tag/Release, disabled retention and explicit
manual publication. No guard, workflow or permission was weakened or dispatched.

## Validation

The stable-only source/ancestry/dependency/build-input/banner tests apply now:
**344 Node cases passed, zero skips/failures** at preparation. The stable JS must
be byte-identical to public beta.3 after normalizing the deterministic version
banner. Repeated build, checksum, HACS package, YAML/docs, workflow lint and complete
browser regressions are required on the candidate. Exact head/checksum and CI are
recorded in the PR and development status; do not embed a commit's own hash in itself.

Mandatory CI preserves Light/Hue/Kelvin/presets, Sonos Radio/Join/native Sleep,
artwork geometry, Charger safety and counts, editor/picture-elements positioning,
visibility/slots, pointer/touch/Back, original-bundle coexistence, pulse/performance
and cleanup. Tests use synthetic HA in Chromium desktop/tablet/mobile; they do not
operate real equipment or prove backend/integration/hardware acceptance. Native
Favorites identity/TTL limits and unsupported floorplan/large-menu limits remain.

## Owner release checklist

- [ ] Owner tests beta.3 station logos on launcher/center/Radio in actual HA, including
  different aspect ratios, playing/paused and volume text space (#125).
- [ ] Owner confirms intended Charger control targets and actual device results
  before use; optional association data remains external (#105). Do not change
  existing production automation or issue a live command as part of this PR.
- [ ] Owner approves the cumulative integration PR and **explicitly authorizes**
  merge and stable publication. No approval is inferred from preparing this branch.
- [ ] All required exact-head PR/push CI and reproducible source/banner checks pass.
- [ ] Merge this one cumulative PR by **merge commit** to preserve beta ancestry;
  do not squash/rebase away the pinned beta or merge historical snapshots sequentially.
- [ ] Require all CI on the resulting exact master SHA. PR CI alone is insufficient.
- [ ] Keep RELEASE_RETENTION_ENABLED=false. Never mutate retention or bypass a
  conflicting state/403. No retention deletion is authorized.
- [ ] Recheck beta tag/release/assets/provenance, source tree, package/release metadata,
  reproducible bundle and new unused v1.9.0 tag/Release; never overwrite anything.
- [ ] On the approved exact green master SHA only, run normal stable publisher
  publish=false, inspect verified assets, then publish=true only with owner approval.
- [ ] Independently verify public stable/latest, exact tag, JS/checksums/provenance,
  HACS upgrade/resource path and preservation of every old release/tag/asset/private draft.
- [ ] Keep #87 Climate, #86 Car, #126/#129 later Charger work and #92 HACS independent.
  Close #125/#105 only when their owner acceptance is documented, not automatically.

Stop before merge, publisher dispatch, tag/release creation or production commands.
