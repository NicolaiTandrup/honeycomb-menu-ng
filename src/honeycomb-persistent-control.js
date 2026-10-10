import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";
import { provideHass } from "./helpers.js";

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
    }

    static get styles()
    {
        return css`
            :host {
                display: block;
                width: var(--honeycomb-persistent-size, 72px);
                line-height: normal;
            }

            .persistent-center {
                position: relative;
                width: 100%;
                height: calc(var(--honeycomb-persistent-size, 72px) * 1.1476);
                overflow: visible;

                --honeycomb-outer-border-width: 3px;
                --honeycomb-inner-border-width: 3px;
                --honeycomb-outer-color: #303030;
                --honeycomb-inner-color: #4f7fae;
                --honeycomb-center-color: #202020;
            }

            .hex-layer {
                position: absolute;
                clip-path: polygon(
                    50% 0%,
                    100% 25%,
                    100% 75%,
                    50% 100%,
                    0% 75%,
                    0% 25%
                );
                pointer-events: none;
            }

            .hex-outer {
                inset: 0;
                background: var(--honeycomb-outer-color);
            }

            .hex-inner {
                inset: var(--honeycomb-outer-border-width);
                background: var(--honeycomb-inner-color);
            }

            .hex-center {
                inset: calc(
                    var(--honeycomb-outer-border-width) +
                    var(--honeycomb-inner-border-width)
                );
                background: var(--honeycomb-center-color);
            }

            honeycomb-menu-item {
                position: absolute;
                inset: 0;
                width: 100%;
                box-sizing: border-box;
                z-index: 2;
                --honeycomb-menu-item-shell-background: transparent;
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
            tap_action: { action: 'toggle' },
            center_button: {},
            show_brightness: 'when_on',
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
        const configured = this.config?.colors || {};
        const off = this.config?.off || {};

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

    _computeCenterConfig()
    {
        if( ! this.config )
            return null;

        let holdAction = this.config.hold_action;

        if( ! holdAction && this.config.menu )
        {
            const menu = merge({}, this.config.menu);

            if( ! menu.entity )
                menu.entity = this.config.entity;

            holdAction = {
                action: 'fire-dom-event',
                honeycomb_menu: menu
            };
        }

        return merge(
            {},
            {
                entity: this.config.entity,
                icon: this.config.icon,
                active: this.config.active,
                autoclose: false,
                show_name: false,
                show_label: false,
                tap_action: this.config.tap_action,
                hold_action: holdAction || { action: 'none' },
                styles: {
                    card: [
                        { background: 'transparent' },
                        { 'background-color': 'transparent' },
                        { 'box-shadow': 'none' },
                        { border: 'none' }
                    ]
                }
            },
            this.config.center_button || {}
        );
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();

        if( ! centerConfig )
            return html``;

        const colors = this._resolveColors();
        const outerWidth = Math.max(0, Number(this.config?.border?.outer_width ?? 3));
        const innerWidth = Math.max(0, Number(this.config?.border?.inner_width ?? 3));

        return html`
            <div
                class="persistent-center"
                style="
                    --honeycomb-persistent-size: ${this.size}px;
                    --honeycomb-outer-border-width: ${outerWidth}px;
                    --honeycomb-inner-border-width: ${innerWidth}px;
                    --honeycomb-outer-color: ${colors.outer};
                    --honeycomb-inner-color: ${colors.inner};
                    --honeycomb-center-color: ${colors.center};
                "
            >
                <div class="hex-layer hex-outer"></div>
                <div class="hex-layer hex-inner"></div>
                <div class="hex-layer hex-center"></div>

                <honeycomb-menu-item
                    .hass=${this.hass}
                    .config=${centerConfig}>
                </honeycomb-menu-item>
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
        description: 'Persistent Honeycomb center control with tap action and hold-to-open menu.'
    });
}

export default HoneycombPersistentControl;
