import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, stringToBool, fireEvent, lovelace_view, provideHass, honeycomb_menu_templates } from "./helpers.js";

const hass = document.querySelector('home-assistant').hass;

const merge = require('lodash/merge');
const omit = require('lodash/omit');
const split = require('lodash/split');
const clamp = require('lodash/clamp');
const _template = require('lodash/template');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');
const _defaults = require('lodash/defaults');

const manager = new function() {
    this.honeycomb = null;
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);
};

window.honeycomb_menu = (config) => {
    var honeycombConfig = traverseConfigs( config );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    showHoneycombMenu( honeycombConfig );
};

document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);

document.body.addEventListener("ll-custom", e => {
    if(e.detail.honeycomb_menu)
    {
        window.honeycomb_menu( e.detail.honeycomb_menu );
    }
});

function showHoneycombMenu( _config )
{
    if( manager.honeycomb )
        manager.honeycomb.close();

    manager.honeycomb = document.createElement('honeycomb-menu');
    manager.honeycomb.setConfig( _config );
    manager.honeycomb.display( lovelace_view(), manager.position.x, manager.position.y );
    manager.honeycomb.addEventListener('closing', e => {
        manager.honeycomb = null;
    });
}

function traverseConfigs( _config, _buttons )
{
    if( ! _buttons )
    {
        _buttons = [];
    }

    function bindButtons( _cfg )
    {
        if( _cfg.buttons )
        {
            _cfg.buttons.forEach( (b, i) => {
                let slot;

                if( b.slot !== undefined )
                    slot = Number(b.slot) - 1;
                else if( b.position !== undefined )
                    slot = Number(b.position);
                else
                    slot = i;

                // Support physical slots 1-18 / legacy positions 0-17
                if( ! Number.isInteger(slot) || slot < 0 || slot > 17 )
                    return;

                if( ! _buttons[slot] )
                    _buttons[slot] = [];

                _buttons[slot].unshift(b);
            });
        }

        return { buttons: _buttons };
    }

    _config = merge({}, _config );

    const honeycomb_templates = honeycomb_menu_templates();
    if( ! _config.template || ! honeycomb_templates || ! honeycomb_templates[_config.template] )
        return Object.assign({}, _config, bindButtons( _config ));

    let parentConfig = traverseConfigs( honeycomb_templates[_config.template], _buttons );

    delete _config.template;

    return Object.assign({}, parentConfig, _config, bindButtons( _config ));
}

class HoneycombMenu extends LitElement
{
    static get is()
    {
        return 'honeycomb-menu';
    }

    static get properties()
    {
        return {
            hass: {
                type: Object
            },
            config: {
                type: Object
            },
            sizes: {
                type: Object,
                readonly: true
            },
            variables: {
                type: Object
            },
            closing: {
                type: Boolean,
                attribute: true,
                reflect: true
            },
            view: {},
            buttons: {
                type: Array
            },
            _service: {
                type: Object
            }
        }
    }

    constructor()
    {
        super();

        this.closing = false;
        this.buttons = [];
        this._rings = {
            inner: true,
            outer: false
        };
        this._service = {
            x: false,
            y: false
        };
    }

