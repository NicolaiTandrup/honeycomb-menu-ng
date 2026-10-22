import CubeElement from './cube-element.js';

// Menu placement is separate from presentation: native, generic and nested
// controls all consume the shared full-cell engine.
class HoneycombMenuItem extends CubeElement {
    static get is() { return 'honeycomb-menu-ng-item'; }
}
customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
