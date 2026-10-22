# Honeycomb NG — layout and terminology

This document defines the shared **Danish ↔ English** naming convention for UI design, code review, GitHub issues, Codex prompts and user documentation. Use the [README Layout model](../README.md#layout-model) as the authoritative source for physical slot coordinates. **A menu ring consists of multiple cells; a border belongs to one cell. They are not interchangeable.**

## 1. Menu geometry / menuniveau

The numbers below are *physical slot IDs*, not item order, index in a favorites list or border names.

```text
        [ 9]    [10]    [11]
    [ 8]    [ 2]    [ 3]    [12]
[ 7]    [ 1]    [ 0]    [ 4]    [13]
    [18]    [ 6]    [ 5]    [14]
        [17]    [16]    [15]
```

| Danish — canonical | English — canonical | Definition |
|---|---|---|
| **Centerkube** | **Center cube / center cell** | Cell occupying physical slot **0**, whatever its current role |
| **Indre menuring** | **Inner menu ring** | Six separate cells at physical slots **1–6** |
| **Ydre menuring** | **Outer menu ring** | Twelve separate cells at physical slots **7–18** |
| **Yderligere menuringe** | **Additional menu rings** | Optional Hub rings at **19–36, 37–60, 61–90, 91–126, 127–168, 169–216** |
| **Menukube** | **Menu cube / menu cell** | One cell occupying a menu slot |
| **Slot / fysisk position** | **Slot / physical slot** | A stable numbered position; independent of the cube's content |
| **Menuniveau** | **Menu level** | One active arrangement of cells |
| **Undermenu** | **Submenu / nested menu** | Menu level opened from another menu cube |

**Terminology rule:** never say *inderring* or *yderring* without qualifying whether it is a **menuring** or a **kubekant**. Prefer the exact terms above.

## 2. Anatomy of a single cube / kubeniveau

These terms describe the **visual layers of ONE cube**, regardless of whether it is in the center or in a menu ring.

| Danish — canonical | English — canonical | Associated concept / configuration |
|---|---|---|
| **Kubefyld** | **Cube fill / center fill** | The interior background, conceptually `colors.center` |
| **Inderkant** | **Inner border** | The colored border immediately around the fill, conceptually `colors.inner_border` |
| **Yderkant** | **Outer border** | The outermost border around that cube, conceptually `colors.outer_border` |
| **Kubeikon** | **Cube icon** | Symbol rendered in the cube, commonly `icon` |
| **Kubelogo / kubebillede** | **Cube artwork / logo** | Media artwork or logo that may replace the icon; `thumbnail` can provide its URL |
| **Kubetekst** | **Cube text / label** | Name, state, secondary label or value shown inside the cube |
| **Kubestørrelse** | **Cube size** | Cell dimension; Hub/Control use the shared **82 CSS-px default** |

**Important:** These are conceptual UI names. The exact property shape may depend on renderer/module context; do not assume every example supports the same YAML keys at every level. See module documentation for supported properties.

## 3. Cube roles / roller

A **role** tells us what a cube does; a **slot** tells us where it sits. One cube can change role as the user navigates.

| Danish — canonical | English — canonical | Definition |
|---|---|---|
| **Hub-kube** | **Hub launcher / persistent Hub entry** | Persistent cube attached to the dashboard/floorplan that opens the Hub menu; it is **not automatically slot 0** |
| **Modulkube** | **Module launcher** | A menu cube selecting a module such as Sonos or Light |
| **Promoveret centerkube** | **Promoted center cube** | Module cube promoted to **slot 0** in its submenu; often displays controls/state |
| **Tilbagekube** | **Back cube / back control** | Navigation control returning to the previous level |
| **Funktionskube** | **Action cube** | Cell executing an action such as play/pause or changing brightness |
| **Favoritkube** | **Favorite cube** | Cell representing a selected radio/media favorite or preset |

The Hub's own **persistent launcher**, the **module launcher inside the Hub menu**, and the **promoted center of a submenu** can have different rendering/configuration paths; when reporting bugs, identify each surface separately.

## 4. Precise examples for bug reports

**Sonos station artwork and playback:** “The **Sonos module launcher in the Hub menu** and the **promoted center cube in its Sonos submenu** should show the recognized station's **cube artwork**, station accent on the **inner border**, and station accent as **cube fill** while playing. On pause, make only the **cube fill** neutral gray, retaining valid artwork/accent where appropriate.”

**Light Color Zoom:** “Long-press the favorite color's **menu cube in outer menu ring (physical slot 7–18)**. Keep that exact slot/color anchored while updating the other cells; **do not change the selected cube's inner border or invoke a short tap** unless the feature explicitly requires it.”

**Unambiguous issue wording:** specify (1) which menu level, (2) which cube role, (3) which physical slot, (4) whether a requested color change targets the **cube fill**, **inner border**, **outer border**, or a **different menu cube**, and (5) expected playing/paused/on/off behavior.

## Shared visual design contract — Light is the canonical reference

**OWNER DECISION:** The existing **Light module** defines the visual baseline for **every Honeycomb module**, including Sonos/Media, Climate, Car, Charger and future modules. This is a shared presentation contract, not an instruction to copy Light-specific behaviors or capabilities.

- Reuse the same **82px cube geometry**, hex shape, consistent cube fill / inner border / outer border layering, visual weight and interactive feedback.
- Follow Light's **icon/artwork size and positioning**, primary/secondary label typography, alignment, line height, vertical balance, padding, icon-to-text gaps and text-overflow behavior. When module artwork/metrics differ, adjust against Light's reference rather than inventing a competing layout model.
- Retain the same **physical slot conventions**, center anchoring, nested menu navigation, Back behavior, gestures and state presentation principles through the shared renderer.
- Module-specific states, colors, labels, imagery and actions are allowed **within** the baseline. Color cues for charging, media playback, etc. must be explicit and should not silently change structural layout, cube sizing or font hierarchy.
- **Single source of truth:** prefer a reusable shared renderer/presentation primitive or shared design tokens over copying per-module pixel offsets. Avoid parallel module-specific CSS rules that drift from Light.
- Before adding or changing a module, include **side-by-side Light-versus-module screenshots** for representative states in both desktop and mobile/touch viewports, plus regression tests for text/icon centering and clipping.
- Preserve Light's currently working presentation. Do not impose vendor-specific Tesla, Easee or Sonos semantics on the base Light module.

This convention applies to both standalone Control and the persistent Hub, regardless of which integration supplies state and actions.

## 5. Classic menu caveat

Classic popups have different conventions: their center is `center_button`, not Hub `slot: 0`. Classic `position: 0` means the first ring position, and classic `size` defaults to a scene extent rather than the Hub/Control's 82 CSS-px cell. See [Classic menu](CLASSIC_MENU.md). Do not translate Hub slot meanings blindly to Classic.

## 6. Rules for docs and agent contributions

- Use the **canonical English terms** in code review, PRs, commit messages, tests and Codex tasks. Optional Danish names are welcome in user-facing examples.
- Avoid bare “inner ring”, “outer ring” or “center” in a context where they could mean either menu geometry or cube styling.
- Keep physical-slot maps synced with `src/core/layout.js` and README's marked layout diagram.
- Document module-specific exceptions explicitly instead of silently redefining this glossary.
- Use synthetic Home Assistant entities only in public examples (e.g. `media_player.player_a`).
