# v1.7.0 Phase 1: shared cube engine

**Historical beta.1/beta.2 contract.** PR #77 was subsequently merged into
restart/v1.5.1. For the current beta.3 visibility/placement behavior use
[Phase 2](V1_7_PHASE2.md); the historical limitations below describe Phase 1 only.

This beta starts at `restart/v1.5.1`, commit
`c1d9507ee48e65b951f6302c668dadf17043c195`. It contains no merged,
cherry-picked or ported v1.6 implementation. Its feature PR targets the restart
branch. The beta is published from the tested feature commit and is **not yet
merged into restart/v1.5.1**. Master and the latest stable release are unchanged.

Beta.2 fixes menu-owned launcher visibility after nested Light navigation.
See the [Issue #78 investigation and unchanged Light slot map](ISSUE_78.md).

## Public components

Both components use `CubeElement` for geometry, appearance, HA presentation,
actions and gestures. Hub composes items; Control resolves one module. The default
width is 82 CSS pixels for both. Full-cell faces use the v1.5.1 Hub polygon;
height is width × 1.1547. All managed menu cells use the same engine, including
promoted centers, generic controls, favorites and nested actions.

```yaml
type: custom:honeycomb-persistent-hub
size: 82
logo: auto
items:
  - type: light
    entity: light.zone_a
  - type: sonos
    entity: media_player.player_a
    favorites_sensor: sensor.favorites
```

```yaml
type: custom:honeycomb-persistent-control
module: light
entity: light.zone_a
size: 82
show_name: true
name: Light A
colors:
  outer_border: '#34383d'
border:
  outer_width: 3
  inner_width: 3
```

Control supports `module: generic`, `light`, `media` and `sonos`. The same module
menu builder used by Hub supplies its details. `module: media` selects generic
media, while existing Hub `type: media` remains the Sonos-oriented alias.
Control's old `mode` variants remain usable internally; use `module` for new YAML.
No backward-compatibility guarantee is made for the old standalone Control schema.

## Appearance and actions

Use the existing `colors.center`, `colors.inner_border`, `colors.outer_border`,
`border.outer_width` and `border.inner_width` on either component or a Hub item.
Colors, names, labels and style values accept Honeycomb `[[[ ... ]]]` templates.
The outer ring defaults to neutral `#34383d`, also while unavailable. Light and
Media retain their domain-derived center/inner color and secondary status.

Use `show_name: true` with `name` for primary text; `label` and `show_label` select
secondary text. Without an explicit label, module status supplies the secondary
line. Icon size is 34% without text, 30% with text; single-line text is 16% of
cube width, with a 12% secondary line when both lines are present. Explicit
`styles.icon`, `styles.name`, `styles.label` and grid overrides take precedence.

Generic cards retain solid `background`, `foreground`, `styles.card.background`
and background-image styling. Explicit generic card backgrounds override the
resolved generic center fill, so palette swatches keep their colors. The common
SVG owns ring geometry; a rectangular `styles.card.border` is not another ring.
Favorite artwork is clipped within the shared center and refreshes from the cache.

Tap, hold, double tap, keyboard and drag-select use the shared action handler.
Hold opens the generated module menu unless `hold_action` is supplied. Tap stays
immediate unless a double-tap action is configured (300 ms recognition window).
Standard toggle/service/more-info/navigation/URL/fire-dom-event actions and the
existing Light preset/Media custom registry are supported. Service templates are
evaluated at activation time, without mutating the source configuration.

Advanced custom cards/custom_fields may use a content-only button-card adapter.
Its pointer actions are disabled so the shared surface owns one interaction.
Arbitrary button-card-only action/template contexts are not promised to be fully
compatible; validate advanced custom content in Home Assistant.

## Center, size and navigation

`logo: auto` retains the v1.5.1 count behavior: branding for 2–6 items, one normal
center item for one item, and no branding from seven items onward. `logo: false`
removes **branding only**. Ordinary items may occupy physical slot 0. Explicit
slot 0 also takes precedence over auto branding. An empty Hub does not invent a
bee or an interactive fallback.

Standalone and Hub host width now follows configured `size`, rather than falling
back to the old 72 px host width. Legacy inset faces are replaced by full-cell
faces. Classic popup `size` keeps its historical menu-extent conversion at the
boundary; persistent components translate actual cell width into that API.
Menu expansion inherits the physical cell size and retains the module anchor.
Inherited inner controls keep their resolved appearance; new nested menus keep
their own defaults rather than inheriting unrelated parent styles.

Base anchors follow resize, scroll and observed ancestor style/class changes.
Nested module anchors stay locked; returning uses the current base anchor.
Teardown synchronously removes owned overlays, timers and observers. Continuous
CSS position animations without observable layout/style changes are not followed
every frame. Anchored scenes preserve size and anchor at viewport edges, so a
large ring can extend beyond a narrow screen; there is no automatic shrink/paging.

## Configured item count and later placement work

Hub no longer truncates its input at seven. Layout can grow beyond the original
18 ring positions using additional axial rings; regression coverage renders 50
Hub items and checks geometry through 200 cells. Practical screen space and DOM
cost still matter. Existing domain palettes/favorites retain their established
12 outer choices; this is separate from the Hub's configured item population.

Phase 1 preserves static hard/soft and legacy opening-time `show` behavior.
Declarative dynamic `visibility` and `slot_mode: priority` are **not implemented**;
configuration containing them is rejected with a later-phase message instead of
silently pretending to support them. No Car or Charger module is implemented.

Future placement is a pure core operation over stable item identities and an
extensible slot pool: reserve all hard slots (including hidden reservations),
then assign visible preferred priority claims, their fallbacks, and soft items.
Thus hard > priority > soft. Neither modules nor the renderer own this policy.
Live conditional allocation and hidden-child/gesture deferral belong to Phase 2.

## Regression evidence

`test/visual-baseline/v1.5.1` contains synthetic desktop/mobile captures from the
unchanged v1.5.1 bundle, with provenance and PNG hashes in `manifest.json`. A fixed
82 px host CSS width isolates its canonical Hub face from its old host-size bug.
The test shell supplies a deterministic icon glyph and simulated HA state/services;
button-card 7.0.1 is real and checksum-pinned. Screenshots do not prove real-device
or integration behavior.

Intentional reference differences: Control now defaults to the Hub's 82 px
full-cell face; generic cubes adopt shared proportional text/icons/rings instead
of their old fixed sizes. Shadow is owned by each shared cell so standalone
and grouped cubes match. Configured preset-specific styles still take precedence.

Run:

```sh
npm ci
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
node scripts/check-beta.js
python -m pip install -r test/browser/requirements.txt
python -m playwright install chromium
curl -fL https://github.com/custom-cards/button-card/releases/download/v7.0.1/button-card.js -o /tmp/button-card.js
python test/browser/run.py --bundle honeycomb-menu-ng.js --button-card /tmp/button-card.js --evidence-dir /tmp/honeycomb-evidence
```

HA events are forwarded by the owning menu. The former 200 ms poll and perpetual
Hub anchor RAF loop are removed. Resolved model signatures suppress unchanged
cube renders, including unrelated HA updates with the same hass identity.
No performance improvement is claimed without comparative measurements. Full
5/20/50-item timing/listener/memory benchmarks remain later-phase work; remember
that v1.5.1 rendered only seven items even when configured with 20 or 50.
