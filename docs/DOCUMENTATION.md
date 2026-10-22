# Documentation audit and validation

This documentation revision targets `restart/v1.5.1` after merged PR #81 at
`179ea68a2b53bca5cedb54ead791b5ba99c1cfe3`. Runtime source, generated bundle,
package/release version and stable publication are outside the documentation change.

## Historical comparison

The audit used actual `git show <tag>:README.md` snapshots, compared with current
layout, Hub allocation, module compilation, actions and shipped external HA recipes.
Old installation-specific examples were not carried into the new guide.

| README source | Useful material retained | Correction / modernization |
|---|---|---|
| [v1.2.11](https://github.com/NicolaiTandrup/honeycomb-menu-ng/blob/v1.2.11/README.md) | Physical Layout model, center and ring diagram, automatic layouts, classic slots/sizing | Rechecked diagram against current coordinates; distinguish classic center and scene size from Hub cell width. Keep per-patch chronology out of onboarding. |
| [v1.5.1](https://github.com/NicolaiTandrup/honeycomb-menu-ng/blob/v1.5.1/README.md) | Modular guide, focused references, writable Light values and external Sonos recipes | Explain values on separate integrations, precise favorites/cache shapes, include boundaries and script setup. |
| [v1.7.0-beta.3](https://github.com/NicolaiTandrup/honeycomb-menu-ng/blob/v1.7.0-beta.3/README.md) | Shared full-cell 82 px engine, visibility, placement, deferred interaction, expanded slots | Correct post-merge status; restore diagram/tables; specify current limits and rewrite Control onboarding. |

The figure's **19 unique labels, relative x/y coordinates and all eight Hub ring
boundaries** are checked against `src/core/layout.js`. Automatic slot-table rows
are compared with the actual Hub methods in Chromium; the seven-item logo is
suppressed before choosing the no-logo row. This preserves the three-item layout
and distinguishes `logo: false` from a requirement to fill center in every layout.

## Current examples and validation scope

[examples/v1.7](../examples/v1.7) contains six complete synthetic cards: basic Hub,
dynamic Hub, standalone Light with presets, Sonos, on/off-only Light and classic
popup. The AI guide embeds the same parsed configurations; checks reject drift.
Complete cards and module fragments throughout the guides are checked against an
explicit **example key allowlist** and actual module/visibility compilation; partial
examples receive their documented Hub/Control context. Classic and external HA
fragments are checked at their respective boundaries. This is a test guard,
not a replacement for runtime schemas or permission to generate arbitrary keys.

The docs check parses every YAML block in README and `docs/*.md` (including focused
reference fragments and historical Phase 1/2 examples), rejects duplicate mapping
keys, checks local links/anchors, and loads the six current cards in the production
bundle on desktop/mobile. It exercises the documented actions, both numeric helper
domains, exclusive brightness visibility, automatic tables, favorites playback,
Join script data and the classic event path. Existing core/browser suites cover
additional module/capability, navigation, collision and interaction combinations.

The optional [Join script](../examples/sonos-toggle-member.yaml) is parsed and
its action/Jinja wiring exercised with synthetic grouping data. Native favorites
Browse Media now requires no external cache recipe; [migrate removed cache setup](SONOS_NATIVE_FAVORITES.md).
These checks do not run HA's configuration validator or test physical devices.
After substituting actual IDs, test the real dashboard/integration behavior.

Top-level `examples/persistent-hub.yaml` and `examples/light-presets.yaml` point to
the current contracts. Older version-prefixed example files are historical material,
not the v1.7 configuration reference. Use the versioned guide for new configuration.

## Reproduce the checks

Use Node 20 (CI), Python 3.12 and a Python virtual environment. Install a Chromium
browser with Playwright and download the pinned button-card test dependency:

```sh
npm ci
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
python -m pip install -r test/browser/requirements.txt
python -m playwright install chromium
curl --fail --location https://github.com/custom-cards/button-card/releases/download/v7.0.1/button-card.js --output /tmp/button-card.js
node test/performance/hub-benchmark.js --output /tmp/honeycomb-evidence/core-performance.json
python test/browser/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/honeycomb-evidence
python test/docs/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/honeycomb-evidence/docs
```

Use `CHROMIUM_PATH` if your Chromium is not found automatically. The harness checks
the pinned button-card SHA before serving it. CI uploads screenshots and JSON evidence
with the existing browser artifacts. Run actionlint on workflow edits and
`git diff --check` before submitting. Production bundle verification uses
`node scripts/check-release.js`; stable publication additionally uses `--stable`.
The v1.7 runtime bundle remains byte-identical to the approved beta.3 implementation.

## Approved stable promotion

Documentation PR #84 and retention PR #88 are merged into restart. The owner has
approved the stable promotion and manually verified the retention variable is
explicitly false; inaccessible Variables API permissions are not bypassed.
The [stable publisher](RELEASING.md) requires that false value in its workflow
context, exact tested master source and matching artifact checksums, and forces
this release's post-publication retention call to remain read-only.

The promotion preserves prior master ancestry and all Git history while selecting
the approved restart source tree. It excludes unfinished #85/#86/#87. Tagging and
publication occur only after the master checks pass; existing tags are never forced.
