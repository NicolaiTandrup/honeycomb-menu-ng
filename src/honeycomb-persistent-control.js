import CubeElement from './cube-element.js';

// The standalone adapter resolves the same modules and uses the same renderer
// as Hub items and nested menu cubes. Public mode aliases remain optional.
class HoneycombPersistentControl extends CubeElement {
    static get is() { return 'honeycomb-persistent-control'; }
}
if (!customElements.get(HoneycombPersistentControl.is))
    customElements.define(HoneycombPersistentControl.is, HoneycombPersistentControl);
window.customCards = window.customCards || [];
if (!window.customCards.some(card=>card.type===HoneycombPersistentControl.is))
    window.customCards.push({type:HoneycombPersistentControl.is,name:'Honeycomb Persistent Control',
        description:'Single module using the shared Honeycomb cube engine.'});
export default HoneycombPersistentControl;
