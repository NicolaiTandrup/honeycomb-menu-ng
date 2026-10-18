// Public v1.x compatibility adapter. Rendering, gestures, presentation and
// actions live in the same base used by the canonical persistent Hub.
import HoneycombCube from './honeycomb-cube.js';

class HoneycombPersistentControl extends HoneycombCube
{
    static get is() { return 'honeycomb-persistent-control'; }
}

if (!customElements.get(HoneycombPersistentControl.is))
    customElements.define(HoneycombPersistentControl.is, HoneycombPersistentControl);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === HoneycombPersistentControl.is))
    window.customCards.push({ type: HoneycombPersistentControl.is,
        name: 'Honeycomb Persistent Control (compatibility)',
        description: 'Supported v1.x adapter; use honeycomb-persistent-hub for new configurations.' });

export default HoneycombPersistentControl;
