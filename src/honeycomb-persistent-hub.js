import HoneycombPersistentControl from "./honeycomb-persistent-control.js";

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');

class HoneycombPersistentHub extends HoneycombPersistentControl
{
    static get is()
    {
        return 'honeycomb-persistent-hub';
    }

    constructor()
    {
        super();
        this._hubMenu = null;
        this._hubOpenScheduled = false;
    }

    firstUpdated()
    {
        this._scheduleHubOpen();
    }

    updated()
    {
        this._scheduleHubOpen();
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
        this._hubOpenScheduled = false;
        this._hubMenu = null;
    }

    _scheduleHubOpen()
    {
        if(
            this._hubOpenScheduled ||
            this._hubMenu ||
            ! this.isConnected ||
            ! this.config ||
            ! this.hass
        ) return;

        this._hubOpenScheduled = true;

        requestAnimationFrame(() => {
            this._hubOpenScheduled = false;

            if( ! this.isConnected || this._hubMenu )
                return;

            const opened = super._openMenu();

            if( opened )
            {
                this._hubMenu = opened;

                opened.addEventListener('closed', () => {
                    this._hubMenu = null;

                    if( this.isConnected && this.config && this.config.auto_open !== false )
                        setTimeout(() => this._scheduleHubOpen(), 0);
                }, { once: true });
            }
        });
    }

    _balancedSlots(count)
    {
        const layouts = {
            1: [2],
            2: [1, 4],
            3: [2, 4, 6],
            4: [1, 2, 4, 5],
            5: [1, 2, 3, 4, 5],
            6: [1, 2, 3, 4, 5, 6]
        };

        return layouts[Math.max(1, Math.min(6, count))] || layouts[6];
    }

    _shouldShowLogo()
    {
        const logo = this.config ? this.config.logo : 'auto';

        if( logo === false || logo === 'hide' || logo === 'hidden' )
            return false;

        if( logo === true || logo === 'show' || logo === 'visible' )
            return true;

        const count = this.config && Array.isArray(this.config.items)
            ? this.config.items.filter(Boolean).length
            : 0;

        return count >= 2;
    }

