import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');

class HoneycombPersistentHub extends LitElement
{
    static get is()
    {
        return 'honeycomb-persistent-hub';
    }

    static get properties()
    {
        return {
            hass: { type: Object },
            config: { type: Object }
        };
    }

    constructor()
    {
        super();
        this.config = {};
        this._view = 'hub';
        this._selectedItem = null;
        this._nestedView = null;
        this._size = 82;
    }

    static get styles()
    {
        return css`
            :host {
                display: block;
                position: relative;
                width: var(--honeycomb-hub-size, 82px);
                height: calc(var(--honeycomb-hub-size, 82px) * 1.1547);
                overflow: visible;
                pointer-events: none;
            }

            .stage {
                position: absolute;
                inset: 0;
                overflow: visible;
                pointer-events: none;
            }

            .tile {
                position: absolute;
                left: 50%;
                top: 50%;
                width: var(--honeycomb-hub-size, 82px);
                height: calc(var(--honeycomb-hub-size, 82px) * 1.1547);
                transform: translate(-50%, -50%) translate(var(--x, 0px), var(--y, 0px));
                pointer-events: auto;
                transition:
                    transform 160ms ease,
                    opacity 120ms ease;
                will-change: transform;
            }

            honeycomb-menu-item {
                display: block;
                width: 100%;
                height: 100%;
                --honeycomb-menu-item-shell-background: transparent;
            }
        `;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Hub requires a configuration.');

        const next = merge({}, config);

        _defaults(next, {
            size: 82,
            logo: 'auto',
            items: []
        });

        this.config = next;
        this._size = Number(next.size) || 82;
        this.style.setProperty('--honeycomb-hub-size', `${this._size}px`);

        // Editing/reconfiguring the picture element should always return this
        // local component to its Hub view. No global overlay survives.
        this._view = 'hub';
        this._selectedItem = null;
        this._nestedView = null;
        this.requestUpdate();
    }

    getCardSize()
    {
        return 1;
    }

    _items()
    {
        return Array.isArray(this.config.items)
            ? this.config.items.filter(Boolean).slice(0, 7)
            : [];
    }

    _shouldShowLogo()
    {
        const count = this._items().length;
        const logo = this.config.logo;

        if( count >= 7 )
            return false;

        if( logo === false || logo === 'hide' || logo === 'hidden' )
            return false;

        if( logo === true || logo === 'show' || logo === 'visible' )
            return count >= 1;

        return count >= 2 && count <= 6;
    }

    _hubSlots(count, showLogo)
    {
        const noLogo = {
            1: [0],
            2: [2, 3],
            3: [2, 3, 0],
            4: [1, 2, 0, 3],
            5: [1, 2, 0, 3, 4],
            6: [1, 2, 3, 4, 5, 6],
            7: [0, 1, 2, 3, 4, 5, 6]
        };

        const withLogo = {
            1: [2],
            2: [2, 3],
            3: [2, 4, 6],
            4: [2, 3, 1, 4],
            5: [1, 2, 3, 4, 5],
            6: [1, 2, 3, 4, 5, 6]
        };

        const safe = Math.max(1, Math.min(7, count));

        if( showLogo && safe <= 6 )
            return withLogo[safe] || [];

        return noLogo[safe] || [];
    }

    _innerOffset(slot)
    {
        const w = this._size;

        // These are the exact relative positions used by the proven popup
        // Honeycomb geometry. Keeping both renderers on the same coordinate
        // model prevents the inline Hub hexagons from overlapping.
        const offsets = {
            0: [0, 0],
            1: [-1.0 * w, 0],
            2: [-0.5 * w, -0.865 * w],
            3: [0.5 * w, -0.865 * w],
            4: [1.0 * w, 0],
            5: [0.5 * w, 0.86 * w],
            6: [-0.5 * w, 0.86 * w]
        };

        return offsets[Number(slot)] || [0, 0];
    }

