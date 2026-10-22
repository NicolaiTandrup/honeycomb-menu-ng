const {validateGradient}=require('./cube-presentation');
const energyWave=require('./energy-wave');
const {referenceWidth}=require('./image-sizing');
const merge = require('lodash/merge');
const { moduleRegistry } = require('../modules/index.js');
const chargerConfig=require('../modules/charger/config');

function rejectRemovedSonosOptions(config)
{
    if (config.favorites_cache_sensor !== undefined)
        throw new Error('favorites_cache_sensor was removed in v1.8.0-beta.4. Remove this option and the custom favorites-cache template; Sonos now uses native Browse Media.');
    if (config.favorites_browse !== undefined)
        throw new Error('favorites_browse is not configurable: native Browse Media is now the only Sonos metadata source. Remove this option.');
}

// Domain adapters return data. Geometry, rendering and gestures never belong
// to a module. Both public entry points use this exact compilation boundary.
function buildCubeConfig(item, hass, index = 0, slot = 0)
{
    rejectRemovedSonosOptions(item);
    rejectRemovedSonosOptions(item.persistent || {});
    if (item.module && !moduleRegistry.get(item.module)) throw new Error(`Unknown Honeycomb module: ${item.module}`);
    const module = moduleRegistry.resolve(item, hass);
    const submenu = item.menu !== undefined ? merge({}, item.menu)
        : module.buildMenu ? module.buildMenu({ item, hass }) : null;
    const launcher = module.buildLauncher({ item, index, slot, submenu, hass });
    const overrides = {};
    for (const key of ['entity','name','label','show_name','show_label','show_icon','icon',
        'background','foreground','colors','border','styles','variables','interactive',
        'tap_action','hold_action','double_tap_action','autoclose','audio','off',
        'active_color','show_brightness','show_volume','presets','hold_time','custom_fields','energy_wave'])
        if (item[key] !== undefined) overrides[key] = item[key];
    const compiled=merge({},launcher,{face_mode:'cell'},overrides,item.persistent || {});
    for (const key of ['tap_action','hold_action','double_tap_action']) {
        if (item.persistent && item.persistent[key] !== undefined) compiled[key]=merge({},item.persistent[key]);
        else if (overrides[key] !== undefined) compiled[key]=typeof overrides[key] === 'string' ? overrides[key] : merge({},overrides[key]);
    }
    return compiled;
}

// Phase 2 applies only at the Hub item boundary. Classic submenu conditions
// keep their existing show semantics; unsupported dynamic keys fail explicitly.
function validateCubeConfig(config, {hubItems = false, placement = false} = {})
{
    if (!config || typeof config !== 'object') throw new Error('A Honeycomb configuration is required.');
    rejectRemovedSonosOptions(config);
    if (!placement && (config.visibility !== undefined || config.slot_mode === 'priority'))
        throw new Error('Dynamic visibility and priority placement are supported only on Hub items.');
    validateGradient(config.colors && config.colors.fill_gradient);
    chargerConfig.validate(config);
    if (config._charger || ['charger','charging-hub'].includes(config.type) || ['charger','charging-hub'].includes(config.module)) chargerConfig.waveOptions(config.energy_wave);
    else energyWave.validate(config.energy_wave);
    referenceWidth(config.auto_reference_width);
    if (Array.isArray(config)) {
        config.forEach(value => { if (value && typeof value === 'object') validateCubeConfig(value, {placement}); });
        return;
    }
    for (const key of ['items','buttons','menu','tap_action','hold_action',
        'double_tap_action','honeycomb_menu','honeycomb_nested_menu','persistent']) {
        const value = config[key];
        if (value && typeof value === 'object') validateCubeConfig(value, {placement:hubItems && key === 'items'});
    }
}

module.exports = { buildCubeConfig, validateCubeConfig };
