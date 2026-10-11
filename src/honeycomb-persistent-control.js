import { LitElement, html, css } from 'lit';
import { fireEvent, provideHass } from "./helpers.js";

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');

class HoneycombPersistentControl extends LitElement
{
    static get is()
    {
        return 'honeycomb-persistent-control';
    }

    static get properties()
    {
        return {
            hass: { type: Object },
            config: { type: Object },
            size: { type: Number }
        };
    }

    constructor()
    {
        super();
        this._hass = null;
        this.config = null;
        this.size = 72;
        this._lastKnownColor = null;
        this._holdTimer = null;
        this._holdTriggered = false;
        this._pointerId = null;
        this._pointerStartX = 0;
        this._pointerStartY = 0;
        this._beeFlapping = false;
        this._beeFlapTimer = null;
    }

    static get styles()
    {
        return css`
            :host {
                display: block;
                width: var(--honeycomb-persistent-size, 72px);
                line-height: normal;
                position: relative;
                user-select: none;
                -webkit-user-select: none;
            }

            .persistent-center {
                position: relative;
                width: 100%;
                height: calc(var(--honeycomb-persistent-size, 72px) * 1.1547);
                overflow: visible;
            }

            .hex-svg {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
                z-index: 0;
            }

            .hex-polygon {
                vector-effect: non-scaling-stroke;
                stroke-linejoin: round;
            }

            .interaction-surface {
                position: absolute;
                inset: 0;
                z-index: 2;
                cursor: pointer;
                touch-action: none;
                clip-path: polygon(
                    50% 0%,
                    100% 25%,
                    100% 75%,
                    50% 100%,
                    0% 75%,
                    0% 25%
                );
                background: transparent;
                -webkit-tap-highlight-color: transparent;
                outline: none;
            }

            .content {
                position: absolute;
                inset: 0;
                z-index: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                color: var(--honeycomb-persistent-foreground, #f6f7f9);
            }

            .bee-icon {
                width: 48%;
                height: 48%;
                display: block;
                overflow: visible;
            }

            .bee-wing-left,
            .bee-wing-right {
                transform-box: fill-box;
                transform-origin: center;
            }

            .bee-icon.flap .bee-wing-left {
                animation: honeycomb-wing-left 130ms ease-in-out 0s 3 alternate;
            }

            .bee-icon.flap .bee-wing-right {
                animation: honeycomb-wing-right 130ms ease-in-out 0s 3 alternate;
            }

            .bee-icon.flap .bee-body {
                animation: honeycomb-bee-bounce 390ms ease-in-out;
                transform-box: fill-box;
                transform-origin: center;
            }

            @keyframes honeycomb-wing-left {
                from { transform: rotate(0deg); }
                to { transform: rotate(-24deg) translate(-1px, -1px); }
            }

            @keyframes honeycomb-wing-right {
                from { transform: rotate(0deg); }
                to { transform: rotate(24deg) translate(1px, -1px); }
            }

            @keyframes honeycomb-bee-bounce {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-2px) scale(1.05); }
            }

            ha-icon {
                width: 34%;
                height: 34%;
                color: inherit;
            }

            .content.has-secondary ha-icon {
                width: 30%;
                height: 30%;
                transform: translateY(-2px);
            }

            .secondary {
                margin-top: 2px;
                font-size: calc(var(--honeycomb-persistent-size, 72px) * 0.16);
                font-weight: 650;
                line-height: 1;
                letter-spacing: -0.01em;
                color: inherit;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
            }
        `;
    }

    set hass(obj)
    {
        const oldHass = this._hass;
        this._hass = obj;

        const color = this._currentLightColor();
        const state = this._entityState();

        if( state && state.state === 'on' && color )
            this._lastKnownColor = color;

        this.requestUpdate('hass', oldHass);
    }

    get hass()
    {
        return this._hass;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Control requires a configuration.');

        const next = merge({}, config);

        _defaults(next, {
            mode: 'persistent',
            entity: null,
            size: 72,
            icon: 'mdi:hexagon-outline',
            active: true,
            interactive: true,
            tap_action: { action: 'toggle' },
            center_button: {},
            show_brightness: 'when_on',
            match_anchor_size: true,
            hold_time: 500,
            colors: {
                center: 'auto',
                inner_border: 'auto',
                outer_border: '#34383d',
                unavailable: '#555b63'
            },
            off: {
                center_color: '#202224',
                preview_color: null
            },
            border: {
                outer_width: 3,
                inner_width: 3
            }
        });

        if( ! next.entity && next.mode !== 'hub' )
            throw new Error('Honeycomb Persistent Control requires an entity.');

        this.config = next;
        this.size = Number(next.size) || 72;

        provideHass(this);

        const color = this._currentLightColor();
        const state = this._entityState();

        if( state && state.state === 'on' && color )
            this._lastKnownColor = color;

        this.requestUpdate();
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
        this._clearHoldTimer();

        if( this._beeFlapTimer )
        {
            clearTimeout(this._beeFlapTimer);
            this._beeFlapTimer = null;
        }
    }

