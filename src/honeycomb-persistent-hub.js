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
        this._anchorWatchRaf = null;
        this._lastAnchorX = null;
        this._lastAnchorY = null;
        this._menuContext = null;
    }

    _ensureMenuContext()
    {
        if( ! this._menuContext && typeof window.honeycomb_menu_create_context === 'function' )
            this._menuContext = window.honeycomb_menu_create_context();

        return this._menuContext;
    }

    _openHoneycombMenu(menu)
    {
        const context = this._ensureMenuContext();

        if( context && typeof window.honeycomb_menu_in_context === 'function' )
            return window.honeycomb_menu_in_context(context, menu);

        return super._openHoneycombMenu(menu);
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
        if( this._anchorWatchRaf )
        {
            cancelAnimationFrame(this._anchorWatchRaf);
            this._anchorWatchRaf = null;
        }

        if( this._hubMenu && this._hubMenu.isConnected )
            this._hubMenu.close();

        if( this._menuContext && typeof window.honeycomb_menu_context_close === 'function' )
            window.honeycomb_menu_context_close(this._menuContext);

        super.disconnectedCallback();
        this._hubOpenScheduled = false;
        this._hubMenu = null;
        this._lastAnchorX = null;
        this._lastAnchorY = null;
        this._menuContext = null;
    }

    _watchAnchor()
    {
        if( this._anchorWatchRaf )
            cancelAnimationFrame(this._anchorWatchRaf);

        const tick = () => {
            this._anchorWatchRaf = null;

            if( ! this.isConnected || ! this._hubMenu )
                return;

            const rect = this.getBoundingClientRect();

            if( rect.width > 0 && rect.height > 0 )
            {
                const x = rect.left + (rect.width / 2);
                const y = rect.top + (rect.height / 2);

                if(
                    this._lastAnchorX === null ||
                    this._lastAnchorY === null ||
                    Math.abs(x - this._lastAnchorX) > 0.5 ||
                    Math.abs(y - this._lastAnchorY) > 0.5
                )
                {
                    this._lastAnchorX = x;
                    this._lastAnchorY = y;

                    if( typeof this._hubMenu.reanchor === 'function' )
                        this._hubMenu.reanchor(x, y);
                }
            }

            this._anchorWatchRaf = requestAnimationFrame(tick);
        };

        this._anchorWatchRaf = requestAnimationFrame(tick);
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
                this._lastAnchorX = null;
                this._lastAnchorY = null;
                this._watchAnchor();

                opened.addEventListener('closed', () => {
                    if( this._anchorWatchRaf )
                    {
                        cancelAnimationFrame(this._anchorWatchRaf);
                        this._anchorWatchRaf = null;
                    }

                    this._hubMenu = null;
                    this._lastAnchorX = null;
                    this._lastAnchorY = null;

                    if( this.isConnected && this.config && this.config.auto_open !== false )
                        setTimeout(() => this._scheduleHubOpen(), 0);
                }, { once: true });
            }
        });
    }

    _hubSlots(count, showLogo)
    {
        const noLogoLayouts = {
            1: [0],
            2: [2, 3],
            3: [2, 3, 0],
            4: [1, 2, 0, 3],
            5: [1, 2, 0, 3, 4],
            6: [1, 2, 3, 4, 5, 6],
            7: [0, 1, 2, 3, 4, 5, 6]
        };

        const logoLayouts = {
            1: [2],
            2: [2, 3],
            3: [2, 4, 6],
            4: [2, 3, 1, 4],
            5: [1, 2, 3, 4, 5],
            6: [1, 2, 3, 4, 5, 6]
        };

        const safeCount = Math.max(1, Math.min(7, count));

        if( showLogo && safeCount <= 6 )
            return logoLayouts[safeCount] || [];

        return noLogoLayouts[safeCount] || [];
    }

    _shouldShowLogo()
    {
        const logo = this.config ? this.config.logo : 'auto';
        const count = this.config && Array.isArray(this.config.items)
            ? this.config.items.filter(Boolean).length
            : 0;

        // Seven real items always consume center slot 0 + ring slots 1-6.
        if( count >= 7 )
            return false;

        if( logo === false || logo === 'hide' || logo === 'hidden' )
            return false;

        if( logo === true || logo === 'show' || logo === 'visible' )
            return count >= 1;

        // Auto branding is useful when the center would otherwise be empty.
        return count >= 2 && count <= 6;
    }

    _persistentMenuConfig()
    {
        const menu = super._persistentMenuConfig();

        if( ! menu )
            return menu;

        menu.idle_timeout = 0;

        const showLogo = this._shouldShowLogo();

        if( showLogo )
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

            if( this._hubCenterButton )
            {
                menu.center_button = merge({}, this._hubCenterButton);
                delete menu.center_button.slot;
                delete menu.center_button.slot_mode;
            }
            else
            {
                menu.center_button = false;
            }
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

    _itemCardBackground(item)
    {
        if( item.type === 'light' )
        {
            return `[[[
                if( ! entity || entity.state !== 'on' )
                    return 'rgba(52, 66, 78, 0.92)';

                const a = entity.attributes || {};
                const rgb = a.rgb_color;

                if( Array.isArray(rgb) && rgb.length >= 3 )
                    return 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';

                const kelvin = Number(a.color_temp_kelvin);
                if( Number.isFinite(kelvin) && kelvin > 0 )
                {
                    let temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
                    let r, g, b;

                    if( temp <= 66 )
                    {
                        r = 255;
                        g = 99.4708025861 * Math.log(temp) - 161.1195681661;
                        b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
                    }
                    else
                    {
                        r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
                        g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
                        b = 255;
                    }

                    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
                    return 'rgb(' + clamp(r) + ', ' + clamp(g) + ', ' + clamp(b) + ')';
                }

                return 'rgba(65, 145, 160, 0.96)';
            ]]]`;
        }

        if( item.type === 'media' )
        {
            return `[[[
                if( ! entity )
                    return 'rgba(52, 66, 78, 0.92)';

                if( entity.state === 'playing' )
                    return 'rgba(45, 105, 116, 0.96)';

                if( entity.state === 'paused' )
                    return 'rgba(62, 75, 88, 0.96)';

                return 'rgba(52, 66, 78, 0.92)';
            ]]]`;
        }

        return 'rgba(52, 66, 78, 0.92)';
    }

    _itemForeground(item)
    {
        if( item.type !== 'light' )
            return '#f6f7f9';

        return `[[[
            if( ! entity || entity.state !== 'on' )
                return '#f6f7f9';

            const a = entity.attributes || {};
            let rgb = Array.isArray(a.rgb_color) && a.rgb_color.length >= 3
                ? a.rgb_color.slice(0, 3).map(Number)
                : null;

            if( ! rgb )
            {
                const kelvin = Number(a.color_temp_kelvin);

                if( Number.isFinite(kelvin) && kelvin > 0 )
                {
                    let temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
                    let r, g, b;

                    if( temp <= 66 )
                    {
                        r = 255;
                        g = 99.4708025861 * Math.log(temp) - 161.1195681661;
                        b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
                    }
                    else
                    {
                        r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
                        g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
                        b = 255;
                    }

                    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
                    rgb = [clamp(r), clamp(g), clamp(b)];
                }
            }

            if( ! rgb )
                return '#f6f7f9';

            const luminance = (0.299 * rgb[0]) + (0.587 * rgb[1]) + (0.114 * rgb[2]);
            return luminance > 165 ? '#17212b' : '#f6f7f9';
        ]]]`;
    }

    _persistentLightLauncher(item, index, slot, submenu)
    {
        const requestedIcon = this._itemIcon(item);
        const icon = requestedIcon && requestedIcon !== 'honeycomb:bee'
            ? requestedIcon
            : 'mdi:lightbulb';

        return merge(
            {},
            {
                _persistent_launcher: true,
                slot: item.slot !== undefined ? item.slot : (slot !== undefined ? slot : (index + 1)),
                slot_mode: 'hard',
                entity: item.entity,
                icon,
                mode: 'persistent',
                interactive: true,
                show_brightness: 'when_on',
                tap_action: { action: 'toggle' },
                menu: submenu,
                presets: merge({}, item.presets || {})
            },
            item.persistent || {}
        );
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

        if( item.type === 'light' )
            return this._persistentLightLauncher(item, index, slot, submenu);

        const button = {
            slot: item.slot !== undefined ? item.slot : (slot !== undefined ? slot : (index + 1)),
            slot_mode: 'hard',
            entity: item.entity,
            icon,
            name: item.name || '',
            show_name: true,
            show_label: true,
            label: this._itemLabel(item),
            autoclose: false,
            styles: {
                card: [
                    { background: this._itemCardBackground(item) },
                    { border: '1px solid rgba(75, 180, 200, 0.22)' }
                ],
                grid: [
                    { 'grid-template-areas': '"i" "n" "l"' },
                    { 'grid-template-columns': '1fr' },
                    { 'grid-template-rows': '46% 28% 26%' },
                    { height: '100%' }
                ],
                icon: [
                    { width: '24px' },
                    { color: this._itemForeground(item) }
                ],
                name: [
                    { 'font-size': '10px' },
                    { 'font-weight': '650' },
                    { color: this._itemForeground(item) }
                ],
                label: [
                    { 'font-size': '8px' },
                    { color: this._itemForeground(item) }
                ]
            }
        };

        if( icon === null )
            button.show_icon = false;

        if( submenu )
        {
            button.tap_action = {
                action: 'toggle'
            };

            button.hold_action = {
                action: 'fire-dom-event',
                honeycomb_menu: submenu
            };
        }
        else
        {
            button.tap_action = { action: 'toggle' };
            button.hold_action = { action: 'more-info' };
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

        const items = (next.items || []).filter(Boolean).slice(0, 7);
        const showLogo = this._shouldShowLogo.call({ config: next });
        const slots = this._hubSlots(items.length, showLogo);

        const resolved = items.map((item, index) => {
            const targetSlot = item.slot !== undefined ? Number(item.slot) : slots[index];
            return {
                item,
                index,
                slot: Number.isInteger(targetSlot) ? targetSlot : slots[index]
            };
        });

        const centerEntry = ! showLogo
            ? resolved.find(entry => entry.slot === 0)
            : null;

        this._hubCenterButton = centerEntry
            ? this._launcherButton(centerEntry.item, centerEntry.index, 0)
            : null;

        const ringButtons = resolved
            .filter(entry => entry.slot !== 0)
            .map(entry => this._launcherButton(entry.item, entry.index, entry.slot));

        next.menu = merge({}, next.menu || {}, {
            empty_slots: 'hidden',
            idle_timeout: 0,
            buttons: ringButtons
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
