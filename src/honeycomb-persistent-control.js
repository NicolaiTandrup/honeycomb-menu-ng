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
                align-items: center;
                justify-content: center;
                pointer-events: none;
            }

            ha-icon {
                width: 34%;
                height: 34%;
                color: var(--paper-item-icon-color, var(--state-icon-color, #8aa6c2));
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
                outer_border: 'auto',
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

        if( ! next.entity )
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

    _persistentMenuConfig()
    {
        if( ! this.config || ! this.config.menu )
            return null;

        const menu = merge({}, this.config.menu);

        if( ! menu.entity )
            menu.entity = this.config.entity;

        menu.position_mode = 'anchored';

        if( this.config.match_anchor_size !== false )
            menu.size = this.size * 3.586;

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
        menu.anchor_x = rect.left + (rect.width / 2);
        menu.anchor_y = rect.top + (rect.height / 2);

        window.honeycomb_menu(menu);
    }

    _executeAction(action)
    {
        if( ! action || ! this.hass )
            return;

        const actionName = action.action || 'toggle';

        if( actionName === 'none' )
            return;

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

        // One polygon geometry is used for fill and both strokes. This prevents
        // the border shape from changing as it is inset/scaled.
        const totalStroke = Math.max(0, (outerWidth + innerWidth) * 2);
        const innerStroke = Math.max(0, innerWidth * 2);

        return html`
            <div
                class="persistent-center"
                style="--honeycomb-persistent-size: ${this.size}px;"
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
                        fill="${colors.center}"
                        stroke="${colors.outer}"
                        stroke-width="${totalStroke}">
                    </polygon>
                    <polygon
                        class="hex-polygon"
                        points="50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675"
                        fill="none"
                        stroke="${colors.inner}"
                        stroke-width="${innerStroke}">
                    </polygon>
                </svg>

                <div class="content">
                    <ha-icon .icon=${this.config.icon}></ha-icon>
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