    getCardSize()
    {
        return 1;
    }

    _entityState()
    {
        if( ! this.hass || ! this.config || ! this.config.entity )
            return null;

        return this.hass.states[this.config.entity] || null;
    }

    _kelvinToRgb(kelvin)
    {
        let temp = Math.max(1000, Math.min(40000, Number(kelvin) || 2700)) / 100;
        let red;
        let green;
        let blue;

        if( temp <= 66 )
        {
            red = 255;
            green = 99.4708025861 * Math.log(temp) - 161.1195681661;
            blue = temp <= 19
                ? 0
                : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
        }
        else
        {
            red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
            green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
            blue = 255;
        }

        const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
        return `rgb(${clamp(red)}, ${clamp(green)}, ${clamp(blue)})`;
    }

    _currentLightColor()
    {
        const state = this._entityState();

        if( ! state || ! state.attributes )
            return null;

        const attrs = state.attributes;

        if( Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3 )
            return `rgb(${attrs.rgb_color[0]}, ${attrs.rgb_color[1]}, ${attrs.rgb_color[2]})`;

        if( attrs.color_temp_kelvin )
            return this._kelvinToRgb(attrs.color_temp_kelvin);

        return null;
    }

    _resolveColors()
    {
        const state = this._entityState();
        const configured = (this.config && this.config.colors) || {};
        const off = (this.config && this.config.off) || {};

        if( this.config && this.config.mode === 'hub' )
        {
            return {
                center: configured.center || '#20262d',
                inner: configured.inner_border || '#f2b705',
                outer: configured.outer_border || '#34383d'
            };
        }

        if( ! state || ['unavailable', 'unknown'].includes(state.state) )
        {
            const unavailable = configured.unavailable || '#555b63';
            return {
                center: unavailable,
                inner: unavailable,
                outer: unavailable
            };
        }

        const on = state.state === 'on';
        const actual = this._currentLightColor();

        if( on && actual )
            this._lastKnownColor = actual;

        const preview = this._lastKnownColor || off.preview_color || '#4f7fae';
        const automaticCenter = on ? (actual || '#f3eadb') : (off.center_color || '#202224');
        const automaticInner = on ? (actual || automaticCenter) : preview;
        const automaticOuter = automaticCenter;

        return {
            center: configured.center && configured.center !== 'auto'
                ? configured.center
                : automaticCenter,
            inner: configured.inner_border && configured.inner_border !== 'auto'
                ? configured.inner_border
                : automaticInner,
            outer: configured.outer_border && configured.outer_border !== 'auto'
                ? configured.outer_border
                : automaticOuter
        };
    }

    _parseColor(color)
    {
        if( typeof color !== 'string' )
            return null;

        const value = color.trim();

        const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
        if( rgb )
            return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

        const hex = value.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
        if( hex )
        {
            let raw = hex[1];

            if( raw.length === 3 )
                raw = raw.split('').map(c => c + c).join('');

            return [
                parseInt(raw.substring(0, 2), 16),
                parseInt(raw.substring(2, 4), 16),
                parseInt(raw.substring(4, 6), 16)
            ];
        }

        return null;
    }

    _foregroundForBackground(background)
    {
        const rgb = this._parseColor(background);

        if( ! rgb )
            return '#f6f7f9';

        const linear = rgb.map(channel => {
            const value = Math.max(0, Math.min(255, channel)) / 255;
            return value <= 0.03928
                ? value / 12.92
                : Math.pow((value + 0.055) / 1.055, 2.4);
        });

        const luminance =
            (0.2126 * linear[0]) +
            (0.7152 * linear[1]) +
            (0.0722 * linear[2]);

        return luminance > 0.42 ? '#17212b' : '#f6f7f9';
    }