    _outerOffset(slot)
    {
        const w = this._size;
        const offsets = {
            7:  [-2.0 * w, 0],
            8:  [-1.5 * w, -0.865 * w],
            9:  [-1.0 * w, -1.73 * w],
            10: [0.0 * w, -1.73 * w],
            11: [1.0 * w, -1.73 * w],
            12: [1.5 * w, -0.865 * w],
            13: [2.0 * w, 0],
            14: [1.5 * w, 0.86 * w],
            15: [1.0 * w, 1.725 * w],
            16: [0.0 * w, 1.725 * w],
            17: [-1.0 * w, 1.725 * w],
            18: [-1.5 * w, 0.86 * w]
        };

        return offsets[Number(slot)] || [0, 0];
    }

    _offsetForSlot(slot)
    {
        const n = Number(slot);
        return n >= 7 ? this._outerOffset(n) : this._innerOffset(n);
    }

    _capabilities(entityId)
    {
        const state = this.hass && entityId ? this.hass.states[entityId] : null;
        const attrs = state && state.attributes ? state.attributes : {};
        const modes = Array.isArray(attrs.supported_color_modes)
            ? attrs.supported_color_modes
            : [];

        const colorModes = ['xy', 'hs', 'rgb', 'rgbw', 'rgbww'];

        return {
            color: modes.some(mode => colorModes.includes(mode)),
            colorTemp: modes.includes('color_temp'),
            minKelvin: Number(attrs.min_color_temp_kelvin) || 2200,
            maxKelvin: Number(attrs.max_color_temp_kelvin) || 6500
        };
    }

    _kelvinToRgb(kelvin)
    {
        let temp = Math.max(1000, Math.min(40000, Number(kelvin) || 2700)) / 100;
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
        return [clamp(r), clamp(g), clamp(b)];
    }

    _contrast(rgb)
    {
        if( ! Array.isArray(rgb) || rgb.length < 3 )
            return '#f6f7f9';

        const luminance = (0.299 * Number(rgb[0])) +
            (0.587 * Number(rgb[1])) +
            (0.114 * Number(rgb[2]));

        return luminance > 165 ? '#17212b' : '#f6f7f9';
    }

    _lightVisual(entityId)
    {
        const state = this.hass && entityId ? this.hass.states[entityId] : null;

        if( ! state || state.state !== 'on' )
        {
            return {
                background: 'rgba(52, 66, 78, 0.94)',
                foreground: '#f6f7f9',
                label: state ? 'Off' : '—'
            };
        }

        const attrs = state.attributes || {};
        let rgb = Array.isArray(attrs.rgb_color) ? attrs.rgb_color.slice(0,3) : null;

        if( ! rgb && Number(attrs.color_temp_kelvin) > 0 )
            rgb = this._kelvinToRgb(Number(attrs.color_temp_kelvin));

        if( ! rgb )
            rgb = [65,145,160];

        const brightness = attrs.brightness === null || attrs.brightness === undefined
            ? 'On'
            : `${Math.round((Number(attrs.brightness) / 255) * 100)}%`;

        return {
            background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
            foreground: this._contrast(rgb),
            label: brightness
        };
    }

    _mediaVisual(entityId)
    {
        const state = this.hass && entityId ? this.hass.states[entityId] : null;
        const attrs = state && state.attributes ? state.attributes : {};

        return {
            background: state && state.state === 'playing'
                ? 'rgba(45, 105, 116, 0.96)'
                : 'rgba(52, 66, 78, 0.94)',
            foreground: '#f6f7f9',
            label: attrs.media_title || attrs.source || (state ? state.state : '—')
        };
    }

