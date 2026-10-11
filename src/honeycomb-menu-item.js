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
        const oldHass = this._hass;
        this._hass = obj;
        this._computeIsActive();

        // Keep the wrapped Lovelace card on the newest HA state.
        if( this._card )
            this._card.hass = obj;

        this.requestUpdate('hass', oldHass);
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

        // Always keep a private copy. Never mutate the source menu config.
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
                background: var(--honeycomb-menu-item-shell-background, #000);
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

            .bee-overlay {
                position: absolute;
                z-index: 4;
                top: 15%;
                left: 50%;
                width: 34%;
                height: 34%;
                transform: translateX(-50%);
                pointer-events: none;
            }

            .bee-overlay svg {
                width: 100%;
                height: 100%;
                overflow: visible;
            }

            .bee-overlay .bee-wing-left,
            .bee-overlay .bee-wing-right {
                transform-box: fill-box;
                transform-origin: center;
            }

            .bee-overlay.flap .bee-wing-left {
                animation: honeycomb-item-wing-left 130ms ease-in-out 0s 3 alternate;
            }

            .bee-overlay.flap .bee-wing-right {
                animation: honeycomb-item-wing-right 130ms ease-in-out 0s 3 alternate;
            }

            @keyframes honeycomb-item-wing-left {
                from { transform: rotate(0deg); }
                to { transform: rotate(-24deg); }
            }

            @keyframes honeycomb-item-wing-right {
                from { transform: rotate(0deg); }
                to { transform: rotate(24deg); }
            }
            :host([disabled]) #item {
                background: var(--honeycomb-menu-disabled, #9a9a9a6e);
            }
        `;
    }

    render()
    {
        const bee = this.config && this.config.icon === 'honeycomb:bee';

        return html`
            <div class="honeycomb">
                <div class="honey">
                    <div class="comb">
                        <div id="item"></div>
                        ${bee ? html`
                            <div class="bee-overlay ${this._beeFlapping ? 'flap' : ''}">
                                <svg viewBox="0 0 80 72" aria-hidden="true">
                                    <path class="bee-wing-left"
                                          d="M35 27 C24 10,8 13,10 29 C11 40,24 42,36 34 Z"
                                          fill="#fff8d8" stroke="#17191c" stroke-width="3.2"></path>
                                    <path class="bee-wing-right"
                                          d="M45 27 C56 10,72 13,70 29 C69 40,56 42,44 34 Z"
                                          fill="#fff8d8" stroke="#17191c" stroke-width="3.2"></path>
                                    <ellipse cx="40" cy="39" rx="18" ry="23"
                                             fill="#ffc400" stroke="#17191c" stroke-width="3.4"></ellipse>
                                    <path d="M24 32 C30 35,50 35,56 32"
                                          fill="none" stroke="#17191c" stroke-width="5" stroke-linecap="round"></path>
                                    <path d="M23 43 C31 47,49 47,57 43"
                                          fill="none" stroke="#17191c" stroke-width="5" stroke-linecap="round"></path>
                                    <circle cx="40" cy="20" r="12"
                                            fill="#ffc400" stroke="#17191c" stroke-width="3.4"></circle>
                                    <circle cx="36" cy="18" r="1.9" fill="#17191c"></circle>
                                    <circle cx="44" cy="18" r="1.9" fill="#17191c"></circle>
                                    <path d="M35 23 Q40 27 45 23"
                                          fill="none" stroke="#17191c" stroke-width="2.4" stroke-linecap="round"></path>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>`;
    }

    _flapBee()
    {
        if( ! this.config || this.config.icon !== 'honeycomb:bee' )
            return;

        this._beeFlapping = false;
        this.requestUpdate();

        requestAnimationFrame(() => {
            this._beeFlapping = true;
            this.requestUpdate();

            setTimeout(() => {
                this._beeFlapping = false;
                this.requestUpdate();
            }, 430);
        });
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

    _containsButtonCardTemplate(value)
    {
        if( isString(value) )
        {
            const trimmed = value.trim();
            return trimmed.startsWith('[[[') && trimmed.endsWith(']]]');
        }

        if( Array.isArray(value) )
            return value.some(v => this._containsButtonCardTemplate(v));

        if( value && typeof value === 'object' )
            return Object.values(value).some(v => this._containsButtonCardTemplate(v));

        return false;
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
            if( ['tap_action', 'hold_action', 'double_tap_action'].indexOf(key) === -1 )
                continue;

            const actionConfig = this.config[key];

            if( ! actionConfig )
                continue;

            if( 'honeycomb_menu' in actionConfig )
            {
                if( this.config.variables )
                {
                    actionConfig.honeycomb_menu.variables = {
                        ...this.config.variables,
                        ...actionConfig.honeycomb_menu.variables
                    };
                }
                continue;
            }

            // v0.7.5:
            // Preserve custom:button-card JS templates such as:
            //   temperature: >
            //     [[[ return states['climate.x'].attributes.temperature + 0.5; ]]]
            //
            // Previously Honeycomb evaluated these once when the menu opened,
            // freezing the value for every later click. Passing them through
            // untouched lets button-card evaluate them against the current hass
            // state for every render/action.
            if( this._containsButtonCardTemplate(actionConfig) )
                continue;

            // Preserve existing Honeycomb template behaviour for legacy action
            // configs that do not contain button-card [[[ ... ]]] templates.
            this.config[key] = objectEvalTemplate(
                this.hass,
                this.hass.states[this.config.entity],
                this.config.variables,
                actionConfig
            );
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
                position: config._inline_hub ? 'absolute' : 'fixed',
                inset: config._inline_hub ? '0' : undefined,
                width: config._inline_hub ? '100%' : undefined,
                padding: '0'
            });

            delete config._inline_hub;

            if( config.icon === 'honeycomb:bee' )
            {
                config.show_icon = false;
                delete config.icon;
            }
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
            this._flapBee();
            e.detail.item = this;
            e.detail.autoclose = this.config.autoclose;
            e.detail.audio = this.config.audio;
        });

        return card;
    }
};

customElements.define(HoneycombMenuItem.is, HoneycombMenuItem);
