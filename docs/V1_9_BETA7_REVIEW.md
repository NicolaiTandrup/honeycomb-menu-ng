# v1.9.0-beta.7 development review and installation

**Beta.7 is now published for owner HACS testing.** See the
[official release/HACS instructions](V1_9_BETA7_RELEASE.md). This document retains
the separate optional private DEV package/install history. Never load the private
loader and official HACS NG runtime together. Stable/master remain unchanged;
real-HA acceptance and stable approval are still pending.

- Implementation PR: [#141](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/141),
  branch `feature/issue140-info-cube-beta7`, unmerged.
- Tested code/development source: `63a9619d27fe503919389f1a51090a2a01193f80`.
- Separate immutable development delivery commit:
  `ff4ada2106855edb7cfb5eb2bc54361e7034d700`, branch `dev/issue140-beta7-package-63a9619`.
- This Markdown-only handoff is separate from the frozen candidate so the
  installed manifest, embedded identity and exact source/CI checks remain truthful.

## Verified payloads

| Artifact | SHA256 |
|---|---|
| Normal candidate HACS bundle | `c5ca926abd3a5dd5f58b7627c65218fff5b1d682b76d97639d94b82b39a7a62e` |
| Private development runtime (267694 bytes) | `8c8d4f1e324c08cd3d765a28ca592a17e71ed48272c6b30d53569db78a0e1b1e` |
| Unchanged development loader | `2bd424b9d5bf831cc21751d7227e95eb30df162e43d51dd4852509458fb20f69` |
| Terminal installer | `01375e67de8db37619a577746f0acbeb07547acf04a5d0158f5b0ef6340ca7d5` |
| Complete development ZIP (106812 bytes) | `8b2e6c62cc5c5586ed73eb73b06022be8e6613a3baff5b922024b91148112182` |

[Download the development ZIP](https://raw.githubusercontent.com/NicolaiTandrup/honeycomb-menu-ng/ff4ada2106855edb7cfb5eb2bc54361e7034d700/development/beta7/honeycomb-v1.9.0-beta.7-dev.zip).
It includes GPL license, install guide, manifest, hashed runtime, loader, both
installers, per-file checksums and source provenance. Repeated normal/dev builds
and deterministic ZIP creation reproduced byte-for-byte. Anonymous public download,
all package checksums and the actual GitHub download/install command were verified
against a disposable local www directory, never a real HA deployment.

## Install from development HA Terminal & SSH

Open the Terminal add-on on the **independent development HA instance only**.
This writes static `www/honeycomb-dev` files. It does not edit YAML/resources,
contact an HA API, call a service, modify HACS or delete older runtimes.
Requires curl, jq, sha256sum and ordinary POSIX utilities; no PC/Git/Node on HA.

```sh
HONEYCOMB_DEV_URL='https://raw.githubusercontent.com/NicolaiTandrup/honeycomb-menu-ng/ff4ada2106855edb7cfb5eb2bc54361e7034d700/development/beta7/honeycomb-dev'
curl -fsSL "$HONEYCOMB_DEV_URL/install-dev.sh" -o /tmp/honeycomb-install-dev.sh &&
printf '%s  %s\n' '01375e67de8db37619a577746f0acbeb07547acf04a5d0158f5b0ef6340ca7d5' /tmp/honeycomb-install-dev.sh | sha256sum -c - &&
sh /tmp/honeycomb-install-dev.sh --url "$HONEYCOMB_DEV_URL" --www /config/www
```

Keep the existing single JavaScript Module resource unchanged:
`/local/honeycomb-dev/honeycomb-menu-ng.js`. Reload the dashboard normally after
installation. No new resource URL/query string or routine manual cache clearing.
Do not load a HACS NG copy and the DEV loader together in the same HA instance.
The normal HACS candidate bundle is separate and was not replaced by this loader.

The console must show technical identity
`1.9.0-beta.7-dev+63a9619d27fe` at `window.honeycombNG.version` and the full source
SHA at `.commit`. Bee activation shows human label **v1.9.0 beta 7** inside its
existing hexagon, with the existing animation and reduced-motion behavior.

## Open Info without real devices

Paste this complete Manual card on the development dashboard:

```yaml
type: custom:honeycomb-persistent-hub
size: 82
logo: auto
items:
  - type: generic
    slot: 1
    name: Info
    icon: mdi:information-outline
    tap_action:
      action: honeycomb-info
      info:
        title: Read-only information
        text: A long plain-text message wraps inside the hexagon. Tap to return.
```

[Reference](INFO_CUBE.md), [module API](MODULE_AUTHORING.md),
[paragraph](../examples/info-text.yaml), [stack](../examples/info-stack.yaml),
[positioned](../examples/info-positioned.yaml), [dynamic HA](../examples/info-dynamic.yaml)
and [synthetic EV charging plan](../examples/info-charging-plan.yaml).
No PE/CM integration or physical charging commands are required.

## Verification and acceptance boundary

Final validation coverage: 394 Node passes / three stable-only skips;
six native Sonos Sleep boundary contracts; 387 Chromium scenarios, including
48 Info cases and 18 documentation interactions; 14 additional private dev/loader
checks. Docs: 59 YAML blocks, 44 complete cards + 11 contextual fragments, 234
local links. HACS packaging/GPL, metadata, workflow lint, performance and build
reproduction passed. The inherited 136-case local core group preceded the final
Info-only focus/resizing and empty-payload refinements; the final targeted Info suite covers them,
and exact-head CI revalidates every group on the final source. The prior local
full run had 384 cases; final Info coverage expands the complete CI set to 387.

Exact-head [push CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40358991329)
and [PR CI](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40359002833)
are the authoritative full-suite results; check their conclusions before any
later publication. Official [HACS repository readiness](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40359213589)
passed. That official action checks repository catalog eligibility/default-branch
metadata; local packaging and exact-head Build CI validate this candidate bundle.

CI evidence: download `shared-cube-evidence`, then `info-cube/` for desktop/tablet/
mobile paragraph, long page, positioned, 41px autoscale and charging-plan captures.
All fixtures are synthetic. Browser plugin was unavailable; the repository's
pinned Playwright/Chromium workflow was used. No Firefox/WebKit, native mobile
pinch, real hardware, live HACS install or Terminal add-on execution is claimed.

Owner previously tested available beta.6 Light/OFF/bee behavior positively. New
Info Cube needs real-HA acceptance. Sonos/Charger remain automated evidence unless
separately owner-tested. Keep #140, #137 and #138 open where acceptance is pending.

## Owner checklist

1. Install/reload with the permanent resource; check actual technical/bee identity.
2. Open paragraph, stacked and positioned examples. Confirm the literal 0–7
   left-shifted footprint, gray native styling, Danish/long-word containment,
   readable fonts and pagination on desktop/tablet/mobile.
3. Tap/Enter/Escape returns exactly to root, Light zoom, Sonos or Charger menu;
   no underlying control can activate while Info is open. Back depth stays intact.
4. Wait the full 30 seconds without tapping: close the entire calling menu to
   the floorplan (persistent Hub base remains). State updates/scroll do not extend it.
5. Test live values/fallback/stale state, auto sizing/window resize, repeated opens,
   dashboard editing/removal and an ordinary reload after another dev deployment.
6. Smoke-test Light OFF/ON/unavailable and cube-3 Color/White/Hue/Kelvin, bee,
   available Sonos Radio/Join/Sleep and Charger controls without unintended commands.

Known bounds: 128 blocks, 32768 resolved characters, 64 pages, fixed 30-second
lifetime. Positioned overflow is explicitly limited; use stack mode for pagination.
No HTML/JS execution or speculative integration. Existing fixed-82px 410px Light
palettes retain their prior narrow-screen clipping; Info alone fits the viewport.
A proxy ignoring both no-store and the manifest nonce still needs its own cache
configuration. These are not new production/HACS cache settings.

Beta.7 publication was separately owner-authorized and completed. Never republish
or reuse its tag/assets. Further fixes require new tested commits and an immutable
new beta under appropriate authorization. Stable promotion/merge still needs
explicit owner approval after real-HA acceptance.
