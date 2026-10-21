// Local module state can change after an action without a HA state event.
// Only subscribed faces are refreshed; no polling or synthetic HA state writes.
const listeners=new WeakMap();
function connectionKey(hass) { return hass && (hass.connection || hass.callService); }
function subscribe(hass, callback) {
    const key=connectionKey(hass);
    if (!key || !['object','function'].includes(typeof key)) return ()=>{};
    if (!listeners.has(key)) listeners.set(key,new Set());
    const set=listeners.get(key);set.add(callback);
    return ()=>{set.delete(callback);};
}
function invalidate(hass) {
    const set=listeners.get(connectionKey(hass));
    if (set) [...set].forEach(callback=>callback());
}
module.exports={connectionKey,subscribe,invalidate};