    _persistentMenuConfig()
    {
        const menu = super._persistentMenuConfig();

        if( ! menu )
            return menu;

        menu.idle_timeout = 0;

        if( this._shouldShowLogo() )
        {
            menu.persistent_center = merge(
                {},
                menu.persistent_center || {},
                {
                    icon: 'honeycomb:bee',
                    interactive: true,
                    tap_action: { action: 'honeycomb-bee-flap' },
                    show_brightness: 'never',
                    mode: 'hub'
                }
            );
            menu.center_button = null;
        }
        else
        {
            menu.persistent_center = null;
            menu.center_button = false;
        }

        return menu;
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

    _actionForScript(script, fallbackService)
    {
        if( script )
        {
            return {
                action: 'perform-action',
                perform_action: script
            };
        }

        return {
            action: 'perform-action',
            perform_action: fallbackService
        };
    }

    _sonosJoinMenu(item)
    {
        const members = Array.isArray(item.members) ? item.members : [];

        if( members.length === 0 || ! item.toggle_member_script )
            return null;

        return {
            entity: item.entity,
            nested_expand: true,
            inherit_inner: true,
            empty_slots: 'hidden',
            idle_timeout: 0,
            buttons: members.slice(0, 12).map((member, index) => ({
                slot: index + 7,
                slot_mode: 'hard',
                entity: member.entity,
                icon: member.icon || (member.entity && member.entity.includes('tv') ? 'mdi:television-speaker' : 'mdi:speaker'),
                name: member.name || '',
                show_name: true,
                autoclose: false,
                styles: {
                    card: [
                        {
                            background: `[[[
                                const members = states['${item.entity}']?.attributes?.group_members || [];
                                return members.includes('${member.entity}')
                                    ? 'rgba(45, 105, 116, 0.96)'
                                    : 'rgba(52, 66, 78, 0.92)';
                            ]]]`
                        },
                        { border: '1px solid rgba(75, 180, 200, 0.20)' }
                    ],
                    icon: [
                        { width: '18px' },
                        { 'align-self': 'end' }
                    ],
                    name: [
                        { 'align-self': 'start' },
                        { 'font-size': '9px' },
                        { 'font-weight': '700' }
                    ]
                },
                tap_action: {
                    action: 'perform-action',
                    perform_action: item.toggle_member_script,
                    data: {
                        member: member.entity
                    }
                }
            }))
        };
    }

    _sonosRadioMenu(item)
    {
        const favorites = item.favorites_sensor || 'sensor.sonos_favorites';
        const cache = item.favorites_cache_sensor || 'sensor.sonos_favorites_cache';

        return {
            entity: item.entity,
            nested_expand: true,
            inherit_inner: true,
            empty_slots: 'hidden',
            idle_timeout: 0,
            buttons: Array.from({ length: 12 }, (_, index) => ({
                slot: index + 7,
                slot_mode: 'hard',
                entity: favorites,
                show: `[[[
                    const items = states['${favorites}']?.attributes?.items || {};
                    return Object.keys(items).length > ${index};
                ]]]`,
                icon: 'mdi:radio',
                show_icon: `[[[
                    const base = states['${favorites}']?.attributes?.items || {};
                    const id = Object.keys(base)[${index}];
                    const cached = states['${cache}']?.attributes?.items || [];
                    const match = cached.find(x => x?.media_content_id === id);
                    return !Boolean(match?.thumbnail);
                ]]]`,
                show_name: `[[[
                    const base = states['${favorites}']?.attributes?.items || {};
                    const id = Object.keys(base)[${index}];
                    const cached = states['${cache}']?.attributes?.items || [];
                    const match = cached.find(x => x?.media_content_id === id);
                    return !Boolean(match?.thumbnail);
                ]]]`,
                name: `[[[
                    const items = states['${favorites}']?.attributes?.items || {};
                    return Object.values(items)[${index}] || '';
                ]]]`,
                autoclose: true,
                styles: {
                    card: [
                        { background: 'rgba(52, 66, 78, 0.92)' },
                        {
                            'background-image': `[[[
                                const base = states['${favorites}']?.attributes?.items || {};
                                const id = Object.keys(base)[${index}];
                                const cached = states['${cache}']?.attributes?.items || [];
                                const match = cached.find(x => x?.media_content_id === id);
                                const thumb = match?.thumbnail || '';
                                return thumb ? 'url("' + thumb + '")' : 'none';
                            ]]]`
                        },
                        { 'background-position': 'center' },
                        { 'background-repeat': 'no-repeat' },
                        { 'background-size': '56% auto' },
                        { border: '1px solid rgba(75, 180, 200, 0.22)' }
                    ],
                    icon: [
                        { width: '17px' },
                        { 'align-self': 'end' }
                    ],
                    name: [
                        { 'align-self': 'start' },
                        { 'font-size': '9px' },
                        { 'font-weight': '600' },
                        { 'white-space': 'nowrap' },
                        { overflow: 'hidden' },
                        { 'text-overflow': 'ellipsis' }
                    ]
                },
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'media_player.play_media',
                    data: {
                        media_content_id: `[[[
                            const items = states['${favorites}']?.attributes?.items || {};
                            return Object.keys(items)[${index}] || '';
                        ]]]`,
                        media_content_type: 'favorite_item_id'
                    }
                }
            }))
        };
    }

