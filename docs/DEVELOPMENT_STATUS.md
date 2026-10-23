# Development status — v1.9 stable preparation

Updated: 2026-10-23. Read AGENTS.md and verify live issue/PR/CI state before changing files.

## Active work and protected baseline

- Branch: `release/v1.9.0-stable-candidate`; base is exact public beta.3
  `8a57ccd225cf95a22685c86fafda1a674bd649d2` ([PR #130](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/130)).
- Latest stable/master remains v1.8.1 at `c1f178740c8181921033d0d18e0ac8d01afc7ea7`.
  No merge/stable publisher dispatch/tag/release or live HA command is authorized.
- Cumulative runtime includes Charger #105 and stabilization #125; future Climate
  is on separate `feature/v1.10-climate` [PR #131](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/131).
  Do not import Climate into this v1.9 candidate or reimplement already tested work.

## Completed and validation

- Fresh public beta.3 downloads of bundle/SHA256SUMS/provenance matched tag, Git source,
  asset digests and source `8a57ccd`; source tree `802a5db2a2e4cad7b06bfd8c197f325f274ff472`.
- Public beta.3 bundle: 244847 bytes, SHA256
  `29879439c38eb46c95cb0fd6f87407e5dd4c33d182aef7318748ca1a7c2a415b`.
  Existing exact-head CI/publisher are green; do not republish or mutate beta.3.
- Candidate metadata/version banner prepared for 1.9.0. Source/build/dependencies
  unchanged. `release-approval.json` is a proposed pin, not existing owner approval.
- Actual stable Node suite: **344 passed, zero skips/failures**, including all three
  formerly skipped stable source/banner/ancestry/publisher safety contracts.
- Candidate documentation/checklist and README/AI version boundaries are prepared.
  Repeated build and banner-only comparison passed: stable bundle 244840 bytes,
  SHA256 `d9797e39ccb8b9f5b4acb3d9ed0982af34d5fa9631cf2f38182d7dbce30cd07d`.
- Documentation: 57 YAML blocks, 37 complete cards + 11 fragments, 214 local links
  and all 16 desktop/mobile documentation interactions passed. HACS package,
  workflow lint and diff checks passed. Docs result counter now records actual cases.
- Full inherited browser and exact-head candidate push/PR CI are next; do not claim
  hardware acceptance or publication from these synthetic checks.

## Remaining tasks in priority order

1. Run candidate build/reproducibility, source/banner comparison, package/docs/lint.
   Commit/push and open a cumulative review PR targeting master, leave unmerged.
2. Let all mandatory exact-head CI finish, inspect failures/artifact checksum and
   update PR/handoff with actual results. Do not repeat accepted beta feature work.
3. Owner beta.3 artwork acceptance (#125), Charger hardware control/association
   acceptance (#105) and explicit stable merge/publication approval remain pending.
4. Separately continue existing Climate PR #131. Audit found standalone parent ->
   different Climate child used classic 62.7px sizing instead of 82px; a focused
   fix/test is in progress there. No Climate release is automatically authorized.

Known limitations and owner gates: see [stable checklist](V1_9_RELEASE_CANDIDATE.md).
No actual HA hardware/commands tested here. #126/#129/EV-manager redesign is v1.12+;
Car is deferred. Retention stays false; old releases/tags/branches/assets preserved.

## Commands and precise continuation

```sh
git status --short
git branch --show-current
git log -5 --oneline
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js --stable
node scripts/check-hacs-package.js
python3 test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/honeycomb-v19-docs
actionlint -shellcheck="" -pyflakes=""
gh pr list --repo NicolaiTandrup/honeycomb-menu-ng --head release/v1.9.0-stable-candidate
```

Use the existing full `.github/workflows/build.yml` on the exact candidate; no gate
is disabled. Do not run npm ci through a shared node_modules symlink. Local QA data
belongs outside Git. Fresh session: inspect current PR/CI and the checklist, finish
validation, then stop for owner stable approval; never repeat beta publication.
