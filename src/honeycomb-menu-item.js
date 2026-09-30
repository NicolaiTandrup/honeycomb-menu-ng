import { LitElement, html, css } from 'lit';
import { objectEvalTemplate, getTemplateOrValue, stringToBool, provideHass, createCard } from "./helpers.js";

const merge = require('lodash/merge');
const assign = require('lodash/assign');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');

class HoneycombMenuItem extends LitElement
{
    static get is()
    {
        return 'honeycomb-menu-item';
    }

    static get properties()
    {
        return {
            hass: { type: Object },
            config: { type: Object },
            variables: { type: Object },
            size: { type: Number },
            color: { type: String },
            icon: { type: String },
            action: { type: Object },
            disabled: {
                type: Boolean,
                reflect: true,
                attribute: true
            },
            audio: { type: Boolean },
            autoclose: { type: Boolean },
            active: {
                type: Boolean,
                reflect: true,
                attribute: true
            }
        };
    }

    set hass(obj)
    {
        this._hass = obj;
        this._computeIsActive();

        // Keep the wrapped Lovelace card on the newest HA state.
        if( this._card )
            this._card.hass = obj;
    }

    get hass()
    {
        return this._hass;
    }

    set config(config)
    {
        if( config.type == 'break' || isEmpty(config) || config.disabled )
        {
            this.disabled = true;
            return;
        }

        this.disabled = false;

        // Work on a private copy so parsed actions never mutate the source config.
        this._config = assign({
            autoclose: true,
            audio: false,
            active: false,
            variables: {},
        }, merge({}, config));

        if( isString(this._config.tap_action) )
            this._config.tap_action = { action: this._config.tap_action };
        if( isString(this._config.hold_action) )
            this._config.hold_action = { action: this._config.hold_action };
        if( isString(this._config.double_tap_action) )
            this._config.double_tap_action = { action: this._config.double_tap_action };

        if( ! this._config.active )
            this.style.setProperty('--paper-item-icon-active-color', 'var(--paper-item-icon-color)');

        this._parseTemplates();
        this._computeIsActive();

        // Existing wrapped button-card must receive the refreshed, re-evaluated
        // action configuration while the Honeycomb remains open.
        if( this._card )
            this._updateLovelaceCard();
    }

    get config()
    {
        return this._config;
    }

    static get styles()
    {
        return css`
            :host([active]) {
                --ha-card-background: var(--ha-card-active-background);
                --paper-item-icon-color: var(--paper-item-icon-active-color);
            }
            .honey {
                list-style-type: none;
                position: relative;
                display: inline-block;
                width: 100%;
                padding: 0 0 var(--temp, 114.76%) 0;
                transform: rotate(-60deg) skewY(30deg);
                overflow: hidden;
                visibility: hidden;
                z-index: 100;
            }
            .comb {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                transform: skewY(-30deg) rotate(60deg);
                overflow: hidden;
                background: #000;
            }
            .comb * {
                visibility: visible;
            }
            #item {
                pointer-events: all;
                height: 100%;
            }
            #item > * {
                height: 100%;
            }
            :host([disabled]) #item {
                background: var(--honeycomb-menu-disabled, #9a9a9a6e);
            }
        `;
    }

    render()
    {
        return html`
            <div class="honeycomb">
                <div class="honey">
                    <div class="comb">
                        <div id="item"></div>
                    </div>
                </div>
            </div>`;
    }

    _computeIsActive()
    {
        if( ! this.config || ! this.hass )
            return;

        if( typeof this.config.active == 'boolean' )
        {
            this.active = this.config.active &&
                this.hass.states[this.config.entity] &&
                this.hass.states[this.config.entity].state == 'on';
        }

        if( typeof this.config.active == 'string' )
        {
            this.active = stringToBool(
                getTemplateOrValue(
                    this.hass,
                    this.hass.states[this.config.entity],
                    this.config.variables,
                    this.config.active
                )
            );
        }
    }

    firstUpdated()
    {
        if( ! this.disabled )
        {
            this._card = this._createLovelaceCard();
            this.shadowRoot.querySelector('#item').append(this._card);
        }
    }

    _parseTemplates()
    {
        if( ! this.hass || ! this.config )
            return;

        this.config.entity = getTemplateOrValue(
            this.hass,
            null,
            this.config.variables,
            this.config.entity
        );

        for( let key in this.config )
        {
            if( ['tap_action', 'hold_action', 'double_tap_action'].indexOf(key) > -1 )
            {
                if( 'honeycomb_menu' in this.config[key] )
                {
                    if( this.config.variables )
                    {
                        this.config[key].honeycomb_menu.variables = {
                            ...this.config.variables,
                            ...this.config[key].honeycomb_menu.variables
                        };
                    }
                    continue;
                }

                this.config[key] = objectEvalTemplate(
                    this.hass,
                    this.hass.states[this.config.entity],
                    this.config.variables,
                    this.config[key]
                );
            }
        }
    }

    _buildLovelaceCardConfig()
    {
        const config = merge({}, this.config);

        if( ! config.type || config.type == 'custom:button-card' )
        {
            if( ! config.styles )
                config.styles = {};

            if( ! Array.isArray(config.styles.card) )
                config.styles.card = [];

            config.styles.card.push({
                height: '100%',
                position: 'fixed',
                padding: '0'
            });
        }

        return merge({}, {
            type: 'custom:button-card',
            size: '30px',
            show_name: false
        }, config);
    }

    _updateLovelaceCard()
    {
        if( ! this._card )
            return;

        const cardConfig = this._buildLovelaceCardConfig();

        if( typeof this._card.setConfig === 'function' )
            this._card.setConfig(cardConfig);

        this._card.hass = this.hass;
    }

    _createLovelaceCard()
    {
        const card = createCard(this._buildLovelaceCardConfig());
        provideHass(card);
        card.hass = this.hass;

        card.addEventListener('action', e => {
            e.detail.item = this;
            e.detail.autoclose = this.config.autoclose;
            e.detail.audio = this.config.audio;
        });

        return card;
    }
};

customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
