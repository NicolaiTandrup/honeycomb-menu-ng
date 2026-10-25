# Development status — v1.9.0-beta.5

Updated: 2026-10-25 (Europe/Copenhagen). Read AGENTS.md and verify live Git/CI/PR/release state.

## Active branch and protected baseline

- Branch `fix/v1.9-beta5-palette-theme`, based exactly on published beta.4
  `8f9b1c003529b1df0db08058d26691995f3e9afe`. [PR #136](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/136) targets the unmerged beta.4
  review branch `fix/v1.9-beta4-palettes-navigation` (PR #135), not master.
- Implementation commits: `5022e51` (#133 cube-3 indicator) and `abdcbf3` (#134
  shared submenu defaults). Subsequent test/docs commits do not alter runtime.
- Master/latest stable v1.8.1 remains `c1f178740c8181921033d0d18e0ac8d01afc7ea7`.
  Stable proposal PR #132 remains an unmerged beta.3 source proposal at `7d46be3`;
  it must not be merged/published or treated as approval for newer beta source.
- Climate PR #131 remains separate at `d965f41214085abb1eb52d25948fb5a7d47bd020`.
  Do not import it or implement Car/future Charger redesign/guest UI in beta.5.
- Owner explicitly authorizes new immutable beta.5 only after complete exact-head
  CI and normal manually authorized publisher gates. No master/stable merge,
  production HA commands, retention changes, old release/tag/asset mutation or
  private beta.5 draft modification is authorized. Freeze source while publishing.

## Verified beta.4 completion (do not repeat)

- Public release: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.9.0-beta.4
- Exact tagged source `8f9b1c003529b1df0db08058d26691995f3e9afe`; bundle 247895 bytes,
  SHA256 `3ac96d191f56c3d86a6dbf81e8189a875defd8be6d26b92654e28f7a1a82e84f`.
- Complete push/PR CI: Actions runs `40132132666` / `40132136814`, all jobs/steps
  successful. Guarded publisher `40133377963` succeeded (verify + publish).
- All three public assets independently downloaded without authentication; JS
  matches tagged Git bytes, SHA256SUMS, provenance, asset digests and exact CI pins.
- Preservation audit: 50 prior releases and 102 prior tags retained, zero altered/
  overwritten/deleted; only the new beta.4 release/tag added. Private beta.5 draft
  unchanged; master/latest stable and PRs #131/#132/#135 unchanged/unmerged.
- Beta.4's final owner feedback is this beta.5 mission: move the indicator from
  slot 0 to cube 3 and complete gray fill+inner defaults. Publication is complete;
  don't rerun beta.4 or claim it still awaits publication from the older handoff.

## Beta.5 implementation and actual local validation

- Cube 3 now carries the viewed/alternative palette labels through state-aware
  tap/hold, manual choice, recursive zoom and Back. Slot 0's palette-specific
  labels are removed; original name/brightness/colors and Back are preserved.
  White-only restrictions, session mode retention and service isolation remain.
- Shared submenu fallback uses the existing Light fill `rgba(52, 66, 78, 0.94)`
  and inner `#34424e`; existing outer `#34383d`. Root Hub is exempt. Charger detail
  presentation reuses those constants; functional centers/palettes/module colors
  and explicit overrides are retained. No duplicate renderer or positioning engine.
- Defaults are not injected as implicit card styles, so they cannot masquerade as
  explicit overrides. Native submenu `colors.center` wins over background styles;
  root precedence is unchanged. Transparent custom content leaves gray visible,
  while explicit button-card background styles still work.
- Node: 357 passed / 3 stable-only skips / zero failures. Existing beta.4 desktop/
  mobile anchoring/capability regressions: 12 pass. New beta.5 scenarios: 12 pass,
  plus 2 external-content checks pass; baseline beta.4 reproduction: 4 pass.
- Protected root Hub/main Sonos and Light pixel comparisons match immutable beta.4;
  only approved cube 3 is masked in the Light comparison. SVG computed fills test
  Charger, three generic depths, root black, functional center and explicit overrides.
- Two production builds are identical: 248286 bytes, SHA256
  `42853c775b8715c9df4ff72a3f73a5f44fe5a271394321cc79aa467381d21dab`.
- Browser plugin absent; existing Playwright Chromium used. Evidence/logs outside
  Git: `/workspace/build-output/v19-beta5/`. No real HA, Firefox/WebKit or actual
  device acceptance is implied. Code written/dispatched is not publication proof.
- Local docs: 57 YAML blocks, 37 complete cards, 11 fragments,
  213 links and 16 desktop/mobile interactions pass. HACS/package/license,
  performance and actionlint pass. Full mandatory final-head CI and publisher
  remain pending at this
  checkpoint. Exact final results belong in PR/issue follow-up and a handoff update.

## Next steps in order

1. Verify final-head push + PR mandatory Build jobs, including all browser suites,
   new beta5-ui scenarios, docs/YAML/links, performance, HACS/package/workflow lint.
   Read exact heads/checks before repeating tests; do not use superseded runs.
2. Only after all green, dispatch normal `release.yml` for new `v1.9.0-beta.5`
   with exact current head and explicit authorized publish=true. Branch must stay
   frozen. Preserve guards and stop on a real gate failure; never reuse a tag/draft.
3. Independently verify public tag, bundle/checksum/provenance/asset digests and
   preservation of prior releases/tags/assets/master/latest stable/private draft.
4. Record actual result, exact source/CI/checksum/URL and owner HA checklist on
   active PR, #133/#134 and this handoff. Leave acceptance issues open. No stable
   source pin refresh or promotion until owner accepts the newest beta explicitly.
5. Climate preparation resumes independently only when requested; Car remains
   planning-only until Climate acceptance and implementation authorization.

## Commands and environment

```sh
git status --short
git log -5 --oneline
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-release.js
node scripts/check-hacs-package.js
python test/browser/beta5_ui.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta5-ui
python test/browser/beta4_navigation.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta4-regressions
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/beta5-docs
node test/performance/hub-benchmark.js
```

Use complete commands in `.github/workflows/build.yml`; publication contract in
`docs/BETA_RELEASES.md`. Local Python `/tmp/honeycomb-beta-venv/bin/python`, button
card `/workspace/build-output/test-dependencies/button-card.js`, actionlint
`/tmp/honeycomb-actionlint-bin/actionlint`. Never npm ci through the shared symlink.
The installed gh CLI needs string input `"publish":"true"` for `workflow run --json`;
a boolean is rejected locally before dispatch. No guard is bypassed by that format.
Private CI artifact CLI download returns Forbidden in this environment; normal
Actions publisher successfully downloads/compares internally. Public release asset
verification remains independent and mandatory; report access limits honestly.
