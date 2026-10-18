import { getTemplateOrValue, fireEvent } from './helpers.js';
const merge = require('lodash/merge');
const { customActionRegistry } = require('./core/action-registry.js');

export function owningContext(item)
{
    const host = item.getRootNode && item.getRootNode().host;
    return item._menuContext || (host && host._menuContext) || null;
}

// Both wrapped button-cards and native cubes route Honeycomb actions here.
// Standard HA actions on wrapped cards remain delegated to Home Assistant.
export function dispatchCubeAction(item, action, menuConfig)
{
    if (!action) return false;
    const context = owningContext(item);
    const config = item.config || {};
    if (action.action === 'honeycomb-open-nested' && action.honeycomb_nested_menu) {
        const nested = merge({nested_expand:true}, action.honeycomb_nested_menu);
        nested.variables = merge({}, config.variables || {}, nested.variables || {});
        window.honeycomb_menu_in_context(context, nested, config);
    } else if (action.action === 'honeycomb-back') {
        window.honeycomb_menu_context_back(context);
    } else if (action.action === 'honeycomb-close') {
        window.honeycomb_menu_context_close(context);
    } else if (action.action === 'honeycomb-open-menu' && item._openMenu) {
        item._openMenu();
    } else if (action.action === 'honeycomb-bee-flap' && item._flapBee) {
        item._flapBee();
    } else if (customActionRegistry.has(action.action)) {
        const evaluated = getTemplateOrValue(item.hass, item.hass.states[config.entity],
            config.variables || {}, merge({}, action));
        customActionRegistry.handle(action.action, {hass:item.hass, actionConfig:evaluated,
            entity:config.entity, itemConfig:config, menuConfig});
    } else return false;
    return true;
}

export function delegateHAAction(item, action)
{
    if (action.action === 'fire-dom-event') {
        if (action.honeycomb_menu)
            window.honeycomb_menu_in_context(owningContext(item), action.honeycomb_menu, item.config);
        else fireEvent(item, 'll-custom', action);
    } else {
        fireEvent(item, 'hass-action', {action:'tap', config:{entity:item.config.entity, tap_action:action}});
    }
}
