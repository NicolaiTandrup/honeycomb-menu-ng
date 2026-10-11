const { merge, persistentLauncher } = require('../shared.js');
const presentation = require('./presentation.js');

function buildMenu({ item })
{
    return {
        entity: item.entity,
        presets: merge({}, item.presets || {}),
        nested_expand: true,
        promote_to_center: true,
        promoted_center: {
            entity: item.entity,
            icon: item.icon || 'mdi:lightbulb',
            mode: 'persistent',
            show_brightness: 'when_on'
        },
        empty_slots: 'hidden',
        idle_timeout: 8000,
        buttons: [
            {
                slot: 1,
                slot_mode: 'hard',
                icon: 'mdi:brightness-7',
                name: '100%',
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    data: { brightness_pct: 100 }
                }
            },
            {
                slot: 2,
                slot_mode: 'hard',
                control: 'preset-brightness'
            },
            {
                slot: 3,
                slot_mode: 'hard',
                control: 'light-palette'
            },
            {
                slot: 4,
                slot_mode: 'hard',
                control: 'preset-standard'
            },
            {
                slot: 5,
                slot_mode: 'hard',
                icon: 'mdi:minus',
                name: '5%',
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    data: { brightness_step_pct: -5 }
                }
            },
            {
                slot: 6,
                slot_mode: 'hard',
                icon: 'mdi:plus',
                name: '5%',
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    data: { brightness_step_pct: 5 }
                }
            }
        ]
    };
}

function buildLauncher({ item, index, slot, submenu })
{
    return persistentLauncher({
        item,
        index,
        slot,
        submenu,
        mode: 'persistent',
        fallbackIcon: 'mdi:lightbulb',
        tapAction: { action: 'toggle' },
        extra: {
            show_brightness: 'when_on',
            presets: merge({}, item.presets || {})
        }
    });
}

module.exports = {
    id: 'light',
    aliases: ['hue'],
    priority: 500,
    persistentModes: ['persistent', 'light'],
    presentation,

    matches(item)
    {
        return item.type === 'light' || item.type === 'hue';
    },

    buildMenu,
    buildLauncher
};
