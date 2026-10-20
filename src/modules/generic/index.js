const { physicalSlot, requestedIcon } = require('../shared.js');

module.exports = {
    id: 'generic',
    priority: -10000,
    matches() { return true; },
    buildMenu() { return null; },
    buildLauncher({item, index, slot, submenu}) {
        return {
            slot: physicalSlot(item, index, slot), slot_mode: item.slot_mode || 'hard',
            entity: item.entity, mode: 'generic', icon: requestedIcon(item, 'honeycomb:bee'),
            name: item.name || '', label: item.label || '', show_name: true,
            show_label: !!item.label, autoclose: false,
            background: item.background || 'rgba(52, 66, 78, 0.92)',
            foreground: item.foreground,
            tap_action: item.tap_action || {action:'toggle'},
            ...(submenu ? {menu:submenu} : {hold_action:item.hold_action || {action:'more-info'}})
        };
    }
};