    static get styles()
    {
        return css`
            @keyframes fadeIn { from {opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes zoomIn {
            from {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }
            50% {
                opacity: 1;
            }
            }
            @keyframes zoomOut {
            from {
                opacity: 1;
            }

            50% {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }

            to {
                opacity: 0;
            }
            }

            @keyframes bounceOut {
            20% {
                -webkit-transform: scale3d(0.9, 0.9, 0.9);
                transform: scale3d(0.9, 0.9, 0.9);
            }

            50%,
            55% {
                opacity: 1;
                -webkit-transform: scale3d(1.1, 1.1, 1.1);
                transform: scale3d(1.1, 1.1, 1.1);
            }

            to {
                opacity: 0;
                -webkit-transform: scale3d(0.3, 0.3, 0.3);
                transform: scale3d(0.3, 0.3, 0.3);
            }
            }

            :host {
                position: absolute;
                z-index: 8;
            }
            :host([closing]), :host([closing]) * {
                pointer-events: none !important;
            }
            .shade {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.47);

                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: fadeIn;
            }
            :host([closing]) .shade {
                animation-name: fadeOut;
                animation-duration: 500ms;
            }
            .honeycombs {
                --filter-color: rgba(0, 0, 0, 0.76);
                filter: drop-shadow(2px 4px 3px var(--filter-color) );
                width: var(--container-width);
                height: var(--container-height);
                pointer-events: none;
            }
            honeycomb-menu-item {
                position: absolute;
                pointer-events: all;
                box-sizing: border-box;
                width: var(--item-size);
                padding: var(--spacing);
            }
            honeycomb-menu-item.center-item {
                z-index: 2;
            }
            honeycomb-menu-item, xy-pad {
                animation-duration: 0.5s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item, :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-duration: 0.75s;
                animation-name: bounceOut;
            }
            xy-pad {
                width: var(--container-width);
                height: var(--container-height);
            }`;
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();
        const centerPos = this._computeCenterPosition();

        return html`
            <div id="shade" class="shade" @click=${this._handleShadeClick}></div>

            ${(this.config.xy_pad) ? html`
                <xy-pad
                    style="animation-delay: ${this._computeAnimateDelay(1)};"
                    .hass=${this.hass}
                    .config=${this.config.xy_pad}
                    .size=${this._computeXYPadSize()}
                    .clampX=${this._computeXYPadClamp()}
                    .clampY=${this._computeXYPadClamp()}
                    @drag=${this._handleXYPad}
                    @drag-interval=${this._handleXYPad}
                    @drag-end=${this._handleXYPad}>
                </xy-pad>`:''}

            <div id="honeycombs" class="honeycombs">
                ${centerConfig ? html`
                    <honeycomb-menu-item
                        class="center-item"
                        style="
                            animation-delay: ${this._computeAnimateDelay(0)};
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                        "
                        .hass=${this.hass}
                        .config=${centerConfig}
                        @action=${this._handleItemAction}>
                    </honeycomb-menu-item>
                ` : ''}

                ${this.buttons.map((v, i) => {
                    if( v === undefined )
                        return '';

                    const pos = this._computeButtonPosition(i);

                    if( ! pos )
                        return '';

                    return html`
                        <honeycomb-menu-item
                            style="
                                animation-delay: ${this._computeAnimateDelay(i + 1)};
                                left: calc(var(--item-size) * ${pos.x});
                                top: calc(var(--item-size) * ${pos.y});
                            "
                            .hass=${this.hass}
                            .config=${this._computeItemConfig(v)}
                            @action=${this._handleItemAction}>
                        </honeycomb-menu-item>
                    `;
                })}
            </div>`;
    }

    setConfig( config )
    {
        provideHass(this);

        _defaults(config, {
            action: 'hold',
            entity: null,
            active: false,
            autoclose: true,
            audio: false,
            variables: {},
            size: 225,
            spacing: 2,
            animation_speed: 100,
            button_defaults: {},
            empty_slots: 'visible',
            center_button: {}
        });
        this.config = config;

        // Resolve the buttons first because the active ring(s) determine size.
        this._assignButtons();

        let itemSize = this.config.size / 3.586;
        let outerRing = this._hasOuterRing();

        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * (outerRing ? 5 : 3),
            containerHeight: itemSize * (outerRing ? 4.63 : 2.9)
        };

