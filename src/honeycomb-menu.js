import { LitElement, html, css } from 'lit';
import { dispatchCubeAction } from './cube-actions.js';
import "./honeycomb-menu-item.js";
import "./honeycomb-persistent-control.js";
import "./honeycomb-persistent-hub.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, stringToBool, fireEvent, lovelace_view, provideHass, honeycomb_menu_templates, isButtonVisible } from "./helpers.js";

const hass = document.querySelector('home-assistant').hass;

const merge = require('lodash/merge');
const omit = require('lodash/omit');
const split = require('lodash/split');
const clamp = require('lodash/clamp');
const _template = require('lodash/template');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');
const _defaults = require('lodash/defaults');

const navigationCore = require('./core/navigation-context.js');
const layoutCore = require('./core/layout.js');
const { allocateHubItems } = require('./core/hub-items.js');
const { toCenterDescriptor } = require('./core/hub-launcher.js');
const { menuCubeWidth, MENU_EXTENT_FACTOR } = require('./core/cube-metrics.js');
const { resolveButtons, allocateButtons } = require('./core/slot-allocation.js');
const { applyEntityInheritance } = require('./core/entity-inheritance.js');
const { applyPresetControls } = require('./modules/light/controls.js');

// Register built-in domain modules and their custom actions.
require('./modules/index.js');

const manager = new function() {
    this.honeycomb = null;
    this.stack = [];
    this.currentConfig = null;
    this.pointerDown = false;
    this.pointerId = null;
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);

    this.handlePointerDown = function(e) {
        this.pointerDown = true;
        this.pointerId = e.pointerId;
        this.position.x = e.clientX;
        this.position.y = e.clientY;
    }.bind(this);

    this.handlePointerUp = function(e) {
        if( this.pointerId === null || e.pointerId === this.pointerId )
        {
            this.pointerDown = false;
            this.pointerId = null;
        }
    }.bind(this);
};

function openHoneycombMenu(context, config, owner = null)
{
    var honeycombConfig = traverseConfigs( config );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    applyPresetControls(honeycombConfig, honeycombConfig.presets || {}, honeycombConfig.entity);
    applyEntityInheritance(honeycombConfig, honeycombConfig.entity);

    // If a menu is already open, treat a newly opened menu as a nested menu.
    // nested_expand keeps the current Honeycomb element alive and only updates
    // its config, so existing inner-ring buttons do not animate out/in again.
    const nested = !! context.honeycomb && !! context.currentConfig;

    if( nested && honeycombConfig.nested_expand === true )
    {
        // Use the resolved live base (including a dynamically allocated Hub
        // center), rather than its unresolved configuration snapshot.
        const current = merge({}, context.honeycomb.config || context.currentConfig || {});

        // Core owns the only legal anchor transition:
        // Hub base -> selected module. Every deeper level reuses that anchor.
        navigationCore.enterNested(context, current, honeycombConfig);

        // Expanding changes content, never the owning overlay's physical size
        // or anchor. Local Hub promotion is the one deliberate exception.
        if (!navigationCore.isHubRoot(current)) {
            honeycombConfig.anchor_x = context.honeycomb._anchorX;
            honeycombConfig.anchor_y = context.honeycomb._anchorY;
        }
        honeycombConfig.position_mode = current.position_mode || 'anchored';
        honeycombConfig.size = current.size;
        honeycombConfig.cube_size = current.cube_size;
        if (honeycombConfig.layout_envelope === undefined)
            honeycombConfig.layout_envelope = current.layout_envelope;

        context.stack.push({
            __honeycomb_stack_entry: true,
            config: merge({}, current),
            inPlace: true,
            owner: owner ? merge({}, owner) : null
        });

        // Optional expansion mode used by palettes and similar controls:
        // keep the currently visible inner ring and add the nested menu to the
        // outer physical slots. The nested menu remains generic and can still
        // override any of the inherited buttons explicitly.
        if( honeycombConfig.inherit_inner === true && context.honeycomb )
        {
            const combined = new Array(18);
            const currentButtons = context.honeycomb.buttons || [];

            for( let i = 0; i < 6; i++ )
            {
                const button = currentButtons[i];

                if( button && ! isEmpty(button) )
                {
                    combined[i] = [
                        // Preserve what was rendered, including the parent's
                        // button_defaults. New nested buttons keep their own
                        // defaults; copying the raw button loses inherited fill.
                        merge({}, context.honeycomb._computeItemConfig(button), {
                            slot: i + 1,
                            slot_mode: 'hard'
                        })
                    ];
                }
            }

            const nestedButtons = honeycombConfig.buttons || [];

            nestedButtons.forEach((stack, index) => {
                if( ! stack )
                    return;

                let target = 6 + index;

                if( target > 17 )
                    return;

                combined[target] = Array.isArray(stack)
                    ? stack.map(button => merge({}, button))
                    : [merge({}, stack)];
            });

            honeycombConfig.buttons = combined;
            honeycombConfig.empty_slots = 'hidden';
        }

        // Persistent menus expand in-place around a real dashboard/floorplan
        // anchor. Preserve that context through nested menus so the screen does
        // not jump and the center keeps the same physical size and styling.
        if( current.persistent_center )
        {
            honeycombConfig.position_mode = current.position_mode || 'anchored';
            honeycombConfig.size = current.size;

            if( honeycombConfig.spacing === undefined && current.spacing !== undefined )
                honeycombConfig.spacing = current.spacing;

            if( honeycombConfig.idle_timeout === undefined && current.idle_timeout !== undefined )
                honeycombConfig.idle_timeout = current.idle_timeout;

            if( honeycombConfig.promote_to_center === true && honeycombConfig.promoted_center )
            {
                honeycombConfig.persistent_center = merge(
                    {},
                    honeycombConfig.promoted_center,
                    {
                        interactive: true,
                        tap_action: { action: 'honeycomb-back' },
                        size: current.persistent_center.size || honeycombConfig.promoted_center.size
                    }
                );
            }
            else
            {
                honeycombConfig.persistent_center = merge(
                    {},
                    current.persistent_center,
                    {
                        interactive: true,
                        icon: 'mdi:arrow-left',
                        tap_action: { action: 'honeycomb-back' }
                    }
                );
            }

            honeycombConfig.center_button = null;
        }

        context.currentConfig = merge({}, honeycombConfig);
        context.honeycomb.replaceConfig(honeycombConfig);

        if(
            Number.isFinite(Number(honeycombConfig.anchor_x)) &&
            Number.isFinite(Number(honeycombConfig.anchor_y)) &&
            typeof context.honeycomb.reanchor === 'function'
        )
        {
            context.honeycomb.reanchor(
                Number(honeycombConfig.anchor_x),
                Number(honeycombConfig.anchor_y)
            );
        }

        return context.honeycomb;
    }

    return showHoneycombMenu( honeycombConfig, { nested, context, owner } );
};


