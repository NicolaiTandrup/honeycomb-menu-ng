const merge = require('lodash/merge');
const omit = require('lodash/omit');
const { physicalSlot, requestedIcon } = require('../shared.js');

module.exports = {
    id: 'generic',
    priority: -10000,

    matches()
    {
        return true;
    },

    buildMenu()
    {
        return null;
    },

    buildLauncher({ item, index, slot, submenu })
    {
        const icon = requestedIcon(item, 'honeycomb:bee');
        const button = {
            slot: physicalSlot(item, index, slot),
            slot_mode: item.slot_mode || 'hard',
            visibility: item.visibility,
            show: item.show,
            entity: item.entity,
            icon,
            name: item.name || '',
            show_name: true,
            show_label: !!item.label,
            label: item.label || '',
            variables: item.variables,
            colors: item.colors,
            border: item.border,
            face_mode: item.face_mode,
            autoclose: false,
            styles: {
                card: [
                    { background: item.background || 'rgba(52, 66, 78, 0.92)' },
                    { border: '1px solid rgba(75, 180, 200, 0.22)' }
                ],
                grid: [
                    { 'grid-template-areas': item.label ? '"i" "n" "l"' : '"i" "n"' },
                    { 'grid-template-columns': '1fr' },
                    { 'grid-template-rows': item.label ? '46% 28% 26%' : '58% 42%' },
                    { height: '100%' }
                ],
                icon: [
                    { width: '24px' },
                    { color: item.foreground || '#f6f7f9' }
                ],
                name: [
                    { 'font-size': '10px' },
                    { 'font-weight': '650' },
                    { color: item.foreground || '#f6f7f9' }
                ],
                label: [
                    { 'font-size': '8px' },
                    { color: item.foreground || '#f6f7f9' }
                ]
            }
        };

        if( icon === null )
            button.show_icon = false;

        if( submenu )
        {
            button.tap_action = item.tap_action || { action: 'toggle' };
            button.hold_action = item.hold_action || {
                action: 'honeycomb-open-nested',
                honeycomb_nested_menu: submenu
            };
        }
        else
        {
            button.tap_action = item.tap_action || { action: 'toggle' };
            button.hold_action = item.hold_action || { action: 'more-info' };
        }

        // Pass generic action/card fields through without requiring a module
        // rewrite. Module/type metadata must not become a Lovelace card type.
        if (item.colors || item.border) button.styles = {};
        return merge({}, button, omit(item, ['type','module','profile','menu','slot','slot_mode','persistent']),
            { slot:button.slot, slot_mode:button.slot_mode });
    }
};
