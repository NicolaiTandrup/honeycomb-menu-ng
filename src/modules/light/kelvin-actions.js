const {nativeRange,refineKelvinPalette}=require('./kelvin-zoom.js');
const {buildWhitePaletteButtons}=require('./controls.js');
function notifyUser(message)
{
    if (typeof document==='undefined') return;
    const root=document.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true}));
}
function applyKelvin({hass,entity,actionConfig,notify=notifyUser})
{
    const range=nativeRange(hass && hass.states && hass.states[entity]);
    const value=actionConfig && actionConfig.data && actionConfig.data.color_temp_kelvin;
    if (!range || !Number.isSafeInteger(value) || value<range.min || value>range.max || typeof hass.callService!=='function') {
        notify('White palette is unavailable or its Kelvin range changed. Close and reopen the Light menu.');
        return false;
    }
    try {
        const request=hass.callService('light','turn_on',{color_temp_kelvin:value},{entity_id:entity});
        if (request && typeof request.catch==='function') request.catch(()=>notify('Home Assistant could not apply the selected Kelvin temperature.'));
        return true;
    } catch (_) {notify('Home Assistant could not apply the selected Kelvin temperature.');return false;}
}
function zoomKelvin({hass,entity,actionConfig,openNested,notify=notifyUser})
{
    const range=nativeRange(hass && hass.states && hass.states[entity]);
    if (!range || typeof openNested!=='function') return false;
    let palette;
    try {palette=refineKelvinPalette(actionConfig.palette,actionConfig.selected,range);}
    catch (_) {notify('White palette range changed. Close and reopen the Light menu.');return false;}
    if (!palette) return false; // No duplicate swatches or redundant history level.
    openNested({entity,nested_expand:true,inherit_inner:true,empty_slots:'hidden',idle_timeout:8000,
        buttons:buildWhitePaletteButtons({minKelvin:range.min,maxKelvin:range.max},palette)});
    return true;
}
function registerActions(registry)
{
    registry.register('honeycomb-light-kelvin-apply',applyKelvin);
    registry.register('honeycomb-light-kelvin-zoom',zoomKelvin);
}
module.exports={applyKelvin,zoomKelvin,registerActions};
