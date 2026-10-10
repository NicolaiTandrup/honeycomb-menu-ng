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
            }

            honeycomb-menu-item {
                position: absolute;
                inset: 0;
                width: 100%;
                box-sizing: border-box;
            }
        `;
    }

    set hass(obj)
    {
        const oldHass = this._hass;
        this._hass = obj;
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
            center_button: {}
        });

        if( ! next.entity )
            throw new Error('Honeycomb Persistent Control requires an entity.');

        this.config = next;
        this.size = Number(next.size) || 72;

        provideHass(this);
        this.requestUpdate();
    }

    getCardSize()
    {
        return 1;
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
                hold_action: holdAction || { action: 'none' }
            },
            this.config.center_button || {}
        );
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();

        if( ! centerConfig )
            return html``;

        return html`
            <div
                class="persistent-center"
                style="--honeycomb-persistent-size: ${this.size}px;"
            >
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