        if( this.config.xy_pad )
        {
            if( this.config.xy_pad["x"] ) {
                this.config.xy_pad["x"].data = this.config.xy_pad["x"].data || this.config.xy_pad["x"].service_data;
            }
            if( this.config.xy_pad["y"] ) {
                this.config.xy_pad["y"].data = this.config.xy_pad["y"].data || this.config.xy_pad["y"].service_data;
            }
        }
    }

    display(_view, _x, _y)
    {
        this.view = _view;
        this.view.style.position = 'relative';

        this.view.append( this );

        this._setPosition( _x, _y );
    }

    firstUpdated()
    {
        this._setCssVars();
    }

    close( _item = null )
    {
        if( this.closing )
            return;

        this.closing = true;

        const items = this.shadowRoot.querySelectorAll('honeycomb-menu-item');
        let ele = _item || items[items.length - 1];

        if( _item )
        {
            _item.setAttribute('selected', '');
            _item.style.animationDelay = this._computeAnimateDelay(3);
        }

        fireEvent(this, 'closing', { item: _item });

        const shade = this.shadowRoot.querySelector('#shade');
        if( shade )
        {
            shade.addEventListener('animationend', function(e) {
                this.remove();
            });
        }

        if( ele )
        {
            ele.addEventListener('animationend', e => {
                this.remove();
                fireEvent(this, 'closed', { item: _item });
            });
        }
        else
        {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
        }
    }

    _assignButtons()
    {
        const resolved = [];

        for( let i = 0; i < this.config.buttons.length; i++ )
        {
            const stack = this.config.buttons[i];

            if( ! stack )
                continue;

            let button = {};

            for( let b of stack )
            {
                if( b.show !== undefined )
                {
                    b.show = stringToBool(
                        getTemplateOrValue(
                            this.hass,
                            this.hass.states[this.config.entity],
                            this.config.variables,
                            b.show
                        )
                    );
                }
                else if( b != 'break' && b != 'skip' )
                {
                    b.show = true;
                }

                if( b != 'break' && (! b.show || b == 'skip') )
                    continue;

                button = b;
                break;
            }

            if( button == 'break' )
                button = {};

            if( ! isEmpty(button) )
            {
                resolved.push({
                    button: merge({}, button),
                    sourceIndex: i
                });
            }
        }

        const assigned = new Array(18);
        const explicit = [];
        const automatic = [];

        resolved.forEach(entry => {
            const button = entry.button;
            let target = null;

            if( button.slot !== undefined )
                target = Number(button.slot) - 1;
            else if( button.position !== undefined )
                target = Number(button.position);

            if( Number.isInteger(target) && target >= 0 && target <= 17 )
                explicit.push({ ...entry, target });
            else
                automatic.push(entry);
        });

        // Explicit slots are physical positions in this phase.
        // Soft/hard slot behaviour will be added in the next phase.
        explicit.forEach(entry => {
            if( assigned[entry.target] === undefined )
            {
                assigned[entry.target] = entry.button;
            }
            else
            {
                console.warn(
                    `[Honeycomb Menu NG] Slot ${entry.target + 1} is already occupied. Ignoring duplicate explicit slot.`
                );
            }
        });

        const totalCount = resolved.length;
        let autoPool;

        if( totalCount <= 6 )
        {
            // 1-6 buttons: inner ring only.
            autoPool = [0, 1, 2, 3, 4, 5];
        }
        else if( totalCount <= 12 )
        {
            // 7-12 buttons: outer ring only.
            autoPool = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        }
        else
        {
            // 13-18 buttons: inner ring first, then outer ring.
            autoPool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        }

        automatic.forEach(entry => {
            let target = autoPool.find(index => assigned[index] === undefined);

            // If explicit slots consumed the automatic pool, use the first
            // remaining physical slot rather than dropping a button.
            if( target === undefined )
                target = assigned.findIndex(value => value === undefined);

            if( target !== -1 && target !== undefined )
                assigned[target] = entry.button;
        });

        const hasInner = assigned.slice(0, 6).some(button => button !== undefined);
        const hasOuter = assigned.slice(6, 18).some(button => button !== undefined);

        this._rings = {
            inner: hasInner || (! hasOuter && totalCount === 0),
            outer: hasOuter
        };

        const showEmptySlots = this.config.empty_slots !== 'hidden';

        if( showEmptySlots )
        {
            if( this._rings.inner )
            {
                for( let i = 0; i < 6; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }

            if( this._rings.outer )
            {
                for( let i = 6; i < 18; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }
        }

        this.buttons = assigned;
    }

    _setPosition( _x, _y )
    {
        let container = {
            w: ( this.sizes.containerWidth / 2 ),
            h: ( this.sizes.containerHeight / 2 )
        };

        let bounds =  {
            min: {
                x: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-left') ) + container.w,
                y: parseFloat( window.getComputedStyle(this.view, null).getPropertyValue('padding-top') ) + container.h
            },
            max: {
                x: this.view.clientWidth - container.w,
                y: this.view.clientHeight - container.h
            }
        };

        let rect = this.view.getBoundingClientRect();
        _x = clamp( _x - rect.left, bounds.min.x, bounds.max.x - 5 );
        _y = clamp( _y - rect.top, bounds.min.y, bounds.max.y - 5 );

        this.style.left = `${_x - container.w}px`;
        this.style.top = `${_y - container.h}px`;
    }

    _setCssVarProperty(orig_property, var_property)
    {
        this.shadowRoot.querySelector('#honeycombs').style.setProperty(orig_property, `var(${var_property}, ${this.view.style.getPropertyValue(orig_property)})`, "important");
    }

    _setCssVars()
    {
        this.style.setProperty('--item-size', `${this.sizes.item}px` );
        this.style.setProperty('--container-width', `${this.sizes.containerWidth}px`);
        this.style.setProperty('--container-height', `${this.sizes.containerHeight}px`);

        this.style.setProperty('--spacing', `${this.config.spacing}px`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.stopPropagation();
        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        this._playButtonSound( e.detail.item );

        if( e.detail.autoclose )
            this.close(e.detail.item);
    }

    _playButtonSound( _item )
    {
        if( ! isString(_item.config.audio) )
            return;

        let audio_ele = document.querySelector('#honeycomb-audio');
        if( ! audio_ele )
        {
            audio_ele = document.createElement('audio');
            audio_ele.id = 'honeycomb-audio';
            document.querySelector("home-assistant").append(audio_ele);
        }
        audio_ele.src = _item.config.audio;
        audio_ele.play();
    }

    _handleXYPad(e)
    {
        if( (this.config.xy_pad.on_release && e.type != 'drag-end') ||
            (this.config.xy_pad.repeat && e.type != 'drag-interval')
        ) return;

        ['x', 'y'].forEach( axis => {
            let config = this.config.xy_pad[axis];

            if( e.detail[axis] == 0 || ! config || ! config.service || this._service[axis] )
                return;

            this._service[axis] = true;
            let service = split( config.service, '.', 2);
            this.hass
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], { ...this.config.variables, ...vars }, data, (val) => {
            if( val == 'entity' )
                return this.config.entity;
            return _template(val, {interpolate: /{{([\s\S]+?)}}/g})(vars);
        });
    }

    _computeXYPadSize()
    {
        return this.config.size / 6;
    }

    _computeXYPadClamp()
    {
        return this.config.size / 3;
    }

    _computeItemSize()
    {
        return this.config.size / 3;
    }

    _computeItemConfig( item )
    {
        if( isEmpty(item) )
            return item;

        return omit(
            merge(
                {},
                this.config,
                this.config.button_defaults || {},
                item
            ),
            [
                'buttons',
                'size',
                'action',
                'xy_pad',
                'spacing',
                'button_defaults',
                'empty_slots',
                'center_button',
                'slot',
                'slot_mode'
            ]
        );
    }

    _computeCenterConfig()
    {
        if( this.config.center_button === false )
            return null;

        const center = merge(
            {},
            {
                entity: this.config.entity,
                active: this.config.active,
                autoclose: true,
                tap_action: {
                    action: 'more-info'
                }
            },
            this.config.center_button || {}
        );

        return this._computeItemConfig(center);
    }

    _computeCenterPosition()
    {
        if( this._hasOuterRing() )
        {
            return {
                x: 2,
                y: 1.73
            };
        }

        return {
            x: 1,
            y: 0.865
        };
    }

    _hasInnerRing()
    {
        return this._rings && this._rings.inner;
    }

    _hasOuterRing()
    {
        return this._rings && this._rings.outer;
    }

    _computeButtonPosition( slot )
    {
        const innerRing = [
            { x: 0,   y: 0.865 }, // 1 - left
            { x: 0.5, y: 0 },     // 2 - upper left
            { x: 1.5, y: 0 },     // 3 - upper right
            { x: 2,   y: 0.865 }, // 4 - right
            { x: 1.5, y: 1.725 }, // 5 - lower right
            { x: 0.5, y: 1.725 }  // 6 - lower left
        ];

        const outerRing = [
            { x: -1,   y: 0.865 }, // 7  - left
            { x: -0.5, y: 0 },     // 8  - upper-left outer
            { x: 0,    y: -0.865 },// 9  - upper-left top
            { x: 1,    y: -0.865 },// 10 - top-left
            { x: 2,    y: -0.865 },// 11 - top-right
            { x: 2.5,  y: 0 },     // 12 - upper-right outer
            { x: 3,    y: 0.865 }, // 13 - right
            { x: 2.5,  y: 1.725 }, // 14 - lower-right outer
            { x: 2,    y: 2.59 },  // 15 - lower-right bottom
            { x: 1,    y: 2.59 },  // 16 - bottom-right
            { x: 0,    y: 2.59 },  // 17 - bottom-left
            { x: -0.5, y: 1.725 }  // 18 - lower-left outer
        ];

        let position;

        if( slot < 6 )
        {
            if( ! this._hasInnerRing() )
                return null;

            position = innerRing[slot];
        }
        else
        {
            if( ! this._hasOuterRing() )
                return null;

            position = outerRing[slot - 6];
        }

        if( ! position )
            return null;

        if( this._hasOuterRing() )
        {
            return {
                x: position.x + 1,
                y: position.y + 0.865
            };
        }

        return position;
    }

    _computeAnimateDelay( i )
    {
        return this.config.animation_speed * i + 'ms';
    }
}

customElements.define(HoneycombMenu.is, HoneycombMenu);
