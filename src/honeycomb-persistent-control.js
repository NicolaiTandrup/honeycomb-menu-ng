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
                position: relative;
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
            interactive: true,
            tap_action: { action: 'toggle' },
            center_button: {},
            show_brightness: 'when_on',
            match_anchor_size: true,
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

    _computeCenterConfig()
    {
        if( ! this.config )
            return null;

        const interactive = this.config.interactive !== false;

        return merge(
            {},
            {
                entity: this.config.entity,
                icon: this.config.icon,
                active: this.config.active,
                autoclose: false,
                show_name: false,
                show_label: false,
                tap_action: interactive ? this.config.tap_action : { action: 'none' },
                hold_action: { action: 'none' },
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

    _handleCenterAction(e)
    {
        if( ! this.config || this.config.interactive === false )
            return;

        const actionType = e && e.detail ? e.detail.action : null;

        if( actionType !== 'hold' )
            return;

        const menu = this._persistentMenuConfig();

        if( ! menu || typeof window.honeycomb_menu !== 'function' )
            return;

        e.stopPropagation();

        const rect = this.getBoundingClientRect();
        menu.anchor_x = rect.left + (rect.width / 2);
        menu.anchor_y = rect.top + (rect.height / 2);

        window.honeycomb_menu(menu);
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();

        if( ! centerConfig )
            return html``;

        const colors = this._resolveColors();
        const border = (this.config && this.config.border) || {};
        const outerWidth = Math.max(0, Number(border.outer_width !== undefined ? border.outer_width : 3));
        const innerWidth = Math.max(0, Number(border.inner_width !== undefined ? border.inner_width : 3));

        // Three geometrically identical polygons are scaled around the exact
        // same center. This keeps all six edges homogeneous at every size.
        const outerScale = 1;
        const innerScale = Math.max(0.5, 1 - ((outerWidth * 2) / this.size));
        const centerScale = Math.max(
            0.4,
            innerScale - ((innerWidth * 2) / this.size)
        );

        return html`
            <div
                class="persistent-center"
                style="--honeycomb-persistent-size: ${this.size}px;"
            >
                <svg
                    class="hex-svg"
                    viewBox="0 0 100 115.47"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <polygon
                        class="hex-polygon"
                        points="50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675"
                        fill="${colors.outer}">
                    </polygon>

                    <g transform="translate(50 57.735) scale(${innerScale}) translate(-50 -57.735)">
                        <polygon
                            class="hex-polygon"
                            points="50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675"
                            fill="${colors.inner}">
                        </polygon>
                    </g>

                    <g transform="translate(50 57.735) scale(${centerScale}) translate(-50 -57.735)">
                        <polygon
                            class="hex-polygon"
                            points="50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675"
                            fill="${colors.center}">
                        </polygon>
                    </g>
                </svg>

                <honeycomb-menu-item
                    .hass=${this.hass}
                    .config=${centerConfig}
                    @action=${this._handleCenterAction}>
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
        description: 'Persistent Honeycomb center control with an anchored expandable ring.'
    });
}

export default HoneycombPersistentControl;
