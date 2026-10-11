import HoneycombPersistentControl from "./honeycomb-persistent-control.js";

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');

class HoneycombPersistentHub extends HoneycombPersistentControl
{
    static get is()
    {
        return 'honeycomb-persistent-hub';
    }

    _lightMenu(item)
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

    _mediaMenu(item)
    {
        return {
            entity: item.entity,
            nested_expand: true,
            promote_to_center: true,
            promoted_center: {
                entity: item.entity,
                icon: item.icon || 'mdi:speaker',
                mode: 'persistent',
                show_brightness: 'never',
                colors: {
                    center: '#20262d',
                    inner_border: '#4fb3d8',
                    outer_border: '#34383d'
                }
            },
            empty_slots: 'hidden',
            idle_timeout: 8000,
            buttons: [
                {
                    slot: 1,
                    slot_mode: 'hard',
                    icon: 'mdi:play-pause',
                    name: 'Play',
                    show_name: true,
                    autoclose: false,
                    tap_action: {
                        action: 'perform-action',
                        perform_action: 'media_player.media_play_pause'
                    }
                },
                {
                    slot: 2,
                    slot_mode: 'hard',
                    icon: 'mdi:volume-minus',
                    name: 'Vol',
                    show_name: true,
                    autoclose: false,
                    tap_action: {
                        action: 'perform-action',
                        perform_action: 'media_player.volume_down'
                    }
                },
                {
                    slot: 3,
                    slot_mode: 'hard',
                    icon: 'mdi:volume-plus',
                    name: 'Vol',
                    show_name: true,
                    autoclose: false,
                    tap_action: {
                        action: 'perform-action',
                        perform_action: 'media_player.volume_up'
                    }
                },
                {
                    slot: 4,
                    slot_mode: 'hard',
                    icon: 'mdi:information-outline',
                    name: 'Info',
                    show_name: true,
                    autoclose: false,
                    tap_action: { action: 'more-info' }
                }
            ]
        };
    }

    _itemIcon(item)
    {
        if( item.icon !== undefined )
            return item.icon;

        switch(item.type)
        {
            case 'light': return 'mdi:lightbulb';
            case 'media': return 'mdi:speaker';
            case 'climate': return 'mdi:thermostat';
            case 'vehicle': return 'mdi:car-electric';
            default: return 'mdi:hexagon';
        }
    }

    _itemLabel(item)
    {
        if( item.type === 'light' )
        {
            return `[[[
                if( ! entity ) return '—';
                if( entity.state !== 'on' ) return 'Off';
                const b = entity.attributes ? entity.attributes.brightness : null;
                if( b === null || b === undefined ) return 'On';
                return \`\${Math.round((Number(b) / 255) * 100)}%\`;
            ]]]`;
        }

        if( item.type === 'media' )
        {
            return `[[[
                if( ! entity ) return '—';
                const a = entity.attributes || {};
                return a.media_title || a.source || entity.state || '—';
            ]]]`;
        }

        return null;
    }

    _launcherButton(item, index)
    {
        const icon = this._itemIcon(item);
        let submenu = item.menu ? merge({}, item.menu) : null;

        if( ! submenu )
        {
            if( item.type === 'light' )
                submenu = this._lightMenu(item);
            else if( item.type === 'media' )
                submenu = this._mediaMenu(item);
        }

        const button = {
            slot: item.slot || (index + 1),
            slot_mode: 'hard',
            entity: item.entity,
            icon,
            name: item.name || '',
            show_name: true,
            show_label: true,
            label: this._itemLabel(item),
            autoclose: false,
            styles: {
                grid: [
                    { 'grid-template-areas': '"i" "n" "l"' },
                    { 'grid-template-columns': '1fr' },
                    { 'grid-template-rows': '46% 28% 26%' },
                    { height: '100%' }
                ],
                icon: [
                    { width: '24px' },
                    { color: '#f6f7f9' }
                ],
                name: [
                    { 'font-size': '10px' },
                    { 'font-weight': '650' },
                    { color: '#f6f7f9' }
                ],
                label: [
                    { 'font-size': '8px' },
                    { color: 'rgba(246,247,249,0.78)' }
                ]
            }
        };

        if( submenu )
        {
            button.tap_action = {
                action: 'fire-dom-event',
                honeycomb_menu: submenu
            };
        }
        else
        {
            button.tap_action = { action: 'more-info' };
        }

        return button;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Hub requires a configuration.');

        const next = merge({}, config);

        _defaults(next, {
            mode: 'hub',
            size: 82,
            icon: '',
            name: 'Honeycomb',
            items: [],
            tap_action: { action: 'honeycomb-open-menu' },
            show_brightness: 'never',
            colors: {
                center: '#20262d',
                inner_border: '#f2b705',
                outer_border: '#34383d',
                unavailable: '#20262d'
            }
        });

        next.menu = merge({}, next.menu || {}, {
            empty_slots: 'hidden',
            idle_timeout: (next.menu && next.menu.idle_timeout) || 8000,
            buttons: (next.items || []).slice(0, 6).map((item, index) => this._launcherButton(item, index))
        });

        super.setConfig(next);
    }
}

if( ! customElements.get(HoneycombPersistentHub.is) )
    customElements.define(HoneycombPersistentHub.is, HoneycombPersistentHub);

window.customCards = window.customCards || [];

if( ! window.customCards.some(card => card.type === HoneycombPersistentHub.is) )
{
    window.customCards.push({
        type: HoneycombPersistentHub.is,
        name: 'Honeycomb Persistent Hub',
        description: 'Persistent Honeycomb hub launcher for lights, media and future control types.'
    });
}

export default HoneycombPersistentHub;