    _rootItemConfig(item)
    {
        const type = item.type || 'entity';
        const visual = type === 'light'
            ? this._lightVisual(item.entity)
            : type === 'media'
                ? this._mediaVisual(item.entity)
                : {
                    background: 'rgba(52, 66, 78, 0.94)',
                    foreground: '#f6f7f9',
                    label: ''
                };

        let icon = item.icon;
        if( icon === undefined || icon === null || icon === '' )
            icon = 'honeycomb:bee';

        return {
            _inline_hub: true,
            entity: item.entity,
            icon,
            name: item.name || '',
            label: visual.label,
            show_name: true,
            show_label: true,
            autoclose: false,
            tap_action: { action: 'toggle' },
            hold_action: { action: 'none' },
            styles: {
                card: [
                    { background: visual.background },
                    { border: '1px solid rgba(75,180,200,0.22)' }
                ],
                grid: [
                    { 'grid-template-areas': '"i" "n" "l"' },
                    { 'grid-template-columns': '1fr' },
                    { 'grid-template-rows': '46% 28% 26%' },
                    { height: '100%' }
                ],
                icon: [
                    { width: '24px' },
                    { color: visual.foreground }
                ],
                name: [
                    { 'font-size': '10px' },
                    { 'font-weight': '650' },
                    { color: visual.foreground }
                ],
                label: [
                    { 'font-size': '8px' },
                    { color: visual.foreground }
                ]
            }
        };
    }

    _logoConfig()
    {
        return {
            _inline_hub: true,
            icon: 'honeycomb:bee',
            show_name: false,
            show_label: false,
            autoclose: false,
            tap_action: { action: 'none' },
            hold_action: { action: 'none' },
            styles: {
                card: [
                    { background: '#f2b705' },
                    { border: '2px solid #17191c' }
                ]
            }
        };
    }

    _centerItemConfig(item)
    {
        const config = this._rootItemConfig(item);
        config.tap_action = { action: 'none' };
        config.hold_action = { action: 'none' };
        return config;
    }

    _helperValue(entityId, fallback)
    {
        const state = this.hass && entityId ? this.hass.states[entityId] : null;
        const value = state ? Number(state.state) : NaN;
        return Number.isFinite(value) ? value : fallback;
    }

