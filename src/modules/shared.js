const merge = require('lodash/merge');

function physicalSlot(item, index, slot)
{
    if( item && item.slot !== undefined )
        return item.slot;

    if( slot !== undefined )
        return slot;

    return index + 1;
}

function requestedIcon(item, fallback)
{
    if( item && item.icon === false )
        return null;

    if(
        ! item ||
        item.icon === undefined ||
        item.icon === null ||
        item.icon === '' ||
        item.icon === 'bee'
    )
        return fallback;

    return item.icon;
}

function persistentLauncher(options)
{
    const {
        item,
        index,
        slot,
        submenu,
        mode,
        fallbackIcon,
        tapAction,
        extra
    } = options;

    const icon = requestedIcon(item, fallbackIcon);

    return merge(
        {},
        {
            _persistent_launcher: true,
            _layered: !!(item.colors || item.border),
            slot: physicalSlot(item, index, slot),
            slot_mode: item.slot_mode || 'hard',
            visibility: item.visibility,
            show: item.show,
            entity: item.entity,
            icon,
            mode,
            interactive: true,
            tap_action: tapAction,
            menu: submenu
        },
        extra || {},
        Object.fromEntries(['colors', 'border', 'face_mode', 'variables', 'tap_action',
            'hold_action', 'double_tap_action', 'show_brightness', 'show_volume']
            .filter(key => item[key] !== undefined).map(key => [key, item[key]])),
        (item.colors || item.border || item.show_name) ? {name:item.name, label:item.label} : {},
        item.persistent || {}
    );
}

module.exports = {
    merge,
    physicalSlot,
    requestedIcon,
    persistentLauncher
};