    _brightnessLabel()
    {
        if( ! this.config )
            return null;

        const mode = this.config.show_brightness || 'when_on';

        if( mode === 'never' )
            return null;

        const state = this._entityState();

        if( ! state || ! state.attributes )
            return null;

        if( mode === 'when_on' && state.state !== 'on' )
            return null;

        const brightness = Number(state.attributes.brightness);

        if( ! Number.isFinite(brightness) )
            return null;

        const percentage = Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)));
        return `${percentage}%`;
    }

    _persistentMenuConfig()
    {
        if( ! this.config || ! this.config.menu )
            return null;

        const menu = merge({}, this.config.menu);

        if( ! menu.entity )
            menu.entity = this.config.entity;

        if( this.config.presets )
            menu.presets = merge({}, this.config.presets, menu.presets || {});

        menu.position_mode = 'anchored';

        // If any reachable nested menu expands into the outer physical ring,
        // reserve that full envelope before the first ring opens. The center
        // then stays on the exact same pixel when Color (or another submenu)
        // reveals slots 7-18.
        const hasNestedOuterExpansion = (buttons) => {
            if( ! Array.isArray(buttons) )
                return false;

            for( let i = 0; i < buttons.length; i++ )
            {
                const button = buttons[i];

                if( ! button || typeof button !== 'object' )
                    continue;

                const nested = button.tap_action && button.tap_action.honeycomb_menu;

                if( nested && nested.nested_expand === true )
                {
                    if( nested.inherit_inner === true )
                        return true;

                    if( Array.isArray(nested.buttons) && nested.buttons.some(item => {
                        return item && Number(item.slot) >= 7;
                    }) )
                        return true;
                }

                if( nested && hasNestedOuterExpansion(nested.buttons) )
                    return true;
            }

            return false;
        };

        if( hasNestedOuterExpansion(menu.buttons) )
            menu.layout_envelope = 'outer';

        const anchorSize = Number(this._anchorRenderedSize) || this.size;

        if( this.config.match_anchor_size !== false )
            menu.size = anchorSize * 3.586;

        const persistentDefaults = {
            styles: {
                card: [
                    { background: 'rgba(52, 66, 78, 0.94)' },
                    { border: '1px solid rgba(255, 255, 255, 0.10)' },
                    { color: '#f6f7f9' }
                ],
                grid: [
                    { 'grid-template-areas': '"i" "n"' },
                    { 'grid-template-columns': '1fr' },
                    { 'grid-template-rows': '58% 42%' },
                    { height: '100%' },
                    { 'align-items': 'center' }
                ],
                icon: [
                    { width: '28px' },
                    { 'align-self': 'end' },
                    { color: '#f6f7f9' }
                ],
                name: [
                    { 'font-size': '12px' },
                    { color: '#f6f7f9' },
                    { 'line-height': '1.05' },
                    { 'align-self': 'start' },
                    { 'padding-top': '2px' },
                    { 'white-space': 'nowrap' },
                    { overflow: 'hidden' },
                    { 'text-overflow': 'ellipsis' }
                ]
            }
        };

        menu.button_defaults = merge(
            {},
            persistentDefaults,
            menu.button_defaults || {}
        );

        const center = merge({}, this.config);
        delete center.menu;
        center.interactive = false;
        center.size = this.size;

        if( ! center.off )
            center.off = {};

        if( this._lastKnownColor )
            center.off.preview_color = this._lastKnownColor;

        menu.persistent_center = center;
        menu.center_button = null;

        return menu;
    }

    _clearHoldTimer()
    {
        if( this._holdTimer )
        {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }
    }

    _handlePointerDown(e)
    {
        if( ! this.config || this.config.interactive === false )
            return;

        if( e.button !== undefined && e.button !== 0 )
            return;

        this._clearHoldTimer();
        this._pointerId = e.pointerId;
        this._pointerStartX = e.clientX;
        this._pointerStartY = e.clientY;
        this._holdTriggered = false;

        if( e.currentTarget && e.currentTarget.setPointerCapture )
        {
            try { e.currentTarget.setPointerCapture(e.pointerId); }
            catch(err) { /* Pointer capture is best-effort. */ }
        }

        const holdTime = Math.max(250, Number(this.config.hold_time) || 500);

        this._holdTimer = setTimeout(() => {
            this._holdTimer = null;
            this._holdTriggered = true;
            this._openMenu();
        }, holdTime);
    }

    _handlePointerMove(e)
    {
        if( this._pointerId === null || e.pointerId !== this._pointerId )
            return;

        const distance = Math.hypot(
            e.clientX - this._pointerStartX,
            e.clientY - this._pointerStartY
        );

        if( distance > 12 && ! this._holdTriggered )
            this._clearHoldTimer();
    }

    _handlePointerUp(e)
    {
        if( this._pointerId === null || e.pointerId !== this._pointerId )
            return;

        const wasHold = this._holdTriggered;

        this._clearHoldTimer();
        this._pointerId = null;
        this._holdTriggered = false;

        if( wasHold )
        {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        this._executeAction(this.config.tap_action || { action: 'toggle' });
    }

    _handlePointerCancel()
    {
        this._clearHoldTimer();
        this._pointerId = null;
        this._holdTriggered = false;
    }

    _openMenu()
    {
        const menu = this._persistentMenuConfig();

        if( ! menu || typeof window.honeycomb_menu !== 'function' )
            return;

        const rect = this.getBoundingClientRect();

        // Use the actual rendered width, not only the configured number. This
        // prevents the center from subtly growing when the surrounding ring is
        // opened inside responsive Lovelace layouts.
        this._anchorRenderedSize = rect.width;

        if( this.config.match_anchor_size !== false )
            menu.size = rect.width * 3.586;

        if( menu.persistent_center )
            menu.persistent_center.size = rect.width;

        menu.anchor_x = rect.left + (rect.width / 2);
        menu.anchor_y = rect.top + (rect.height / 2);

        const openedMenu = window.honeycomb_menu(menu);

        if( openedMenu )
        {
            this.style.visibility = 'hidden';

            const restore = () => {
                this.style.visibility = '';
            };

            openedMenu.addEventListener('closed', restore, { once: true });
        }

        return openedMenu || null;
    }

    _flapBee()
    {
        this._beeFlapping = false;
        this.requestUpdate();

        requestAnimationFrame(() => {
            this._beeFlapping = true;
            this.requestUpdate();

            if( this._beeFlapTimer )
                clearTimeout(this._beeFlapTimer);

            this._beeFlapTimer = setTimeout(() => {
                this._beeFlapping = false;
                this._beeFlapTimer = null;
                this.requestUpdate();
            }, 430);
        });
    }

    _executeAction(action)
    {
        if( ! action || ! this.hass )
            return;

        const actionName = action.action || 'toggle';

        if( actionName === 'none' )
            return;

        if( actionName === 'honeycomb-open-menu' )
        {
            this._openMenu();
            return;
        }

        if( actionName === 'honeycomb-bee-flap' )
        {
            this._flapBee();
            return;
        }

        if( actionName === 'honeycomb-back' )
        {
            if( typeof window.honeycomb_menu_back === 'function' )
                window.honeycomb_menu_back();
            return;
        }

        if( actionName === 'toggle' )
        {
            this.hass.callService(
                'homeassistant',
                'toggle',
                {},
                { entity_id: this.config.entity }
            );
            return;
        }

        if( actionName === 'more-info' )
        {
            fireEvent(this, 'hass-more-info', { entityId: this.config.entity });
            return;
        }

        if( actionName === 'perform-action' )
        {
            const serviceName = action.perform_action || action.service;

            if( serviceName && serviceName.indexOf('.') > 0 )
            {
                const parts = serviceName.split('.');
                this.hass.callService(
                    parts[0],
                    parts.slice(1).join('.'),
                    action.data || {},
                    action.target || { entity_id: this.config.entity }
                );
            }
            return;
        }

        if( actionName === 'call-service' )
        {
            const serviceName = action.service;

            if( serviceName && serviceName.indexOf('.') > 0 )
            {
                const parts = serviceName.split('.');
                const data = action.service_data || action.data || {};

                this.hass.callService(
                    parts[0],
                    parts.slice(1).join('.'),
                    data,
                    action.target || null
                );
            }
        }
    }

    render()
    {
        if( ! this.config )
            return html``;

        const colors = this._resolveColors();
        const border = (this.config && this.config.border) || {};
        const outerWidth = Math.max(0, Number(border.outer_width !== undefined ? border.outer_width : 3));
        const innerWidth = Math.max(0, Number(border.inner_width !== undefined ? border.inner_width : 3));

        // Build the two borders as uniformly scaled copies of the exact same
        // hexagon. This keeps the shape homogeneous while avoiding the double
        // dark stripe that occurs when two centered SVG strokes overlap.
        const outerScale = 1;
        const innerScale = Math.max(0.55, 1 - ((outerWidth * 2) / this.size));
        const centerScale = Math.max(
            0.45,
            innerScale - ((innerWidth * 2) / this.size)
        );
        const foreground = this._foregroundForBackground(colors.center);
        const secondary = this._brightnessLabel();

        return html`
            <div
                class="persistent-center"
                style="
                    --honeycomb-persistent-size: ${this.size}px;
                    --honeycomb-persistent-foreground: ${foreground};
                "
            >
                <svg
                    class="hex-svg"
                    viewBox="0 0 100 115.47"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                >
                    <polygon
                        class="hex-polygon"
                        points="50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675"
                        fill="${colors.outer}">
                    </polygon>

                    <g transform="translate(50 57.735) scale(${innerScale}) translate(-50 -57.735)">
                        <polygon
                            class="hex-polygon"
                            points="50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675"
                            fill="${colors.inner}">
                        </polygon>
                    </g>

                    <g transform="translate(50 57.735) scale(${centerScale}) translate(-50 -57.735)">
                        <polygon
                            class="hex-polygon"
                            points="50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675"
                            fill="${colors.center}">
                        </polygon>
                    </g>
                </svg>

                <div class="content ${secondary ? 'has-secondary' : ''}">
                    ${(this.config.icon === '' || this.config.icon === 'honeycomb:bee') ? html`
                        <svg class="bee-icon ${this._beeFlapping ? 'flap' : ''}" viewBox="0 0 80 72" aria-hidden="true">
                            <g class="bee-body">
                                <path class="bee-wing-left"
                                      d="M35 27 C24 10,8 13,10 29 C11 40,24 42,36 34 Z"
                                      fill="#fff8d8" stroke="#17191c" stroke-width="3.2" stroke-linejoin="round"></path>
                                <path class="bee-wing-right"
                                      d="M45 27 C56 10,72 13,70 29 C69 40,56 42,44 34 Z"
                                      fill="#fff8d8" stroke="#17191c" stroke-width="3.2" stroke-linejoin="round"></path>

                                <path d="M31 18 C27 10,21 8,17 10"
                                      fill="none" stroke="#17191c" stroke-width="3" stroke-linecap="round"></path>
                                <path d="M49 18 C53 10,59 8,63 10"
                                      fill="none" stroke="#17191c" stroke-width="3" stroke-linecap="round"></path>

                                <ellipse cx="40" cy="39" rx="18" ry="23"
                                         fill="#ffc400" stroke="#17191c" stroke-width="3.4"></ellipse>
                                <path d="M24 32 C30 35,50 35,56 32"
                                      fill="none" stroke="#17191c" stroke-width="5" stroke-linecap="round"></path>
                                <path d="M23 43 C31 47,49 47,57 43"
                                      fill="none" stroke="#17191c" stroke-width="5" stroke-linecap="round"></path>
                                <path d="M27 54 C34 57,46 57,53 54"
                                      fill="none" stroke="#17191c" stroke-width="4" stroke-linecap="round"></path>

                                <circle cx="40" cy="20" r="12"
                                        fill="#ffc400" stroke="#17191c" stroke-width="3.4"></circle>
                                <circle cx="36" cy="18" r="1.9" fill="#17191c"></circle>
                                <circle cx="44" cy="18" r="1.9" fill="#17191c"></circle>
                                <path d="M35 23 Q40 27 45 23"
                                      fill="none" stroke="#17191c" stroke-width="2.4" stroke-linecap="round"></path>
                                <path d="M40 62 L35 69 L45 66 Z"
                                      fill="#17191c" stroke="#17191c" stroke-width="1"></path>
                            </g>
                        </svg>
                    ` : html`<ha-icon .icon=${this.config.icon}></ha-icon>`}
                    ${secondary ? html`<div class="secondary">${secondary}</div>` : ''}
                </div>

                ${this.config.interactive !== false ? html`
                    <div
                        class="interaction-surface"
                        role="button"
                        tabindex="0"
                        @pointerdown=${this._handlePointerDown}
                        @pointermove=${this._handlePointerMove}
                        @pointerup=${this._handlePointerUp}
                        @pointercancel=${this._handlePointerCancel}
                        @contextmenu=${e => e.preventDefault()}>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

if( ! customElements.get(HoneycombPersistentControl.is) )
    customElements.define(HoneycombPersistentControl.is, HoneycombPersistentControl);

window.customCards = window.customCards || [];

if( ! window.customCards.some(card => card.type === HoneycombPersistentControl.is) )
{
    window.customCards.push({
        type: HoneycombPersistentControl.is,
        name: 'Honeycomb Persistent Control',
        description: 'Persistent Honeycomb center control with anchored hold-to-open menus.'
    });
}

export default HoneycombPersistentControl;