window.honeycomb_menu = (config, owner) => openHoneycombMenu(manager, config, owner);

window.honeycomb_menu_create_context = () =>
    navigationCore.createMenuContext({ local: true });

window.honeycomb_menu_in_context = (context, config, owner) => {
    if( ! context || typeof context !== 'object' )
        return openHoneycombMenu(manager, config);

    return openHoneycombMenu(context, config, owner);
};
document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);
document.addEventListener('pointerdown', manager.handlePointerDown, true);
document.addEventListener('pointerup', manager.handlePointerUp, true);
document.addEventListener('pointercancel', manager.handlePointerUp, true);

document.body.addEventListener("ll-custom", e => {
    if(e.detail.honeycomb_menu)
    {
        const nestedConfig = merge({}, e.detail.honeycomb_menu);
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const sourceMenu = path.find(node =>
            node &&
            node.tagName &&
            node.tagName.toLowerCase() === 'honeycomb-menu'
        );
        const context = sourceMenu && sourceMenu._menuContext
            ? sourceMenu._menuContext
            : manager;

        const mayMovePersistentCenter =
            navigationCore.canEstablishAnchor(context);

        if( nestedConfig.promote_to_center === true && mayMovePersistentCenter )
        {
            const sourceItem = path.find(node =>
                node &&
                node.tagName &&
                node.tagName.toLowerCase() === 'honeycomb-menu-item'
            );

            if( sourceItem && typeof sourceItem.getBoundingClientRect === 'function' )
            {
                const rect = sourceItem.getBoundingClientRect();

                nestedConfig.anchor_x = rect.left + (rect.width / 2);
                nestedConfig.anchor_y = rect.top + (rect.height / 2);
            }
        }

        const sourceItem = path.find(node => node && node.config &&
            ['HONEYCOMB-MENU-ITEM','HONEYCOMB-PERSISTENT-CONTROL'].includes(node.tagName));
        openHoneycombMenu(context, nestedConfig, sourceItem && sourceItem.config);
    }
});

function showHoneycombMenu( _config, options = {} )
{
    const context = options.context || manager;
    const previous = context.honeycomb;

    if( options.resetStack )
        context.stack = [];

    if( options.nested && context.currentConfig )
        context.stack.push({__honeycomb_stack_entry:true, config:merge({}, context.currentConfig),
            inPlace:false, owner:options.owner ? merge({}, options.owner) : null});

    if( previous )
        previous.close();

    const menu = document.createElement('honeycomb-menu');
    menu._menuContext = context;
    context.honeycomb = menu;
    context.currentConfig = merge({}, _config);

    menu.setConfig( _config );

    const anchorX = Number.isFinite(Number(_config.anchor_x))
        ? Number(_config.anchor_x)
        : manager.position.x;
    const anchorY = Number.isFinite(Number(_config.anchor_y))
        ? Number(_config.anchor_y)
        : manager.position.y;

    menu.display( lovelace_view(), anchorX, anchorY );
    menu.addEventListener('closing', e => {
        if( context.honeycomb === menu )
            context.honeycomb = null;
    });

    return menu;
}

function honeycombBack(context = manager)
{
    if( context.stack.length === 0 )
        return false;

    const previous = context.stack.pop();

    if( previous && previous.__honeycomb_stack_entry && previous.inPlace && context.honeycomb )
    {
        navigationCore.prepareBack(context, previous.config);

        context.currentConfig = merge({}, previous.config);
        context.honeycomb.replaceConfig(previous.config);

        if(
            Number.isFinite(Number(previous.config && previous.config.anchor_x)) &&
            Number.isFinite(Number(previous.config && previous.config.anchor_y)) &&
            typeof context.honeycomb.reanchor === 'function'
        )
        {
            context.honeycomb.reanchor(
                Number(previous.config.anchor_x),
                Number(previous.config.anchor_y)
            );
        }

        return true;
    }

    const previousConfig = previous && previous.__honeycomb_stack_entry
        ? previous.config
        : previous;

    navigationCore.prepareBack(context, previousConfig);
    showHoneycombMenu(previousConfig, { nested: false, context });
    return true;
}

function honeycombClose(context = manager)
{
    context.stack = [];
    context.currentConfig = null;
    navigationCore.resetNavigation(context);

    if( context.honeycomb )
        context.honeycomb.close();
}