    _lightControlButtons(item)
    {
        const presets = item.presets || {};
        const brightnessHelper = presets.brightness && presets.brightness.entity;
        const kelvinHelper = presets.kelvin && presets.kelvin.entity;
        const hueHelper = presets.color && presets.color.hue_entity;
        const saturationHelper = presets.color && presets.color.saturation_entity;
        const capabilities = this._capabilities(item.entity);

        const brightnessPreset = Math.round(this._helperValue(brightnessHelper, 60));
        const kelvinPreset = Math.round(this._helperValue(kelvinHelper, 2700));
        const huePreset = Math.round(this._helperValue(hueHelper, 0));
        const satPreset = Math.round(this._helperValue(saturationHelper, 0));

        const state = this.hass && item.entity ? this.hass.states[item.entity] : null;
        const attrs = state && state.attributes ? state.attributes : {};
        const nowBrightness = attrs.brightness === null || attrs.brightness === undefined
            ? 'Now —'
            : `Now ${Math.round((Number(attrs.brightness) / 255) * 100)}%`;
        const nowKelvin = Number(attrs.color_temp_kelvin) > 0
            ? `Now ${Math.round(Number(attrs.color_temp_kelvin))}K`
            : 'Now —';
        const nowHs = Array.isArray(attrs.hs_color)
            ? `Now ${Math.round(Number(attrs.hs_color[0]))}° · ${Math.round(Number(attrs.hs_color[1]))}%`
            : 'Now —';

        let standardName = `${kelvinPreset}K`;
        let standardLabel = nowKelvin;
        let standardIcon = 'mdi:temperature-kelvin';
        let standardMode = 'kelvin';

        if( capabilities.color && hueHelper && saturationHelper )
        {
            standardName = `${huePreset}° · ${satPreset}%`;
            standardLabel = nowHs;
            standardIcon = 'mdi:palette';
            standardMode = 'color';
        }

        const common = (slot, icon, name, label = '') => ({
            _inline_hub: true,
            slot,
            entity: item.entity,
            icon,
            name,
            label,
            show_name: true,
            show_label: Boolean(label),
            autoclose: false,
            styles: {
                card: [
                    { background: 'rgba(52, 66, 78, 0.94)' },
                    { border: '1px solid rgba(255,255,255,0.10)' }
                ],
                grid: [
                    { 'grid-template-areas': label ? '"i" "n" "l"' : '"i" "n"' },
                    { 'grid-template-rows': label ? '43% 29% 28%' : '58% 42%' },
                    { height: '100%' }
                ],
                icon: [{ width: '22px' }, { color: '#f6f7f9' }],
                name: [{ 'font-size': '10px' }, { color: '#f6f7f9' }],
                label: [{ 'font-size': '8px' }, { color: 'rgba(246,247,249,0.82)' }]
            }
        });

        return [
            merge(common(1, 'mdi:brightness-7', '100%'), {
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    target: { entity_id: item.entity },
                    data: { brightness_pct: 100 }
                },
                hold_action: { action: 'none' }
            }),
            merge(common(2, 'mdi:brightness-percent', `${brightnessPreset}%`, nowBrightness), {
                tap_action: { action: 'none' },
                hold_action: { action: 'none' },
                _hubAction: 'preset-brightness'
            }),
            merge(common(3, capabilities.color ? 'mdi:palette' : 'mdi:temperature-kelvin', capabilities.color ? 'Color' : 'White'), {
                tap_action: { action: 'none' },
                hold_action: { action: 'none' },
                _hubAction: 'palette'
            }),
            merge(common(4, standardIcon, standardName, standardLabel), {
                tap_action: { action: 'none' },
                hold_action: { action: 'none' },
                _hubAction: 'preset-standard',
                _standardMode: standardMode
            }),
            merge(common(5, 'mdi:minus', '5%'), {
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    target: { entity_id: item.entity },
                    data: { brightness_step_pct: -5 }
                },
                hold_action: { action: 'none' }
            }),
            merge(common(6, 'mdi:plus', '5%'), {
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    target: { entity_id: item.entity },
                    data: { brightness_step_pct: 5 }
                },
                hold_action: { action: 'none' }
            })
        ];
    }

    _mediaControlButtons(item)
    {
        const state = this.hass && item.entity ? this.hass.states[item.entity] : null;
        const attrs = state && state.attributes ? state.attributes : {};
        const playing = state && state.state === 'playing';
        const title = attrs.media_title || attrs.media_channel || '';
        const members = Array.isArray(attrs.group_members) ? attrs.group_members : [item.entity];
        const joined = members.filter(x => x !== item.entity).length;

        const serviceAction = (service, data = {}) => ({
            action: 'perform-action',
            perform_action: service,
            target: service.startsWith('media_player.') ? { entity_id: item.entity } : undefined,
            data
        });

        const base = (slot, icon, name, label = '') => ({
            _inline_hub: true,
            slot,
            entity: item.entity,
            icon,
            name,
            label,
            show_name: true,
            show_label: Boolean(label),
            autoclose: false,
            tap_action: { action: 'none' },
            hold_action: { action: 'none' },
            styles: {
                card: [
                    { background: 'rgba(52,66,78,0.94)' },
                    { border: '1px solid rgba(75,180,200,0.20)' }
                ],
                icon: [{ width: '20px' }, { color: '#f6f7f9' }],
                name: [{ 'font-size': '10px' }, { color: '#f6f7f9' }],
                label: [{ 'font-size': '8px' }, { color: 'rgba(246,247,249,0.82)' }]
            }
        });

        const volumeDown = item.group_volume_down_script
            ? serviceAction(item.group_volume_down_script)
            : serviceAction('media_player.volume_down');

        const volumeUp = item.group_volume_up_script
            ? serviceAction(item.group_volume_up_script)
            : serviceAction('media_player.volume_up');

        return [
            merge(base(1, 'mdi:volume-minus', 'Vol'), { tap_action: volumeDown }),
            merge(base(2, playing ? 'mdi:pause' : 'mdi:play', playing ? 'Pause' : 'Play', title), {
                tap_action: serviceAction('media_player.media_play_pause')
            }),
            merge(base(3, 'mdi:speaker-multiple', 'Join', joined ? `${joined} joined` : 'Solo'), {
                _hubAction: 'join',
                styles: {
                    card: [
                        { background: 'rgba(126,54,96,0.82)' },
                        { border: '1px solid rgba(255,255,255,0.10)' }
                    ]
                }
            }),
            merge(base(4, 'mdi:volume-plus', 'Vol'), { tap_action: volumeUp }),
            merge(base(5, 'mdi:star', 'Radio'), {
                _hubAction: 'radio',
                styles: {
                    card: [
                        { background: 'rgba(108,62,78,0.82)' },
                        { border: '1px solid rgba(255,255,255,0.10)' }
                    ]
                }
            }),
            merge(base(6, 'mdi:folder-music', 'Browse'), {
                tap_action: { action: 'more-info' }
            })
        ];
    }

    _paletteButtons(item)
    {
        const capabilities = this._capabilities(item.entity);

        if( capabilities.color )
        {
            const hues = [0,25,50,80,115,150,180,205,230,265,300,335];

            return hues.map((hue,index) => ({
                slot: index + 7,
                entity: item.entity,
                show_icon: false,
                show_name: false,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    target: { entity_id: item.entity },
                    data: { hs_color: [hue,85] }
                },
                styles: {
                    card: [
                        { background: `hsl(${hue}, 85%, 55%)` },
                        { border: '1px solid rgba(255,255,255,0.20)' }
                    ]
                }
            }));
        }

        const min = capabilities.minKelvin;
        const max = capabilities.maxKelvin;
        const values = Array.from({length:12}, (_,i) =>
            Math.round(min + ((max - min) * (i / 11)))
        );

        return values.map((kelvin,index) => {
            const rgb = this._kelvinToRgb(kelvin);
            const foreground = this._contrast(rgb);

            return {
                _inline_hub: true,
                slot: index + 7,
                entity: item.entity,
                icon: 'mdi:circle',
                name: `${kelvin}K`,
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    target: { entity_id: item.entity },
                    data: { color_temp_kelvin: kelvin }
                },
                styles: {
                    card: [
                        { background: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` },
                        { border: '1px solid rgba(35,45,55,0.28)' }
                    ],
                    icon: [{ width: '12px' }, { color: foreground }],
                    name: [{ 'font-size': '8px' }, { color: foreground }]
                }
            };
        });
    }

    _joinButtons(item)
    {
        if( ! item.toggle_member_script || ! Array.isArray(item.members) )
            return [];

        const leaderState = this.hass && item.entity ? this.hass.states[item.entity] : null;
        const activeMembers = leaderState && Array.isArray(leaderState.attributes.group_members)
            ? leaderState.attributes.group_members
            : [item.entity];

        return item.members.slice(0,12).map((member,index) => ({
            _inline_hub: true,
            slot: index + 7,
            entity: member.entity,
            icon: member.icon || (member.entity && member.entity.includes('tv') ? 'mdi:television-speaker' : 'mdi:speaker'),
            name: member.name || '',
            show_name: true,
            autoclose: false,
            tap_action: {
                action: 'perform-action',
                perform_action: item.toggle_member_script,
                data: { member: member.entity }
            },
            styles: {
                card: [
                    { background: activeMembers.includes(member.entity) ? 'rgba(45,105,116,0.96)' : 'rgba(52,66,78,0.94)' },
                    { border: '1px solid rgba(75,180,200,0.20)' }
                ],
                icon: [{ width: '18px' }, { color: '#f6f7f9' }],
                name: [{ 'font-size': '9px' }, { color: '#f6f7f9' }]
            }
        }));
    }

    _radioButtons(item)
    {
        const favoritesEntity = item.favorites_sensor || 'sensor.sonos_favorites';
        const cacheEntity = item.favorites_cache_sensor || 'sensor.sonos_favorites_cache';
        const favoritesState = this.hass && this.hass.states[favoritesEntity];
        const cacheState = this.hass && this.hass.states[cacheEntity];
        const items = favoritesState && favoritesState.attributes
            ? favoritesState.attributes.items || {}
            : {};
        const cache = cacheState && cacheState.attributes && Array.isArray(cacheState.attributes.items)
            ? cacheState.attributes.items
            : [];

        return Object.entries(items).slice(0,12).map(([contentId,title],index) => {
            const cached = cache.find(x => x && x.media_content_id === contentId);
            const thumbnail = cached && cached.thumbnail;

            return {
                _inline_hub: true,
                slot: index + 7,
                entity: item.entity,
                icon: thumbnail ? undefined : 'mdi:radio',
                show_icon: !thumbnail,
                name: thumbnail ? '' : title,
                show_name: !thumbnail,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'media_player.play_media',
                    target: { entity_id: item.entity },
                    data: {
                        media_content_id: contentId,
                        media_content_type: 'favorite_item_id'
                    }
                },
                styles: {
                    card: [
                        { background: 'rgba(52,66,78,0.94)' },
                        { 'background-image': thumbnail ? `url("${thumbnail}")` : 'none' },
                        { 'background-position': 'center' },
                        { 'background-repeat': 'no-repeat' },
                        { 'background-size': '56% auto' },
                        { border: '1px solid rgba(75,180,200,0.22)' }
                    ],
                    icon: [{ width: '17px' }, { color: '#f6f7f9' }],
                    name: [{ 'font-size': '9px' }, { color: '#f6f7f9' }]
                }
            };
        });
    }

    _setNumber(entityId, value)
    {
        if( ! this.hass || ! entityId || ! Number.isFinite(Number(value)) )
            return;

        this.hass.callService('number', 'set_value', {
            value: Number(value)
        }, {
            entity_id: entityId
        });
    }

    _handlePreset(item, control, actionType)
    {
        if( ! this.hass )
            return;

        const presets = item.presets || {};
        const light = this.hass.states[item.entity];

        if( ! light )
            return;

        if( control._hubAction === 'preset-brightness' )
        {
            const helper = presets.brightness && presets.brightness.entity;

            if( actionType === 'hold' )
            {
                if( helper && light.attributes.brightness !== null && light.attributes.brightness !== undefined )
                    this._setNumber(helper, Math.round((Number(light.attributes.brightness) / 255) * 100));
            }
            else
            {
                const value = this._helperValue(helper, 60);
                this.hass.callService('light', 'turn_on', {
                    brightness_pct: Math.max(0, Math.min(100, value))
                }, {
                    entity_id: item.entity
                });
            }

            return;
        }

        if( control._hubAction === 'preset-standard' )
        {
            const color = presets.color || {};
            const kelvin = presets.kelvin || {};
            const hueEntity = color.hue_entity;
            const satEntity = color.saturation_entity;
            const kelvinEntity = kelvin.entity;
            const capabilities = this._capabilities(item.entity);
            const useColor = capabilities.color && hueEntity && satEntity;

            if( actionType === 'hold' )
            {
                if( useColor && Array.isArray(light.attributes.hs_color) )
                {
                    this._setNumber(hueEntity, Math.round(Number(light.attributes.hs_color[0])));
                    this._setNumber(satEntity, Math.round(Number(light.attributes.hs_color[1])));
                }
                else if( kelvinEntity && Number(light.attributes.color_temp_kelvin) > 0 )
                {
                    this._setNumber(kelvinEntity, Math.round(Number(light.attributes.color_temp_kelvin)));
                }
            }
            else if( useColor )
            {
                this.hass.callService('light', 'turn_on', {
                    hs_color: [
                        this._helperValue(hueEntity, 0),
                        this._helperValue(satEntity, 0)
                    ]
                }, {
                    entity_id: item.entity
                });
            }
            else
            {
                this.hass.callService('light', 'turn_on', {
                    color_temp_kelvin: Math.round(this._helperValue(kelvinEntity, 2700))
                }, {
                    entity_id: item.entity
                });
            }
        }
    }

    _openItem(item, originSlot)
    {
        this._selectedItem = item;
        this._selectedOriginSlot = originSlot;
        this._view = 'detail';
        this._nestedView = null;
        this.requestUpdate();
    }

    _back()
    {
        if( this._nestedView )
        {
            this._nestedView = null;
            this.requestUpdate();
            return;
        }

        this._view = 'hub';
        this._selectedItem = null;
        this._selectedOriginSlot = null;
        this.requestUpdate();
    }

    _handleTileAction(e, meta)
    {
        if( ! e || ! e.detail )
            return;

        const actionType = e.detail.action || 'tap';

        if( meta.role === 'root' )
        {
            if( actionType === 'hold' )
            {
                e.stopPropagation();
                e.preventDefault();
                this._openItem(meta.item, meta.slot);
                return;
            }

            // Tap is intentionally left to the wrapped button-card so its
            // normal Home Assistant toggle action still runs.
            return;
        }

        if( meta.role === 'center' )
        {
            if( actionType === 'tap' )
            {
                e.stopPropagation();
                e.preventDefault();
                this._back();
            }
            return;
        }

        if( meta.control && meta.control._hubAction )
        {
            e.stopPropagation();

            if( meta.control._hubAction === 'palette' && actionType === 'tap' )
            {
                this._nestedView = 'palette';
                this.requestUpdate();
                return;
            }

            if( meta.control._hubAction === 'join' && actionType === 'tap' )
            {
                this._nestedView = 'join';
                this.requestUpdate();
                return;
            }

            if( meta.control._hubAction === 'radio' && actionType === 'tap' )
            {
                this._nestedView = 'radio';
                this.requestUpdate();
                return;
            }

            this._handlePreset(meta.item, meta.control, actionType);
        }
    }

    _renderTile(config, offset, meta)
    {
        const style = `--x:${offset[0]}px;--y:${offset[1]}px;`;

        return html`
            <div class="tile" style=${style}
                @action=${e => this._handleTileAction(e, meta)}>
                <honeycomb-menu-item
                    .hass=${this.hass}
                    .config=${config}
                    .size=${this._size}>
                </honeycomb-menu-item>
            </div>
        `;
    }

    _renderHub()
    {
        const items = this._items();
        const showLogo = this._shouldShowLogo();
        const autoSlots = this._hubSlots(items.length, showLogo);

        const tiles = items.map((item,index) => {
            const slot = item.slot !== undefined ? Number(item.slot) : autoSlots[index];
            return this._renderTile(
                this._rootItemConfig(item),
                this._offsetForSlot(slot),
                { role: 'root', item, slot }
            );
        });

        if( showLogo )
        {
            tiles.push(this._renderTile(
                this._logoConfig(),
                this._innerOffset(0),
                { role: 'logo' }
            ));
        }

        return tiles;
    }

    _detailButtons(item)
    {
        if( item.type === 'media' )
            return this._mediaControlButtons(item);

        return this._lightControlButtons(item);
    }

    _renderDetail()
    {
        const item = this._selectedItem;

        if( ! item )
            return this._renderHub();

        const origin = this._offsetForSlot(this._selectedOriginSlot || 0);
        const tiles = [];

        tiles.push(this._renderTile(
            this._centerItemConfig(item),
            origin,
            { role: 'center', item }
        ));

        const controls = this._detailButtons(item);

        controls.forEach(control => {
            const relative = this._innerOffset(control.slot);
            const offset = [origin[0] + relative[0], origin[1] + relative[1]];

            tiles.push(this._renderTile(
                control,
                offset,
                { role: 'control', item, control }
            ));
        });

        let outer = [];

        if( this._nestedView === 'palette' )
            outer = this._paletteButtons(item);
        else if( this._nestedView === 'join' )
            outer = this._joinButtons(item);
        else if( this._nestedView === 'radio' )
            outer = this._radioButtons(item);

        outer.forEach(control => {
            const relative = this._outerOffset(control.slot);
            const offset = [origin[0] + relative[0], origin[1] + relative[1]];

            tiles.push(this._renderTile(
                control,
                offset,
                { role: 'outer', item, control }
            ));
        });

        return tiles;
    }

    render()
    {
        return html`
            <div class="stage">
                ${this._view === 'hub' ? this._renderHub() : this._renderDetail()}
            </div>
        `;
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
        description: 'Inline persistent Honeycomb hub for room/device navigation.'
    });
}

export default HoneycombPersistentHub;
