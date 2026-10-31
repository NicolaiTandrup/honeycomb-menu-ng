# v1.10.0-beta.5 — published and independently verified

Owner-authorized beta.5 is complete. STOP for owner real Home Assistant Android/PC acceptance. Do not continue with #154 or other work until requested. No master merge, stable promotion or production HA commands were performed.

## Exact immutable release

- PR https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/155 remains open, unmerged.
- Source/feature head: `83cbdd486a924f88f2ad399886dff4fb31d913db` on `feature/v1.10-beta5-geometry`.
- Exact published beta.4 baseline: `d1afadf02b4f328ad92f6514faf206485686a507`.
- Release: https://github.com/NicolaiTandrup/honeycomb-menu-ng/releases/tag/v1.10.0-beta.5
- HACS bundle: `honeycomb-menu-ng.js`, 316531 bytes.
- SHA256: `4a3c46eeb4566515fd5bf794e47c90e93b02dda7f9f08e0afee4efed67efd2f7`.
- Public assets exactly JS, SHA256SUMS.txt and release-provenance.json; downloaded public bytes match committed/rebuilt/CI/published bytes. Tag and target_commitish are the exact source. Tagged HACS root filename/content metadata and version match.
- Publisher: https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41206847640 (verify and publish both successful, unchanged guarded workflow).
- Handoff-only branch `docs/v1.10-beta5-published-handoff` intentionally does not move the published feature branch.

## Implemented and preserved

Default expansion targets 100px independently of the collapsed responsive auto size/max82 or explicit numeric size. All screens use the isolated overlay. Existing shared image observation supplies actual object-fit/position/clipped image geometry; full visible slot footprint chooses usable below/above/left/right space, deterministic ranking/hysteresis and safe-viewport fallback. Connected header/tab/sidebar/footer and safe inset geometry are measured. Watchers cannot snap expanded desktop scenes back to tiny floorplan geometry. Scroll/resize/rotation and cleanup are covered.

Shared nested navigation retains the selected physical cube if the child fits, then tries the expanded root, usable image-free placement and safe viewport fit. Saved parent anchors/sizes restore exactly on Back; nested child fitting is independent. Info callers remain suspended until return, then refit if the environment changed. Backdrop requires pointerdown origin outside a control.

One shared Bee preset uses the unchanged canonical PNG/build pipeline and single renderer/version formatter; paint, dimensions, metadata and timing are shared. Normal Bee tap/hold reveals version. Expanded Bee tap Back/Collapse; hold/Shift+Enter reveals the installed version for three seconds without collapse. Functional Bee icons retain actions and support Alt+V. Explicit paint/border overrides are tested. No mascot redesign.

Default behavior needs only `collapsible: true`. Preserve documented explicit `small_screen:false` / legacy `mobile:false` compact phone opt-out up to 600px; desktops still enlarge. This compatibility assumption was stated while an optional clarification was pending; no reply was received before publication. Numeric/reference/expanded_size/timeout/center/slot overrides and non-collapsible Hubs are preserved.

Radio/Climate module sources were unchanged. Approved Climate and Radio rendered screenshots are pixel-identical to exact published beta.4 at phone390 and desktop1440. Existing module behavior, allocation/visibility/focus and services remain covered by synthetic regressions.

## Completed gates and evidence

- Push CI https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41204807221 : success at exact source, all build/lint steps.
- PR CI https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41204811188 : success at exact source, all build/lint steps.
- Official unsuppressed HACS https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/41205029781 : success at exact source.
- Node 449 pass / 3 pre-existing stable-only skips; 547 Chromium/documentation cases including 49 new seven-viewport geometry cases; 6 native Sleep boundary cases and performance checks. Local original geometry run exposed a Bee override forwarding failure, fixed before final complete matrix and CI; original log retained.
- Seven viewports: 390x844,430x932,800x1280,1280x800,1440x900,1920x1080,650x900.
- Final deterministic build, HACS package/license, docs/YAML, workflow actionlint and beta/release integrity checks pass.
- Public verification includes exact tag/source, asset sizes/GitHub digests/SHA256, provenance CI IDs/attempts, public/tagged HACS bytes and metadata. All 60 prior releases/assets and 116 tag-ref lines retained; stable v1.9.0 and master unchanged. Existing private draft, PRs and disabled retention preserved.
- `/tmp/honeycomb-beta5/`: complete local logs, ci-results.json, test-results.json, public/verification.json and screenshots. Browser plugin absent; repository Playwright/system Chromium used.
- `/workspace/beta5-delivery/screenshots.md` covers all 14 requested screenshot categories; demo-floorplan and Bee screenshots smoke the downloaded public bundle. `/workspace/honeycomb-beta5-evidence.zip` includes screenshots, machine-readable verification and synthetic minimal YAML.

## Owner acceptance boundary

Fixtures use synthetic HA state/services; no physical Android/PC or production HA acceptance is claimed. Unsupported image transforms use safe fallback; exceptionally large layouts may need smaller fitted cubes; browser Popover/visualViewport support varies. HACS installation compatibility is validated, while actual owner installation/cache/device behavior remains to be accepted.

HACS: enable beta versions, select/redownload v1.10.0-beta.5 and refresh frontend/cache. Confirm Bee label `v1.10.0 beta 5`. Start from `examples/collapsible-picture-elements.yaml`, replace synthetic entities, optionally use the Bee center example. Validate real desktop/Android collapse/expand, free lower/side space, selected-anchor/Back and Radio/Climate.

Issue #154 remains explicitly deferred until owner beta.5 acceptance. Acceptance issues #148/#153/#134 remain open. No further implementation, publication or production action is implied.
