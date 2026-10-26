# v1.9.0-beta.8 candidate review

Baseline: immutable published beta.7 `63a9619d27fe503919389f1a51090a2a01193f80`.
Current scope: issue #140's owner-approved visual correction. This is a candidate,
not a published release. Stable remains v1.8.1; PR #141/beta.7 remain untouched.

## Change and reference

The owner's three annotated designs were provided in the development conversation.
The reference is a dark pointy hex, independently colored outlines, source-facing
orange edge, stationary surrounding cells and transparent background. Annotation
red dots are geometric limits, not UI. White mockup rectangles are editing
artifacts. No owner screenshot/private room names are copied into public fixtures.

The maximum foreground is centered on the existing slot 0 and bounded by all six
natural inward V-junctions of shared 82px first-ring cells. It is approximately
163.1443 × 188.3827px at cube width 82, not beta.7's enclosing/left-shifted hex.
Smaller `scale` and viewport fitting are allowed. Content never changes size.
A compact three-background-cell composition is included in screenshot scenarios.

Shared CubeElement supplies the actual shell: `colors.center` (center fill),
`inner_border`, `outer_border`, with neutral Light submenu defaults. Reference
fixtures intentionally configure dark fill and pink/orange borders to compare
with the owner designs. No existing module renderer/style is redesigned.

The connector defaults to the source's resolved inner border, or permits an explicit
`connector.color`/`connector: false`. Direction uses the source's actual physical
coordinates, including slots 0–18, nested and promoted callers. Center-origin has
no directional distinction and uses the top-right edge. Border-gutter rendering
stays outside the hex text region. No polling or dashboard service calls.

Plain text, stack and positioned modes, static/HA-bound titles and blocks remain;
optional custom footer uses the same safe scalar binding/wrapping contract. Fixed
fonts and content limits/pagination remain. Tiny panels report content that cannot
fit instead of generating endless empty pages. The native return/page hint may
shorten at small sizes; the complete text/instructions remain accessible.

## Owner acceptance after publication is separately approved

1. Install beta.8 through HACS only after its guarded prerelease is authorized and
   published. Show beta versions; choose v1.9.0-beta.8. Use one NG Module resource
   `/hacsfiles/honeycomb-menu-ng/honeycomb-menu-ng.js`; do not enable the DEV loader
   at the same time. Keep button-card. No current beta.8 release URL is implied.
2. Compare a six-cell cluster and a three-cell cluster against the annotated
   designs. The foreground must be centered, notch-bounded and three-layered.
   All exposed original cells must remain visible, unmoved and inactive.
3. Check fill/inner/outer overrides independently, inherited source color, manual
   orange connector, disabling it, and sources on each side/nested menus.
4. Test short static text, live state/attribute/prefix/suffix, title/footer, Danish
   long text, stack/pagination and positioned blocks. Text must never cross borders
   or cause the panel to grow. Very small auto sizes can report content limits.
5. Tap/Enter/Escape returns to the exact caller; fixed 30 seconds closes the whole
   menu regardless of updates, scrolling or page changes. No click-through/service.
6. Resize a picture-elements floorplan with `size: auto`; keep its anchor visible.
   Check mobile/tablet, reload/editor removal, repeated opens and lifecycle cleanup.
7. Check existing Light Color/White/zoom, Sonos Radio/Join/Sleep, Charger controls,
   navigation, coexistence and bee/version. Automated success is not hardware acceptance.

## Release gates

Check `docs/DEVELOPMENT_STATUS.md` for current actual validation, commit/PR/CI and
checksum. Required: full unit/contracts/browser/docs, performance, packaging/HACS,
workflow lint, reproducible normal HACS bundle and exact-head push/PR CI. Then run
existing guarded publisher with `publish=false` for staged/provenance checks only.
Do not publish, merge master, alter tags/releases/assets/retention or touch live HA.
Separate owner publication authorization is still required.