function honeycombDispose(context = manager)
{
    const menu = context.honeycomb;

    context.stack = [];
    context.currentConfig = null;
    context.honeycomb = null;
    navigationCore.resetNavigation(context);

    if( ! menu )
        return;

    if( typeof menu.dispose === 'function' )
        menu.dispose();
    else if( menu.isConnected )
        menu.remove();
}

window.honeycomb_menu_back = () => honeycombBack(manager);
window.honeycomb_menu_close = () => honeycombClose(manager);
window.honeycomb_menu_context_back = context => honeycombBack(context || manager);
window.honeycomb_menu_context_close = context => honeycombClose(context || manager);
window.honeycomb_menu_context_dispose = context => honeycombDispose(context || manager);

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
                let storageIndex;

                // Legacy position keeps its original physical/index semantics
                // for backwards compatibility. New slot is resolved later by
                // the v0.4 soft/hard allocator, so keep it at list position here.
                if( b.position !== undefined )
                    storageIndex = Number(b.position);
                else
                    storageIndex = i;

                if( ! Number.isInteger(storageIndex) || storageIndex < 0 || storageIndex > 17 )
                    return;

                if( ! _buttons[storageIndex] )
                    _buttons[storageIndex] = [];

                _buttons[storageIndex].unshift(b);
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
            },
            _dragHoverSlot: {
                type: Number
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
        this._dragHoverSlot = -1;
        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._dragStartX = null;
        this._dragStartY = null;
        this._idleTimer = null;
        this._stateRefreshTimer = null;
        this._anchorX = null;
        this._anchorY = null;
        this._boundPointerMove = this._handleGlobalPointerMove.bind(this);
        this._boundPointerUp = this._handleGlobalPointerUp.bind(this);
        for( const name of ['action', 'hass-action', 'll-custom', 'click', 'mousedown', 'mouseup', 'touchend', 'pointerdown', 'pointerup'] )
            this.addEventListener(name, event => this._guardVisibilityAction(event), true);
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
            [hidden] { display: none !important; }
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
            /* Native cubes have no additional host padding. Layered wrapped
               faces use the same physical cell; legacy spacing stays intact. */
            honeycomb-menu-item[layered] { padding: 0; }
            honeycomb-menu-item.center-item,
            honeycomb-persistent-control.center-item {
                z-index: 2;
            }
            honeycomb-persistent-control.center-item,
            honeycomb-persistent-control.ring-item {
                position: absolute;
                width: var(--item-size);
                pointer-events: all;
                box-sizing: border-box;
            }
            honeycomb-menu-item.center-item.center-auto-style {
                filter: brightness(var(--honeycomb-center-brightness, 1.25));
            }
            honeycomb-menu-item.drag-hover {
                filter: brightness(1.18);
                transform: scale3d(1.08, 1.08, 1.08);
                z-index: 3;
            }
            honeycomb-menu-item.center-item.center-auto-style.drag-hover {
                filter: brightness(calc(var(--honeycomb-center-brightness, 1.25) * 1.18));
            }
            honeycomb-menu-item,
            honeycomb-persistent-control.ring-item,
            xy-pad {
                animation-duration: 0.5s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item,
            :host([closing]) honeycomb-persistent-control.ring-item,
            :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-duration: 0.75s;
                animation-name: bounceOut;
            }
            :host([no-animation]) honeycomb-menu-item,
            :host([no-animation]) honeycomb-persistent-control.ring-item,
            :host([no-animation]) xy-pad {
                animation: none !important;
                animation-delay: 0ms !important;
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
            ${this._menuContext && this._menuContext.local ? '' : html`
                <div id="shade" class="shade" @click=${this._handleShadeClick}></div>
            `}

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
                ${this.config.persistent_center ? html`
                    <honeycomb-persistent-control
                        class="center-item persistent-center-item"
                        ?hidden=${!this._isButtonVisible(this.config.persistent_center)}
                        style="
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                            --honeycomb-persistent-size: var(--item-size);
                        "
                        .hass=${this.hass}
                        .config=${this.config.persistent_center}
                        .size=${this.sizes.item}>
                    </honeycomb-persistent-control>
                ` : (centerConfig ? html`
                    <honeycomb-menu-item
                        class="center-item ${this._centerUseFilterFallback ? 'center-auto-style' : ''} ${this._dragHoverSlot === 18 ? 'drag-hover' : ''}"
                        data-honeycomb-slot="center"
                        ?hidden=${!this._isButtonVisible(centerConfig)}
                        @pointerenter=${() => this._setDragHoverSlot(18)}
                        @pointerleave=${() => this._clearDragHoverSlot(18)}
                        style="
                            animation-delay: ${this._computeAnimateDelay(0)};
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                        "
                        .hass=${this.hass}
                        .size=${this.sizes.item}
                        .config=${centerConfig}
                        @action=${this._handleItemAction}>
                    </honeycomb-menu-item>
                ` : '')}

                ${this.buttons.map((v, i) => {
                    if( v === undefined )
                        return '';

                    const pos = this._computeButtonPosition(i);

                    if( ! pos )
                        return '';

                    if( v && v._persistent_launcher === true )
                    {
                        const persistentConfig = this._computeItemConfig(v);

                        return html`
                            <honeycomb-persistent-control
                                class="ring-item"
                                data-honeycomb-slot="${i}"
                            ?hidden=${!this._isButtonVisible(v)}
                                style="
                                    animation-delay: ${this._computeButtonAnimateDelay(i)};
                                    left: calc(var(--item-size) * ${pos.x});
                                    top: calc(var(--item-size) * ${pos.y});
                                    --honeycomb-persistent-size: var(--item-size);
                                "
                                .hass=${this.hass}
                                .config=${persistentConfig}
                                .size=${this.sizes.item}>
                            </honeycomb-persistent-control>
                        `;
                    }

                    return html`
                        <honeycomb-menu-item
                            class="${this._dragHoverSlot === i ? 'drag-hover' : ''}"
                            data-honeycomb-slot="${i}"
                                ?hidden=${!this._isButtonVisible(v)}
                            @pointerenter=${() => this._setDragHoverSlot(i)}
                            @pointerleave=${() => this._clearDragHoverSlot(i)}
                            style="
                                animation-delay: ${this._computeButtonAnimateDelay(i)};
                                left: calc(var(--item-size) * ${pos.x});
                                top: calc(var(--item-size) * ${pos.y});
                            "
                            .hass=${this.hass}
                            .size=${this.sizes.item}
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
            animation_speed: 80,
            animation_mode: 'paired',
            animate: true,
            drag_select: true,
            drag_deadzone: 12,
            hover_highlight: true,
            nested_center_back: true,
            button_defaults: {},
            empty_slots: 'visible',
            center_button: {},
            center_brightness: 25,
            idle_timeout: 0,
            layout_envelope: 'auto',
            position_mode: 'viewport',
            persistent_center: null
        });
        this.config = config;
        this.toggleAttribute('no-animation', this.config.animate === false);

        // Resolve the buttons first because the active ring(s) determine size.
        this._assignButtons();

        // Reserve enough geometry for any reachable nested_expand submenu.
        // This prevents the current inner ring from being repositioned when an
        // outer-ring submenu is expanded in place later.
        this._layoutEnvelopeOuter = this._computeLayoutEnvelopeOuter(this.config);

        let itemSize = menuCubeWidth(this.config);
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

        if( this.config.position_mode === 'anchored' )
        {
            // Keep anchored menus in the Lovelace subtree so wrapped cards
            // retain the same Home Assistant action/event context as normal
            // Honeycomb menus. position:fixed keeps the overlay out of layout
            // flow, so it still cannot increase scrollable document height.
            this.style.position = 'fixed';
            this.view.append(this);
        }
        else
        {
            this.view.style.position = 'relative';
            this.view.append(this);
        }

        this._anchorX = _x;
        this._anchorY = _y;
        this._setPosition( _x, _y );

        // If the menu was opened from button-card press_action, the pointer is
        // still physically held down. Adopt that pointer so the same gesture
        // can continue directly into drag-select.
        if( this.config.drag_select && manager.pointerDown )
        {
            this._dragPointerId = manager.pointerId;
            this._dragStartX = manager.position.x;
            this._dragStartY = manager.position.y;
        }

        // Global pointer listeners make press-and-drag selection work even when
        // the pointer/touch started on the card that opened the menu.
        document.addEventListener('pointermove', this._boundPointerMove, true);
        document.addEventListener('pointerup', this._boundPointerUp, true);
        document.addEventListener('pointercancel', this._boundPointerUp, true);

        this._resetIdleTimeout();
        this._startStateRefresh();
    }

    replaceConfig(_config)
    {
        if( this.closing )
            return;

        this.setConfig(_config);
        this._setCssVars();

        if( this._anchorX !== null && this._anchorY !== null )
            this._setPosition(this._anchorX, this._anchorY);

        this._resetIdleTimeout();
        this.requestUpdate();
    }

    firstUpdated()
    {
        this._setCssVars();
    }

    dispose()
    {
        if( this._disposed )
            return;

        this._disposed = true;
        this.closing = true;

        this._clearIdleTimeout();
        this._stopStateRefresh();

        document.removeEventListener('pointermove', this._boundPointerMove, true);
        document.removeEventListener('pointerup', this._boundPointerUp, true);
        document.removeEventListener('pointercancel', this._boundPointerUp, true);

        // Lifecycle teardown (for example Lovelace edit mode) must be
        // synchronous. Waiting for CSS animationend leaves orphaned Hub
        // overlays behind after the owning card has already been replaced.
        if( this.isConnected )
            this.remove();
    }

    close( _item = null )
    {
        if( this.closing )
            return;

        this.closing = true;

        this._clearIdleTimeout();
        this._stopStateRefresh();

        document.removeEventListener('pointermove', this._boundPointerMove, true);
        document.removeEventListener('pointerup', this._boundPointerUp, true);
        document.removeEventListener('pointercancel', this._boundPointerUp, true);

        const items = Array.from(this.shadowRoot.querySelectorAll('honeycomb-menu-item'))
            .filter(item => !item.hidden && !item.disabled);
        let ele = _item || items[items.length - 1];

        if( _item )
        {
            _item.setAttribute('selected', '');
            _item.style.animationDelay = this._computeAnimateDelay(3);
        }

        fireEvent(this, 'closing', { item: _item });

        if (this.config.animate === false) {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
            return;
        }

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

    _isButtonVisible(button)
    {
        const root = document.querySelector('home-assistant');
        return isButtonVisible(button, root && root.hass || this.hass, {...this.config.variables, ...(button && button.variables)});
    }

    _assignButtons()
    {
        const isHub = this.config._persistent_hub_root;
        const allocated = isHub
            ? allocateHubItems(this.config._hub_items || [], button => this._isButtonVisible(button),
                {logo:this.config._hub_show_logo})
            : allocateButtons(resolveButtons(this.config.buttons, button => this._isButtonVisible(button)), this.config);
        let center = null;
        if (isHub) {
            center = toCenterDescriptor(null, allocated.center);
            const fallback = this.config._hub_show_logo || (!allocated.center && !allocated.buttons.some(Boolean));
            this.config.persistent_center = fallback ? this.config._hub_logo
                : center.kind === 'persistent' ? center.config : null;
            this.config.center_button = fallback || center.kind !== 'generic' ? false : center.config;
        }
        const signature = JSON.stringify([allocated.buttons, allocated.rings, center,
            isHub && this.config.persistent_center]);
        if( signature === this._allocationSignature )
            return false;
        this._allocationSignature = signature;
        this._rings = allocated.rings;
        this.buttons = allocated.buttons;
        const warnings = allocated.diagnostics.join(' ');
        if( warnings && warnings !== this._allocationWarnings )
            console.warn('[Honeycomb Menu NG] ' + warnings);
        this._allocationWarnings = warnings;
        return true;
    }

    _refreshVisibility()
    {
        if( manager.pointerDown || this._dragPointerId !== null || this._dragPointerActive )
        {
            this._visibilityPending = true;
            this.requestUpdate(); // Hide unsafe targets immediately, keep all positions.
            return;
        }
        this._visibilityPending = false;
        const context = this._menuContext || manager;
        const invalid = navigationCore.hiddenOwnerIndex(context, owner => this._isButtonVisible(owner));
        if (invalid !== -1) {
            while (context.stack.length > invalid) honeycombBack(context);
            if (context.honeycomb !== this) return;
        }
        if( !this._assignButtons() )
            return;
        this._layoutEnvelopeOuter = this._computeLayoutEnvelopeOuter(this.config);
        const itemSize = menuCubeWidth(this.config);
        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * (this._hasOuterRing() ? 5 : 3),
            containerHeight: itemSize * (this._hasOuterRing() ? 4.63 : 2.9)
        };
        if( this.view )
        {
            this._setCssVars();
            this._setPosition(this._anchorX, this._anchorY);
        }
        this.requestUpdate();
    }

    _guardVisibilityAction(event)
    {
        if( event.type === 'pointerdown' )
            this._suppressPointerTapUntil = 0;
        const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
        const item = path.find(node => node && node !== this && node.config &&
            ['HONEYCOMB-MENU-ITEM', 'HONEYCOMB-PERSISTENT-CONTROL'].includes(node.tagName));
        // Completing a drag dispatches one tap explicitly. Suppress the native
        // compatibility mouse/touch action which follows the same pointerup,
        // including when reflow has put a different card under the pointer.
        const duplicate = !this._dispatchingDragTap && performance.now() < (this._suppressPointerTapUntil || 0) &&
            ['click', 'mouseup', 'touchend', 'action', 'hass-action'].includes(event.type);
        if( item && (duplicate || item.disabled || item.config.disabled || !this._isButtonVisible(item.config)) )
        {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    reanchor(_x, _y)
    {
        const x = Number(_x);
        const y = Number(_y);

        if( ! Number.isFinite(x) || ! Number.isFinite(y) )
            return;

        // Live visibility reflow must use the current promoted center, not the
        // original coordinates from display().
        this._anchorX = x;
        this._anchorY = y;

        if( this.config )
        {
            this.config.anchor_x = x;
            this.config.anchor_y = y;
        }

        const context = this._menuContext || manager;

        if( context.honeycomb === this && context.currentConfig )
        {
            context.currentConfig.anchor_x = x;
            context.currentConfig.anchor_y = y;
        }

        this._setPosition(x, y);
    }

    _setPosition( _x, _y )
    {
        const container = {
            w: ( this.sizes.containerWidth / 2 ),
            h: ( this.sizes.containerHeight / 2 )
        };

        const rect = this.view.getBoundingClientRect();

        // Persistent controls are real dashboard/floorplan anchors. Their
        // center must stay at the exact same screen coordinate while the ring
        // expands around them, even when part of the ring reaches an edge.
        if( this.config.position_mode === 'anchored' )
        {
            const centerPos = this._computeCenterPosition();
            const itemSize = this.sizes.item;
            const centerOffsetX = (centerPos.x * itemSize) + (itemSize / 2);
            const centerOffsetY = (centerPos.y * itemSize) + ((itemSize * 1.1547) / 2);

            this.style.left = `${_x - centerOffsetX}px`;
            this.style.top = `${_y - centerOffsetY}px`;
            return;
        }

        const viewStyle = window.getComputedStyle(this.view, null);

        const paddingLeft = parseFloat( viewStyle.getPropertyValue('padding-left') ) || 0;
        const paddingTop = parseFloat( viewStyle.getPropertyValue('padding-top') ) || 0;

        // Standard popup menus still clamp against the visible viewport.
        const visibleLeft = Math.max(rect.left, 0);
        const visibleTop = Math.max(rect.top, 0);
        const visibleRight = Math.min(rect.right, window.innerWidth);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight);

        let minX = ( visibleLeft - rect.left ) + paddingLeft + container.w;
        let minY = ( visibleTop - rect.top ) + paddingTop + container.h;
        let maxX = ( visibleRight - rect.left ) - container.w - 5;
        let maxY = ( visibleBottom - rect.top ) - container.h - 5;

        if( maxX < minX )
        {
            const centerX = ( ( visibleLeft + visibleRight ) / 2 ) - rect.left;
            minX = centerX;
            maxX = centerX;
        }

        if( maxY < minY )
        {
            const centerY = ( ( visibleTop + visibleBottom ) / 2 ) - rect.top;
            minY = centerY;
            maxY = centerY;
        }

        _x = clamp( _x - rect.left, minX, maxX );
        _y = clamp( _y - rect.top, minY, maxY );

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

        const centerBrightness = Number(this.config.center_brightness);
        const centerBrightnessFactor = Number.isFinite(centerBrightness)
            ? Math.max(0, 1 + (centerBrightness / 100))
            : 1.25;
        this.style.setProperty('--honeycomb-center-brightness', `${centerBrightnessFactor}`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.stopPropagation();
        const context = this._menuContext || manager;
        context.stack = [];
        context.currentConfig = null;
        navigationCore.resetNavigation(context);

        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        const item = e.detail.item;
        const actionType = e.detail.action || 'tap';
        const actionKey = actionType === 'hold'
            ? 'hold_action'
            : actionType === 'double_tap'
                ? 'double_tap_action'
                : 'tap_action';
        const actionConfig = item.config && item.config[actionKey]
            ? item.config[actionKey]
            : null;
        if (dispatchCubeAction(item, actionConfig, this.config)) {
            e.stopPropagation();
            this._resetIdleTimeout();
            return;
        }

        this._playButtonSound( item );

        if( e.detail.autoclose )
        {
            const context = this._menuContext || manager;
            context.stack = [];
            context.currentConfig = null;
            this.close(item);
            return;
        }

        this._resetIdleTimeout();
    }

    _setDragHoverSlot(slot)
    {
        if( ! this.config.hover_highlight )
            return;

        this._dragHoverSlot = slot;
    }

    _clearDragHoverSlot(slot)
    {
        if( this._dragHoverSlot === slot )
            this._dragHoverSlot = -1;
    }

    _findMenuItemAtPoint(x, y)
    {
        if( ! this.shadowRoot || ! this.shadowRoot.elementFromPoint )
            return null;

        let element = this.shadowRoot.elementFromPoint(x, y);

        while( element && element !== this.shadowRoot )
        {
            if( element.tagName && ['honeycomb-menu-item','honeycomb-persistent-control'].includes(element.tagName.toLowerCase()) )
                return element;

            element = element.parentElement;
        }

        return null;
    }

    _handleGlobalPointerMove(e)
    {
        if( ! this.config.drag_select )
            return;

        // Only drag-select while the pointer is physically held down.
        if( e.buttons === 0 && e.pointerType === 'mouse' )
            return;

        // When the menu was opened by press_action, keep following the same
        // pointer that started the gesture.
        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        if( ! this._dragPointerActive )
        {
            if( this._dragStartX === null || this._dragStartY === null )
            {
                this._dragStartX = e.clientX;
                this._dragStartY = e.clientY;
            }

            const dx = e.clientX - this._dragStartX;
            const dy = e.clientY - this._dragStartY;
            const distance = Math.hypot(dx, dy);
            const deadzone = Math.max(0, Number(this.config.drag_deadzone) || 0);

            if( distance < deadzone )
                return;

            this._dragPointerActive = true;
        }

        this._dragPointerId = e.pointerId;
        this._resetIdleTimeout();

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        if( ! item )
        {
            this._dragHoverSlot = -1;
            return;
        }

        const slot = item.dataset.honeycombSlot === 'center'
            ? 18
            : Number(item.dataset.honeycombSlot);

        this._dragHoverSlot = Number.isFinite(slot) ? slot : -1;
    }

    _handleGlobalPointerUp(e)
    {
        if( ! this.config.drag_select )
            return;

        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        if( ! this._dragPointerActive )
        {
            this._dragPointerId = null;
            this._dragStartX = null;
            this._dragStartY = null;
            this._dragHoverSlot = -1;
            this._refreshVisibility();
            return;
        }

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._dragStartX = null;
        this._dragStartY = null;
        this._dragHoverSlot = -1;

        this._suppressPointerTapUntil = performance.now() + 250;
        if( item && e.type !== 'pointercancel' )
        {
            e.preventDefault();
            e.stopPropagation();
            this._triggerMenuItemTap(item);
        }
        if( !this.closing )
            this._refreshVisibility();
    }

    _triggerMenuItemTap(item)
    {
        if( item.disabled || !this._isButtonVisible(item.config) )
            return;
        if (typeof item._executeAction === 'function') {
            this._dispatchingDragTap = true;
            try { item._executeAction(item.config.tap_action || {action:'toggle'}); }
            finally { this._dispatchingDragTap = false; }
            return;
        }
        // honeycomb-menu-item is a wrapper around a Lovelace card (normally
        // custom:button-card). Clicking the wrapper itself does not execute the
        // wrapped card action. Trigger a normal tap on the actual action-handler
        // element inside the wrapped card instead.
        const wrappedCard = item.shadowRoot
            ? item.shadowRoot.querySelector('#item > *')
            : null;

        if( ! wrappedCard )
        {
            console.warn('[Honeycomb Menu NG] Unable to find wrapped card for drag-select.');
            return;
        }

        let actionTarget = wrappedCard;

        // custom:button-card attaches the Home Assistant action-handler to its
        // rendered card element. Prefer that element when it can be located.
        if( wrappedCard.shadowRoot )
        {
            const candidate =
                wrappedCard.shadowRoot.querySelector('ha-card') ||
                wrappedCard.shadowRoot.querySelector('[role="button"]');

            if( candidate )
                actionTarget = candidate;
        }

        // The HA/button-card action-handler reacts to an `action` event with
        // action: tap. This follows the same path as a normal tap and therefore
        // preserves toggle, call-service, fire-dom-event, navigation, etc.
        this._dispatchingDragTap = true;
        try {
            actionTarget.dispatchEvent(new CustomEvent('action', {
                bubbles: true,
                composed: true,
                detail: { action: 'tap' }
            }));
        } finally {
            this._dispatchingDragTap = false;
        }
    }

    _startStateRefresh()
    {
        this._stopStateRefresh();

        this._stateRefreshTimer = setInterval(() => {
            if( this.closing )
                return;

            const homeAssistant = document.querySelector('home-assistant');
            const latestHass = homeAssistant ? homeAssistant.hass : null;

            if( ! latestHass )
                return;

            // Home Assistant does not guarantee a brand-new hass object for
            // every state change. Relying only on object identity means live
            // button-card templates can freeze while a Honeycomb menu is open
            // (for example Sonos volume percentage after volume_up/down).
            //
            // Always push the current hass object directly into rendered menu
            // children. honeycomb-menu-item forwards it to the wrapped
            // custom:button-card, forcing its JS templates to re-evaluate.
            this.hass = latestHass;
            this._refreshVisibility();

            if( this.shadowRoot )
            {
                this.shadowRoot
                    .querySelectorAll('honeycomb-menu-item, honeycomb-persistent-control, xy-pad')
                    .forEach(item => {
                        item.hass = latestHass;
                    });
            }

            this.requestUpdate();
        }, 200);
    }

    _stopStateRefresh()
    {
        if( this._stateRefreshTimer )
        {
            clearInterval(this._stateRefreshTimer);
            this._stateRefreshTimer = null;
        }
    }

    _clearIdleTimeout()
    {
        if( this._idleTimer )
        {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    _resetIdleTimeout()
    {
        this._clearIdleTimeout();

        const timeout = Number(this.config && this.config.idle_timeout);

        if( ! Number.isFinite(timeout) || timeout <= 0 || this.closing )
            return;

        this._idleTimer = setTimeout(() => {
            this._idleTimer = null;

            if( this.closing )
                return;

            const context = this._menuContext || manager;

            if( context.local === true && context.stack.length > 0 )
            {
                // A persistent Hub never disappears on idle. Unwind nested
                // levels in-place back to the base instead of closing the
                // Honeycomb and briefly exposing the hidden bootstrap card.
                while( context.stack.length > 0 )
                {
                    if( ! honeycombBack(context) )
                        break;
                }

                return;
            }

            context.stack = [];
            context.currentConfig = null;
            this.close();
        }, timeout);
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
        return menuCubeWidth(this.config) * MENU_EXTENT_FACTOR / 6;
    }

    _computeXYPadClamp()
    {
        return menuCubeWidth(this.config) * MENU_EXTENT_FACTOR / 3;
    }

    _computeItemSize()
    {
        return menuCubeWidth(this.config) * MENU_EXTENT_FACTOR / 3;
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
                '_hub_items', '_hub_logo', '_hub_show_logo', '_persistent_hub_root', 'cube_size',
                'buttons',
                'size',
                'action',
                'xy_pad',
                'spacing',
                'animation_speed',
                'animation_mode',
                'animate',
                'drag_select',
                'drag_deadzone',
                'hover_highlight',
                'nested_center_back',
                'nested_expand',
                'button_defaults',
                'empty_slots',
                'center_button',
                'center_brightness',
                'idle_timeout',
                'layout_envelope',
                'position_mode',
                'persistent_center',
                'presets',
                'control',
                'inherit_inner',
                'promote_to_center',
                'promoted_center',
                '_persistent_launcher',
                'anchor_x',
                'anchor_y',
                'slot',
                'slot_mode'
            ]
        );
    }

    _centerHasExplicitBackground()
    {
        const center = this.config.center_button;

        if( ! center || center === false || ! center.styles )
            return false;

        const cardStyles = center.styles.card;

        if( ! Array.isArray(cardStyles) )
            return false;

        return cardStyles.some(style => {
            if( ! style || typeof style !== 'object' )
                return false;

            return Object.prototype.hasOwnProperty.call(style, 'background') ||
                   Object.prototype.hasOwnProperty.call(style, 'background-color') ||
                   Object.prototype.hasOwnProperty.call(style, 'backgroundColor');
        });
    }

    _lightenColorString( color, percent )
    {
        if( typeof color !== 'string' )
            return null;

        const amount = Math.max(0, Number(percent) || 0) / 100;
        const value = color.trim();

        const rgbaMatch = value.match(
            /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
        );

        if( rgbaMatch )
        {
            const r = Number(rgbaMatch[1]);
            const g = Number(rgbaMatch[2]);
            const b = Number(rgbaMatch[3]);
            const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : null;

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount));

            if( a !== null )
                return `rgba(${lighten(r)}, ${lighten(g)}, ${lighten(b)}, ${a})`;

            return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
        }

        const hexMatch = value.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);

        if( hexMatch )
        {
            let hex = hexMatch[1];

            if( hex.length === 3 )
                hex = hex.split('').map(c => c + c).join('');

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount))
                    .toString(16)
                    .padStart(2, '0');

            return `#${lighten(r)}${lighten(g)}${lighten(b)}`;
        }

        return null;
    }

    _applyCenterBrightness( config )
    {
        if( config.colors || config.border || this._centerHasExplicitBackground() )
            return false;

        const brightness = Number(this.config.center_brightness);

        if( ! Number.isFinite(brightness) || brightness === 0 )
            return true;

        if( ! config.styles || ! Array.isArray(config.styles.card) )
            return false;

        let adjusted = false;

        config.styles.card = config.styles.card.map(style => {
            if( ! style || typeof style !== 'object' )
                return style;

            const copy = { ...style };

            ['background', 'background-color', 'backgroundColor'].forEach(key => {
                if( Object.prototype.hasOwnProperty.call(copy, key) )
                {
                    const lightened = this._lightenColorString(copy[key], brightness);

                    if( lightened )
                    {
                        copy[key] = lightened;
                        adjusted = true;
                    }
                }
            });

            return copy;
        });

        return adjusted;
    }

    _computeCenterConfig()
    {
        if( this.config.center_button === false )
            return null;

        const nestedDefaultCenter = (this._menuContext || manager).stack.length > 0 && this.config.nested_center_back
            ? {
                entity: this.config.entity,
                active: false,
                autoclose: false,
                icon: 'mdi:arrow-left',
                tap_action: {
                    action: 'honeycomb-back'
                }
            }
            : {
                entity: this.config.entity,
                active: this.config.active,
                autoclose: true,
                tap_action: {
                    action: 'more-info'
                }
            };

        const center = merge(
            {},
            nestedDefaultCenter,
            this.config.center_button || {}
        );

        const computed = this._computeItemConfig(center);

        // Prefer changing only the inherited card background. If the color
        // cannot be parsed (for example a theme variable), fall back to CSS
        // brightness on the whole center item.
        const adjustedBackground = this._applyCenterBrightness(computed);
        this._centerUseFilterFallback =
            !computed.colors && !computed.border &&
            ! this._centerHasExplicitBackground() &&
            ! adjustedBackground &&
            Number(this.config.center_brightness) !== 0;

        return computed;
    }

    _getConfiguredButtons(config)
    {
        if( ! config || ! Array.isArray(config._hub_items || config.buttons) )
            return [];

        const buttons = [];

        (config._hub_items || config.buttons).forEach(entry => {
            if( Array.isArray(entry) )
            {
                entry.forEach(button => {
                    if( button && typeof button === 'object' )
                        buttons.push(button);
                });
            }
            else if( entry && typeof entry === 'object' )
            {
                buttons.push(entry);
            }
        });

        return buttons;
    }

    _configUsesOuterRing(config)
    {
        const buttons = this._getConfiguredButtons(config);

        // More than six configured buttons necessarily needs the outer ring in
        // one of the supported automatic layouts. Be conservative here: this is
        // an envelope calculation, so reserving a little extra space is safer
        // than allowing the menu to jump when a dynamic button becomes visible.
        if( buttons.length > 6 )
            return true;

        return buttons.some(button => {
            // Legacy position is zero-based and absolute.
            if( button.position !== undefined )
            {
                const position = Number(button.position);
                if( Number.isInteger(position) && position >= 6 && position <= 17 )
                    return true;
            }

            // Only hard slots force a physical ring. Soft slots may wrap into
            // the currently active ring and therefore do not require an outer
            // envelope by themselves.
            if( ['hard', 'priority'].includes(button.slot_mode) && button.slot !== undefined )
            {
                const slot = Number(button.slot);
                if( Number.isInteger(slot) && slot >= 7 && slot <= 18 )
                    return true;
            }

            return false;
        });
    }

    _configHasExpandableOuter(config, seen = new Set())
    {
        if( ! config || typeof config !== 'object' || seen.has(config) )
            return false;

        seen.add(config);

        const buttons = this._getConfiguredButtons(config);
        const actionKeys = ['tap_action', 'hold_action', 'double_tap_action', 'press_action'];

        for( const button of buttons )
        {
            for( const actionKey of actionKeys )
            {
                const action = button[actionKey];
                const raw = action && (action.honeycomb_nested_menu || action.honeycomb_menu);
                const nested = raw && traverseConfigs(raw);

                if( ! nested || (nested.nested_expand !== true && action.action !== 'honeycomb-open-nested') )
                    continue;

                if( nested.inherit_inner === true || nested.layout_envelope === 'outer' || this._configUsesOuterRing(nested) )
                    return true;

                if( nested.layout_envelope !== 'inner' && this._configHasExpandableOuter(nested, seen) )
                    return true;
            }
        }

        return false;
    }

    _computeLayoutEnvelopeOuter(config)
    {
        const mode = config && config.layout_envelope;

        if( mode === 'outer' )
            return true;

        if( mode === 'inner' )
            return false;

        return !!(this._rings && this._rings.outer) || this._configHasExpandableOuter(config);
    }

    _computeCenterPosition()
    {
        return layoutCore.centerPosition(this._hasOuterRing());
    }

    _hasInnerRing()
    {
        return this._rings && this._rings.inner;
    }

    _hasOuterRing()
    {
        return !!(
            (this._rings && this._rings.outer) ||
            this._layoutEnvelopeOuter
        );
    }

    _computeButtonPosition( slot )
    {
        return layoutCore.buttonPosition(slot, {
            inner: this._hasInnerRing(),
            outer: this._hasOuterRing()
        });
    }

    _computeButtonAnimateStep( slot )
    {
        if( this.config.animation_mode === 'sequential' )
            return slot + 1;

        // Paired mode animates opposite physical positions together.
        // Inner ring: 1+4, 2+5, 3+6.
        if( slot < 6 )
            return (slot % 3) + 1;

        // Outer ring: 7+13, 8+14, 9+15, 10+16, 11+17, 12+18.
        return ((slot - 6) % 6) + 1;
    }

    _computeButtonAnimateDelay( slot )
    {
        return this._computeAnimateDelay(this._computeButtonAnimateStep(slot));
    }

    _computeAnimateDelay( i )
    {
        return this.config.animation_speed * i + 'ms';
    }
}

customElements.define(HoneycombMenu.is, HoneycombMenu);
