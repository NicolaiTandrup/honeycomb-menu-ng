// Capabilities describe possible controls; color_mode describes actual state.
// A bounded, connection-scoped session memory is used only for off/null mode.
const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'];
const sessions = new WeakMap();
function capabilities(state) {
    const attrs = state && state.attributes || {};
    const modes = Array.isArray(attrs.supported_color_modes) ? attrs.supported_color_modes : [];
    return {modes, colorCapable:modes.some(mode=>COLOR_MODES.includes(mode)),
        temperatureCapable:modes.includes('color_temp'),
        minKelvin:attrs.min_color_temp_kelvin, maxKelvin:attrs.max_color_temp_kelvin};
}
function paletteFor(mode, caps) {
    return mode === 'color_temp' && caps.temperatureCapable ? 'white' :
        COLOR_MODES.includes(mode) && caps.modes.includes(mode) ? 'color' : null;
}
function selectedPalette(hass, entity) {
    const state = hass && hass.states && hass.states[entity], caps = capabilities(state);
    const key = hass && (hass.connection || hass);
    let memory;
    if (key && typeof key === 'object') {
        memory = sessions.get(key);
        if (!memory) {memory = new Map(); sessions.set(key, memory);}
    }
    const valid = state && ['on','off'].includes(state.state) && paletteFor(state.attributes && state.attributes.color_mode, caps);
    if (valid && memory) {
        memory.delete(entity); memory.set(entity, state.attributes.color_mode);
        if (memory.size > 256) memory.delete(memory.keys().next().value);
    }
    const retained = state && state.state === 'off' && !valid && memory &&
        paletteFor(memory.get(entity), caps);
    return valid || retained || (caps.colorCapable ? 'color' : caps.temperatureCapable ? 'white' : null);
}
module.exports = {capabilities, selectedPalette};
