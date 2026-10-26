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

## Automated release-readiness evidence

Frozen source: `3c4cad33db8d47f78c3c5673d346fe40eccb8590` on
`feature/issue140-info-cube-beta8`; [review PR #142](https://github.com/NicolaiTandrup/honeycomb-menu-ng/pull/142).
Normal HACS bundle:270656 bytes, SHA256
`587ed3389a160bc60c9c8372322bdcd3e43a37fc904e5b730adde4b3bc5f4a15`.
The [commit-pinned JavaScript](https://raw.githubusercontent.com/NicolaiTandrup/honeycomb-menu-ng/3c4cad33db8d47f78c3c5673d346fe40eccb8590/honeycomb-menu-ng.js)
was independently downloaded and compared with committed/rebuilt bytes. It is not
the development loader. No beta.8 release/tag currently exists.

398 Node passes /3 stable-only skips; 402 Chromium scenarios (63 Info,18 docs,
eight coexistence), six native Sonos Sleep boundary contracts. Source docs:59
YAML,44 cards+11fragments,235 links. HACS/GPL/package, workflow lint, performance,
metadata and reproducible build pass. Exact-source
[push CI40377756453](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40377756453)
and [PR CI40377766916](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40377766916)
are green, all jobs/steps. Local inherited run began before the final Info-only
refinement; final exact-source CI is authoritative for the entire cumulative build.

[Guarded preparation40381755296](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40381755296)
passed with publish=false: fresh exact head/CI/metadata and immutable unused-tag
gates; staged/source/CI/rebuilt JS/checksum comparisons; source/CI provenance.
Publish job skipped. [Prepared assets](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40381755296/artifacts/12677964330)
contain JS, sums and provenance. Staged bytes verified in GitHub Actions; no
independent local Actions-archive download claim. No public release was created.

## QA flow and screenshot evidence

Flow: synthetic HA Hub or existing module menu → Info action → centered native
foreground → tap/keyboard exact return or fixed30-second close-all. Browser plugin
unavailable; repository Playwright Chromium at1100×900,768×1024 and390×844.
No physical Home Assistant connection, installation or device command.

| Check | Result |
|---|---|
| Page identity and meaningful content | Pass — synthetic HA test fixture/title and rendered dialog |
| Framework/error overlay | Pass — no hui-error-card or runtime error overlay |
| Console health | Pass — no relevant console/page errors |
| Screenshot/reference geometry | Pass — normal + compact three-cell before/Info/return |
| Interaction and cleanup | Pass — source slots0–18, live bindings, touch/keyboard, timeout, resize/removal |
| Hardware acceptance | Pending — owner development HA after authorized publication |

[CI screenshot archive](https://github.com/NicolaiTandrup/honeycomb-menu-ng/actions/runs/40377756453/artifacts/12679031308),
folder info-cube: `1100/768/390-reference-normal-before/info/return.png` and compact
counterparts. Workspace `review/` also has six legible cropped comparison strips.
Mockups were reviewed inline from the owner's provided composite; the matching
issue attachment is now present. A direct workspace attachment download was proxy
blocked (403), but the supplied inline reference was available and reviewed.
No private owner image/room name copied into public fixtures. Screenshots compare
the intended composition; there is no claim of pixel-identical rough mockups.

## Release gate and remaining limits

Technically ready for guarded HACS beta publication; separate explicit owner
approval remains mandatory. No master/stable merge, tag/release overwrite/deletion,
retention change, external catalog submission or production HA action authorized.
#140 remains open for acceptance. When authorized, rerun fresh guards against the
same exact tested head; a moved branch requires validation of its new commit.

Chromium only; no Firefox/WebKit, physical pinch/real Pi or live HACS test claim.
Fixed30s/128blocks/32768characters/64pages; positioned and tiny-panel content limits
remain explicit. Keep caller anchor visible. Existing fixed410px Light palette
clipping on390px remains inherited; no unrelated module redesign included.
