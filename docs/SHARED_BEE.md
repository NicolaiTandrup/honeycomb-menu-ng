# One shared Honeycomb Bee

The standard Hub Bee and expanded Collapsible Hub Bee use one preset, canonical
mascot, fill/borders, dimensions, animation and installed-version renderer.
No new YAML is needed. The optional expanded Bee center is:

```yaml
collapsible:
  expanded_center: bee
  primary_slot: 1
```

| Context | Short tap / Enter / Space | Hold / Shift+Enter / Shift+Space |
| --- | --- | --- |
| Standard branded Bee | Reveal installed version | Reveal installed version |
| Expanded root Bee | Back / Collapse | Reveal installed version without collapse |

The label is derived from actual build/release metadata, e.g. **v1.10.0 beta 5**.
It remains readable for three seconds; flight motion itself lasts 430ms. Repeated
inspection restarts one reveal window. Reduced-motion users retain the label
without flight. Detach cancels timers/frames. A hold never also triggers collapse
or the primary room action. Keyboard users can also use Alt+V on a Bee icon.

Explicit colors, backgrounds, borders and gradients remain supported. Functional
generic controls that happen to use a Bee icon retain their module semantics
and configured actions/styles; Alt+V makes the shared version available without
replacing those actions. A generic fallback icon is not a decorative status-free
Hub logo. Radio, Climate and other module appearances are unchanged.

## Future mascot replacement

Replace only `assets/honeycomb-bee.png`, then run `npm run prepare:brand` and the
normal build. `scripts/generate-bee-asset.js` generates the embedded derivative
`src/brand/bee.generated.js`. Do not hand-edit or duplicate that derivative.
`src/core/bee.js` owns shared preset/tokens, asset reference and version metadata;
`src/cube-element.js` remains the single renderer and gesture/animation owner.
The existing `src/core/version-label.js` remains the only version formatter.

A future new Bee artwork is outside beta.5. Broad cleanup/review in issue #154
remains deferred until owner beta.5 acceptance. Automated screenshots with
synthetic HA are separate from owner physical Android/PC acceptance.
