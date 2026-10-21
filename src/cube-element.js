import { LitElement, html, css } from 'lit';
import { fireEvent, provideHass, getTemplateOrValue, createCard } from "./helpers.js";

import { styleMap } from 'lit/directives/style-map.js';
const { buildCubeConfig, validateCubeConfig } = require('./core/cube-config.js');
const { customActionRegistry } = require('./core/action-registry.js');
const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const layoutCore = require('./core/layout.js');
const { presentationDependencies, presentationSnapshot } = require('./core/presentation-dependencies.js');
const presentationUpdates = require('./core/presentation-updates.js');
const { HONEYCOMB_BEE_PNG } = require('./brand/bee.generated.js');

class CubeElement extends LitElement
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
        this.size = 82;
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
                width: var(--honeycomb-persistent-size, 82px);
                line-height: normal;
                position: relative;
                user-select: none;
                -webkit-user-select: none;
            }

            .persistent-center {
                filter: drop-shadow(2px 4px 3px rgba(0,0,0,.76));
                position: relative;
                width: 100%;
                height: calc(var(--honeycomb-persistent-size, 82px) * 1.1547);
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

            .artwork { position:absolute;inset:0;pointer-events:none;
                clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); }
            .content.has-artwork { justify-content:flex-end;padding-bottom:22%;box-sizing:border-box; }
            .station-artwork { position:absolute;left:22%;top:22%;width:56%;height:56%;object-fit:contain;pointer-events:none;z-index:1; }
            .external-content { position:absolute;inset:8%;overflow:hidden; }
            .external-content > * { height:100%; }
            .primary { font-size:calc(var(--honeycomb-persistent-size,82px)*.16);font-weight:650;line-height:1.1; }
            .primary,.secondary { max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            .content.has-primary.has-secondary .secondary { font-size:calc(var(--honeycomb-persistent-size,82px)*.12); }
            .content.has-primary ha-icon { width:30%;height:30%; }
            .interaction-surface:focus-visible { outline:2px solid var(--primary-color,#2196f3);outline-offset:-5px; }
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
                justify-items: center;
                text-align: center;
                pointer-events: none;
                color: var(--honeycomb-persistent-foreground, #f6f7f9);
            }

            .bee-icon {
                width: 58%;
                height: 58%;
                display: block;
                object-fit: contain;
                overflow: visible;
                transform-origin: center;
                filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.18));
            }

            .bee-icon.flap {
                animation: honeycomb-bee-flight 430ms ease-in-out;
            }

            @keyframes honeycomb-bee-flight {
                0%, 100% {
                    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
                }
                25% {
                    transform: translate3d(1px, -2px, 0) rotate(-5deg) scale(1.04);
                }
                55% {
                    transform: translate3d(-1px, -1px, 0) rotate(4deg) scale(1.06);
                }
                78% {
                    transform: translate3d(1px, -2px, 0) rotate(-3deg) scale(1.03);
                }
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
                font-size: calc(var(--honeycomb-persistent-size, 82px) * 0.16);
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
        this._hass = obj;
        if (this._contentCard) this._contentCard.hass = obj;
        if (!this.config) return;
        if (!this._presentationDependencies) this._presentationDependencies = presentationDependencies(this.config);
        if (!this._presentationDependencies.wildcard) {
            const snapshot = presentationSnapshot(obj, this._presentationDependencies);
            if (snapshot === this._entitySnapshot) return;
            this._entitySnapshot = snapshot;
        }
        this._updatePresentation();
    }

    set config(value)
    {
        const signature = JSON.stringify(value);
        if (signature === this._configInputSignature) return;
        this._configInputSignature = signature;
        this._presentationDependencies = null;
        this._entitySnapshot = undefined;
        this._config = value ? merge({mode:'generic',variables:{},face_mode:'cell'}, value,
            Object.keys(value).length === 0 || value.type === 'break' ? {disabled:true} : {}) : null;
        this._contentConfigDirty=true;
        this._presentationSignature = null;
        this._updatePresentation();
        this.requestUpdate();
    }

    get config() { return this._config; }

    _value(value, fallback = '')
    {
        if (value === undefined || value === null) return fallback;
        try {
            return getTemplateOrValue(this.hass || {states:{}}, this._entityState(),
                this.config.variables || {}, typeof value === 'object' ? merge(Array.isArray(value)?[]:{},value) : value);
        } catch (_) { return fallback; }
    }

    _updatePresentation()
    {
        if (!this.config) return;
        const key=this.isConnected && this.config._sleep ? presentationUpdates.connectionKey(this.hass) : null;
        if (key!==this._localPresentationKey) {
            if (this._localPresentationUnsubscribe) this._localPresentationUnsubscribe();
            this._localPresentationKey=key;
            this._localPresentationUnsubscribe=key ? presentationUpdates.subscribe(this.hass,()=>this._updatePresentation()) : null;
        }
        const presentation = this._resolvePresentation();
        const style = key => Object.assign({}, ...(this._value((this.config.styles || {})[key], []) || []));
        const card = style('card');
        const configured = this.config.colors || {};
        const color = (key, fallback) => {
            const value = this._value(configured[key], fallback);
            return !value || value === 'auto' ? fallback : value;
        };
        const colors = {
            center:color('center',presentation.colors.center),
            inner:color('inner_border',presentation.colors.inner),
            outer:color('outer_border','#34383d')
        };
        if (this.config.mode === 'generic') {
            colors.center = card.background || card['background-color'] || this._value(this.config.background, colors.center);
        }
        if (presentation.forceColors) Object.assign(colors, presentation.forceColors);
        const secondary = this.config.label !== undefined && this.config.show_label !== false
            ? this._value(this.config.label) : presentation.secondary;
        const model = {colors, secondary, ...(presentation.disabled ? {disabled:true} : {}), artwork:presentation.artwork || null,
            name:this.config.show_name ? this._value(this.config.name) : '',
            icon:this.config.show_icon === false || presentation.artwork ? null : this._value(this.config.icon, 'mdi:hexagon-outline'),
            foreground:this._value(this.config.foreground, presentation.foreground || this._foregroundForBackground(colors.center)),
            card, grid:style('grid'), iconStyle:style('icon'), nameStyle:style('name'), labelStyle:style('label'),
            outer:Math.max(0,Number(this._value((this.config.border || {}).outer_width,3)) || 0),
            inner:Math.max(0,Number(this._value((this.config.border || {}).inner_width,3)) || 0)};
        // Display refresh only. The backend/device owns expiry; this never calls HA.
        const refreshAt=presentation.refreshAt || null;
        if (refreshAt!==this._presentationRefreshAt || !this.isConnected) {
            clearTimeout(this._presentationTimer);this._presentationTimer=null;
            this._presentationRefreshAt=refreshAt;
            if (refreshAt && this.isConnected) this._presentationTimer=setTimeout(()=>{
                this._presentationRefreshAt=null;this._updatePresentation();
            },Math.max(100,refreshAt-Date.now()));
        }
        const signature = JSON.stringify(model);
        this._model = model;
        if (signature !== this._presentationSignature) {
            this._presentationSignature = signature;
            this.requestUpdate();
        }
    }

    get hass()
    {
        return this._hass;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Control requires a configuration.');

        validateCubeConfig(config, {hubItems:config.mode === 'hub'});
        if (!this._hasHassProvider) { this._hasHassProvider = true; provideHass(this); }
        let next = merge({}, config);
        if (next.mode !== 'hub') {
            const selector = next.module || (next.mode === 'media' ? 'media' :
                ((next.entity && next.entity.startsWith('light.')) ? 'light' : 'generic'));
            next = merge({}, buildCubeConfig({...next, module:selector}, this.hass), next);
        }


        _defaults(next, {
            mode: 'persistent',
            entity: null,
            size: 82,
            icon: 'mdi:hexagon-outline',
            active: true,
            interactive: true,
            tap_action: { action: 'toggle' },
            center_button: {},
            show_brightness: 'when_on',
            show_volume: 'when_playing',
            active_color: '#00bcd4',
            match_anchor_size: true,
            face_mode: 'cell',
            restore_on_close: true,
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



        // Media controls behave like the persistent light control: the component
        // owns its live state rendering instead of delegating volume/state to a
        // button-card template.
        if( next.mode === 'media' && config.tap_action === undefined )
        {
            next.tap_action = {
                action: 'perform-action',
                perform_action: 'media_player.media_play_pause',
                target: { entity_id: next.entity }
            };
        }

        this.config = next;
        this.size = Number(next.size);
        if (!Number.isFinite(this.size) || this.size <= 0) throw new Error('Cube size must be a positive finite number.');
        this.style.setProperty('--honeycomb-persistent-size', `${this.size}px`);

        this._updatePresentation();
        this.requestUpdate();
    }

    connectedCallback()
    {
        super.connectedCallback();
        this._updatePresentation();
        const host = this.getRootNode().host;
        if (!host || !host._menuContext) {
            if (!this._hasHassProvider) { this._hasHassProvider = true; provideHass(this); }
        }
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
        if (this._localPresentationUnsubscribe) this._localPresentationUnsubscribe();
        this._localPresentationUnsubscribe=null;this._localPresentationKey=null;
        clearTimeout(this._presentationTimer);this._presentationTimer=null;this._presentationRefreshAt=null;
        this._cancelGesture();

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

    _resolvePresentation()
    {
        const configured = (this.config && this.config.colors) || {};

        if( this.config && this.config.mode === 'hub' )
        {
            return {
                colors: {
                    center: configured.center || '#20262d',
                    inner: configured.inner_border || '#f2b705',
                    outer: configured.outer_border || '#34383d'
                },
                secondary: null
            };
        }

        const module = moduleRegistry.resolvePresentation(
            this.config ? this.config.mode : null
        );

        if( module && module.presentation && typeof module.presentation.resolve === 'function' )
        {
            const runtime = {
                lastKnownColor: this._lastKnownColor,
                failedArtworkKey: this._failedArtworkKey
            };

            const presentation = module.presentation.resolve({
                config: this.config || {},
                state: this._entityState(),
                hass: this.hass,
                runtime
            });

            this._lastKnownColor = runtime.lastKnownColor || this._lastKnownColor;

            if( presentation && presentation.colors )
                return presentation;
        }

        const unavailable = this.config.mode === 'generic' ? '#34424e' : (configured.unavailable || '#555b63');

        return {
            colors: {
                center: unavailable,
                inner: unavailable,
                outer: unavailable
            },
            secondary: null
        };
    }

    // User-invoked, privacy-safe module diagnostics. No automatic logging.
    getPresentationDiagnostics()
    {
        const module = moduleRegistry.resolvePresentation(this.config && this.config.mode);
        if (!module || !module.presentation || !module.presentation.diagnostics) return null;
        return module.presentation.diagnostics({hass:this.hass,config:this.config,
            runtime:{failedArtworkKey:this._failedArtworkKey}});
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
        if (menu.nested_expand === undefined) menu.nested_expand=true;

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

                const action = button.tap_action;
                const nested = action && (
                    action.honeycomb_nested_menu ||
                    action.honeycomb_menu
                );

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

        const persistentDefaults = {styles:{card:[{background:'rgba(52, 66, 78, 0.94)'}]}};

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
        if( ! this.config || this.config.disabled || (this._model && this._model.disabled) || this.config.interactive === false )
            return;

        if( e.button !== undefined && e.button !== 0 )
            return;

        const owner = this.getRootNode().host;
        if (owner && owner._resetIdleTimeout) owner._resetIdleTimeout();

        this._clearHoldTimer();
        this._pointerId = e.pointerId;
        this._pointerStartX = e.clientX;
        this._pointerStartY = e.clientY;
        this._holdTriggered = false;
        this._pointerMoved = false;

        if( e.currentTarget && e.currentTarget.setPointerCapture )
        {
            try { e.currentTarget.setPointerCapture(e.pointerId); }
            catch(err) { /* Pointer capture is best-effort. */ }
        }

        const holdTime = Math.max(250, Number(this.config.hold_time) || 500);

        this._holdTimer = setTimeout(() => {
            this._holdTimer = null;
            this._holdTriggered = true;
            if (this.config.hold_action) this._executeAction(this.config.hold_action);
            else this._openMenu();
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

        if( distance > 12 ) { this._pointerMoved = true; this._clearHoldTimer(); }
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

        if (this._pointerMoved) return;
        if (this.config.double_tap_action) {
            if (this._tapTimer) {
                clearTimeout(this._tapTimer); this._tapTimer=null;
                this._executeAction(this.config.double_tap_action);
                this._releasePendingAction();
            } else {
                this._pendingActionContext = (this.getRootNode().host || {})._menuContext;
                if (this._pendingActionContext) this._pendingActionContext.pendingActions.add(this);
                this._tapTimer=setTimeout(()=>{
                    this._tapTimer=null;
                    this._executeAction(this.config.tap_action || {action:'toggle'});
                    this._releasePendingAction();
                },300);
            }
        } else this._executeAction(this.config.tap_action || { action: 'toggle' });
    }

    _handlePointerCancel()
    {
        this._clearHoldTimer();
        this._pointerId = null;
        this._holdTriggered = false;
    }

    _releasePendingAction()
    {
        const context = this._pendingActionContext;
        this._pendingActionContext = null;
        if (context) {
            context.pendingActions.delete(this);
            if (context.onIdle) context.onIdle();
        }
    }

    _cancelGesture()
    {
        this._handlePointerCancel();
        if (this._tapTimer) clearTimeout(this._tapTimer);
        this._tapTimer = null;
        this._releasePendingAction();
    }

    _openHoneycombMenu(menu)
    {
        const root = this.getRootNode ? this.getRootNode() : null;
        const host = root && root.host ? root.host : null;
        const context = host && host._menuContext ? host._menuContext : null;

        if( context && typeof window.honeycomb_menu_in_context === 'function' )
            return window.honeycomb_menu_in_context(context, menu);

        if( typeof window.honeycomb_menu !== 'function' )
            return null;

        return window.honeycomb_menu(menu);
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

        const root = this.getRootNode();
        const owner = root && root.host;
        const isMenuItem = owner && owner._menuContext;
        const openedMenu = this._openHoneycombMenu(menu);

        // Only dashboard launchers need to hide behind an overlay. Menu-owned
        // cells are reused across in-place navigation: hiding one here also
        // hides the next control assigned to that cell, and no `closed` event
        // fires on back to restore it. The scene owns those cells' lifecycle.
        if( openedMenu && ! isMenuItem )
        {
            this.style.visibility = 'hidden';

            if( this.config.restore_on_close !== false )
            {
                const restore = () => {
                    this.style.visibility = '';
                };

                openedMenu.addEventListener('closed', restore, { once: true });
            }
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
        if (!action || !this.hass || this.config.disabled || (this._model && this._model.disabled) || this.config.interactive === false) return;
        const name=typeof action === 'string' ? action : (action.action || 'toggle');
        this._dispatchAction(action);
        const owner=this.getRootNode().host;
        if (owner && owner._menuContext) {
            if (this.config.autoclose && !name.startsWith('honeycomb-') && name !== 'none' &&
                !(action.honeycomb_menu || action.honeycomb_nested_menu))
                window.honeycomb_menu_context_close(owner._menuContext);
            else if (owner._resetIdleTimeout) owner._resetIdleTimeout();
        }
    }

    _dispatchAction(action)
    {
        if( ! action || ! this.hass || this.config.disabled || (this._model && this._model.disabled) || this.config.interactive === false )
            return;

        if (typeof action === 'string') action = {action};
        const original = action;
        if (!action.honeycomb_menu && !action.honeycomb_nested_menu)
            action = this._value(action, original);
        const actionName = action.action || 'toggle';
        const context = (this.getRootNode().host || {})._menuContext || this._menuContext;
        if ((actionName === 'honeycomb-open-nested' || actionName === 'fire-dom-event') &&
            (action.honeycomb_nested_menu || action.honeycomb_menu)) {
            const nested=merge({nested_expand:true,entity:this.config.entity}, action.honeycomb_nested_menu || action.honeycomb_menu);
            nested.variables=merge({},this.config.variables || {},nested.variables || {});
            this._openHoneycombMenu(nested);
            return;
        }
        if (actionName === 'honeycomb-close') { window.honeycomb_menu_context_close(context); return; }
        if (customActionRegistry.has(actionName)) {
            const sourceConfig=this.config, sourceMenu=context && context.currentConfig;
            const sourceHost=this.getRootNode().host;
            // Menu identity changes on navigation, not on passive HA renders.
            // Guard the completion as well as discovery's own checks so a late
            // async action cannot resurrect an abandoned submenu.
            const isCurrent=()=>context ? context.currentConfig===sourceMenu &&
                context.honeycomb===sourceHost && sourceHost.isConnected && !sourceHost.closing :
                this.isConnected && this.config===sourceConfig;
            customActionRegistry.handle(actionName,{hass:this.hass,actionConfig:action,
                openNested:config=>isCurrent() ? this._openHoneycombMenu(config) : null,
                getHass:()=>context && context.honeycomb ? context.honeycomb.hass : this.hass,
                isCurrent,
                requestScope:context || this,
                entity:this.config.entity,itemConfig:this.config,menuConfig:(this.getRootNode().host || {}).config});
            return;
        }


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
            const root = this.getRootNode ? this.getRootNode() : null;
            const host = root && root.host ? root.host : null;
            const context = host && host._menuContext ? host._menuContext : null;

            if( context && typeof window.honeycomb_menu_context_back === 'function' )
                window.honeycomb_menu_context_back(context);
            else if( typeof window.honeycomb_menu_back === 'function' )
                window.honeycomb_menu_back();
            return;
        }

        if (actionName === 'navigate') {
            history.pushState(null,'',action.navigation_path); fireEvent(window,'location-changed',{replace:false}); return;
        }
        if (actionName === 'url') { window.open(action.url_path,'_blank','noopener'); return; }
        if (actionName === 'fire-dom-event') { fireEvent(this,'ll-custom',action); return; }
        if( actionName === 'toggle' )
        {
            if (!this.config.entity) return;
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
            fireEvent(this, 'hass-more-info', { entityId: action.entity || this.config.entity });
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
        if (!this.config || !this._model) return html``;
        const m = this._model;
        const innerScale = Math.max(.55, 1-m.outer*2/this.size);
        const centerScale = Math.max(.45, innerScale-m.inner*2/this.size);
        const points = layoutCore.persistentHexPoints('cell');
        const artwork = Object.fromEntries(Object.entries(m.card).filter(([key])=>
            key.startsWith('background-') && key !== 'background-color'));
        const external = this.config.custom_fields || (this.config.type &&
            !['custom:button-card','custom:honeycomb-persistent-control','custom:honeycomb-persistent-hub'].includes(this.config.type));
        this._externalContent = !!external;
        return html`<div class="persistent-center" style="--honeycomb-persistent-size:${this.size}px;--honeycomb-persistent-foreground:${m.foreground}">
            <svg class="hex-svg" viewBox="0 0 100 115.47" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <polygon class="hex-outer" points=${points} fill=${m.colors.outer}></polygon>
                <g transform="translate(50 57.735) scale(${innerScale}) translate(-50 -57.735)">
                    <polygon class="hex-inner" points=${points} fill=${m.colors.inner}></polygon>
                </g>
                <g transform="translate(50 57.735) scale(${centerScale}) translate(-50 -57.735)">
                    <polygon class="hex-fill" points=${points} fill=${m.colors.center}></polygon>
                </g>
            </svg>
            <div class="artwork" style=${styleMap({...artwork,transform:`scale(${centerScale})`})}>
                ${m.artwork ? html`<img class="station-artwork" src=${m.artwork.url} alt="" aria-hidden="true"
                    style=${styleMap(m.artwork.style || {})}
                    @error=${()=>{if(this._model.artwork && this._model.artwork.key===m.artwork.key){this._failedArtworkKey=m.artwork.key;this._updatePresentation();}}}>` : ''}
            </div>
            ${external ? html`<div class="external-content"></div>` : html`
            <div class="content ${m.artwork ? 'has-artwork' : ''} ${m.secondary ? 'has-secondary' : ''} ${m.name ? 'has-primary' : ''}"
                style=${styleMap(Object.keys(m.grid).length ? {display:'grid',...m.grid} : {})}>
                ${m.icon === '' || m.icon === 'honeycomb:bee' ? html`<img class="bee-icon ${this._beeFlapping?'flap':''}" src=${HONEYCOMB_BEE_PNG} alt="" aria-hidden="true">`
                    : m.icon ? html`<ha-icon style=${styleMap({'grid-area':Object.keys(m.grid).length?'i':undefined,...m.iconStyle})} .icon=${m.icon}></ha-icon>` : ''}
                ${m.name ? html`<div class="primary" style=${styleMap({'grid-area':Object.keys(m.grid).length?'n':undefined,...m.nameStyle})}>${m.name}</div>` : ''}
                ${m.secondary ? html`<div class="secondary" style=${styleMap({'grid-area':Object.keys(m.grid).length?'l':undefined,...m.labelStyle})}>${m.secondary}</div>` : ''}
            </div>`}
            ${this.config.interactive !== false && !this.config.disabled ? html`
            <div class="interaction-surface" role="button" tabindex=${m.disabled ? -1 : 0} aria-disabled=${m.disabled ? "true" : "false"} aria-label=${this.config.tap_action && this.config.tap_action.action==='honeycomb-back' ? 'Back' : m.name || this._value(this.config.name,'') || String(m.secondary || this.config.entity || 'Honeycomb')}
                @keydown=${e=>{
                    const zoom=(this.config.hold_action && ['honeycomb-light-color-zoom','honeycomb-light-kelvin-zoom'].includes(this.config.hold_action.action)) ||
                        (this.config.tap_action && this.config.tap_action.action==='honeycomb-light-kelvin-apply');
                    if (zoom && e.key==='Escape') {e.preventDefault();this._dispatchAction({action:'honeycomb-close'});return;}
                    if(!m.disabled && !e.repeat && ['Enter',' '].includes(e.key)) {
                        e.preventDefault();this._executeAction(zoom && e.shiftKey ? this.config.hold_action : this.config.tap_action || {action:'toggle'});
                    }
                }}
                @pointerdown=${this._handlePointerDown} @pointermove=${this._handlePointerMove}
                @pointerup=${this._handlePointerUp} @pointercancel=${this._handlePointerCancel}
                @contextmenu=${e=>e.preventDefault()}></div>` : ''}
        </div>`;
    }

    updated()
    {
        const target = this.shadowRoot.querySelector('.external-content');
        if (target && !this._contentCard) {
            const type=this.config.type && !['custom:honeycomb-persistent-control','custom:honeycomb-persistent-hub'].includes(this.config.type) ? this.config.type : 'custom:button-card';
            this._contentCard = createCard({...this.config,type,
                tap_action:{action:'none'},hold_action:{action:'none'},double_tap_action:{action:'none'}});
            target.append(this._contentCard);
            this._contentCard.hass = this.hass;
        } else if (target && this._contentCard && this._contentConfigDirty) {
            this._contentCard.setConfig({...this.config,type:this._contentCard.tagName.toLowerCase()==='button-card'?'custom:button-card':this.config.type,
                tap_action:{action:'none'},hold_action:{action:'none'},double_tap_action:{action:'none'}});
            this._contentCard.hass=this.hass;
        } else if (!target) this._contentCard=null;
        this._contentConfigDirty=false;
    }
}

export default CubeElement;