    _mediaMenu(item)
    {
        const joinMenu = this._sonosJoinMenu(item);
        const radioMenu = this._sonosRadioMenu(item);

        const playPauseIcon = `[[[
            return entity?.state === 'playing' ? 'mdi:pause' : 'mdi:play';
        ]]]`;

        const playPauseName = `[[[
            return entity?.state === 'playing' ? 'Pause' : 'Play';
        ]]]`;

        const playPauseLabel = `[[[
            const channel = entity?.attributes?.media_channel;
            const title = entity?.attributes?.media_title;
            if( channel && title ) return channel + ' · ' + title;
            return title || channel || '';
        ]]]`;

        const joinedLabel = `[[[
            const members = states['${item.entity}']?.attributes?.group_members || [];
            const joined = members.filter(x => x !== '${item.entity}');
            return joined.length ? joined.length + ' joined' : 'Solo';
        ]]]`;

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
                    icon: 'mdi:volume-minus',
                    name: 'Vol',
                    show_name: true,
                    autoclose: false,
                    tap_action: this._actionForScript(
                        item.group_volume_down_script,
                        'media_player.volume_down'
                    )
                },
                {
                    slot: 2,
                    slot_mode: 'hard',
                    icon: playPauseIcon,
                    name: playPauseName,
                    label: playPauseLabel,
                    show_name: true,
                    show_label: true,
                    autoclose: false,
                    tap_action: {
                        action: 'perform-action',
                        perform_action: 'media_player.media_play_pause'
                    }
                },
                {
                    slot: 3,
                    slot_mode: 'hard',
                    icon: 'mdi:speaker-multiple',
                    name: 'Join',
                    label: joinedLabel,
                    show_name: true,
                    show_label: true,
                    autoclose: false,
                    styles: {
                        card: [
                            { background: 'rgba(126, 54, 96, 0.82)' }
                        ]
                    },
                    tap_action: joinMenu
                        ? {
                            action: 'fire-dom-event',
                            honeycomb_menu: joinMenu
                        }
                        : { action: 'more-info' }
                },
                {
                    slot: 4,
                    slot_mode: 'hard',
                    icon: 'mdi:volume-plus',
                    name: 'Vol',
                    show_name: true,
                    autoclose: false,
                    tap_action: this._actionForScript(
                        item.group_volume_up_script,
                        'media_player.volume_up'
                    )
                },
                {
                    slot: 5,
                    slot_mode: 'hard',
                    icon: 'mdi:star',
                    name: 'Radio',
                    show_name: true,
                    autoclose: false,
                    styles: {
                        card: [
                            { background: 'rgba(108, 62, 78, 0.82)' }
                        ]
                    },
                    tap_action: {
                        action: 'fire-dom-event',
                        honeycomb_menu: radioMenu
                    }
                },
                {
                    slot: 6,
                    slot_mode: 'hard',
                    icon: 'mdi:folder-music',
                    name: 'Browse',
                    show_name: true,
                    autoclose: true,
                    tap_action: { action: 'more-info' }
                }
            ]
        };
    }

    _itemIcon(item)
    {
        if( item.icon === false )
            return null;

        if( item.icon === undefined || item.icon === null || item.icon === '' || item.icon === 'bee' )
            return 'honeycomb:bee';

        return item.icon;
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
                return Math.round((Number(b) / 255) * 100) + '%';
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

    _launcherButton(item, index, slot)
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
            slot: item.slot || slot || (index + 1),
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

        if( icon === null )
            button.show_icon = false;

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
            icon: 'honeycomb:bee',
            name: 'Honeycomb',
            items: [],
            auto_open: true,
            logo: 'auto',
            tap_action: { action: 'honeycomb-bee-flap' },
            show_brightness: 'never',
            colors: {
                center: '#f2b705',
                inner_border: '#17191c',
                outer_border: '#34383d',
                unavailable: '#20262d'
            }
        });

        const items = (next.items || []).filter(Boolean).slice(0, 6);
        const slots = this._balancedSlots(items.length);

        next.menu = merge({}, next.menu || {}, {
            empty_slots: 'hidden',
            idle_timeout: 0,
            buttons: items.map((item, index) =>
                this._launcherButton(item, index, slots[index])
            )
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
        description: 'Direct persistent Honeycomb hub launcher for lights, media and future control types.'
    });
}

export default HoneycombPersistentHub;
