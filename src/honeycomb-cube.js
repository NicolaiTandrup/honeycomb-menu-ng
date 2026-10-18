import { LitElement, html, css } from 'lit';
import { dispatchCubeAction, delegateHAAction } from './cube-actions.js';
import { renderHexFace, faceColors, faceBorder, presentationValue } from './hex-face.js';
import { fireEvent, provideHass, isButtonVisible, getTemplateOrValue } from "./helpers.js";

const merge = require('lodash/merge');
const cloneDeep = require('lodash/cloneDeep');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const { cubeWidth, MENU_EXTENT_FACTOR, contentMetrics } = require('./core/cube-metrics.js');
const { HONEYCOMB_BEE_PNG } = require('./brand/bee.generated.js');

class HoneycombCube extends LitElement
{
    static get is()
    {
        return 'honeycomb-cube';
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
            .interaction-surface:focus-visible { outline: 2px solid var(--primary-color, #2196f3); }

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
                width: var(--honeycomb-cube-icon);
                height: var(--honeycomb-cube-icon);
                color: inherit;
            }

            .content.has-secondary ha-icon {
                transform: translateY(-2px);
            }

            .primary { font-size: var(--honeycomb-cube-primary); font-weight: 650; }
            .content.has-primary .secondary { font-size: var(--honeycomb-cube-secondary); }
            .primary, .secondary { max-width: 78%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .primary { max-width: 88%; }
            .secondary {
                margin-top: 2px;
                font-size: var(--honeycomb-cube-secondary);
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

        this.requestUpdate('hass', oldHass);
        this.requestUpdate();
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
        next._layered = !!(config.colors || config.border);

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
            show_volume: 'when_playing',
            active_color: '#00bcd4',
            match_anchor_size: true,
            face_mode: 'inset',
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

        if( ! next.entity && next.mode !== 'hub' )
            throw new Error('Honeycomb Persistent Control requires an entity.');

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
        this.size = cubeWidth(next.size);
        this.style.setProperty('--honeycomb-persistent-size', `${this.size}px`);

        provideHass(this);

        this.requestUpdate();
    }

    disconnectedCallback()
    {
        super.disconnectedCallback();
        this._clearHoldTimer();
        this._clearTapTimer();

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
        if( this.config && this.config.mode === 'hub' )
        {
            return {
                colors: faceColors(this.hass, this.config,
                    { center: '#20262d', inner: '#f2b705', outer: '#34383d' }),
                secondary: null
            };
        }

        const evaluated = faceColors(this.hass, this.config || {},
            { center: 'auto', inner: 'auto', outer: 'auto' });
        const configured = { ...((this.config && this.config.colors) || {}),
            center: evaluated.center, inner_border: evaluated.inner,
            outer_border: this.config.colors && this.config.colors.outer_border !== undefined
                ? evaluated.outer : '#34383d' };

        const module = moduleRegistry.resolvePresentation(
            this.config ? this.config.mode : null
        );

        if( module && module.presentation && typeof module.presentation.resolve === 'function' )
        {
            const runtime = {
                lastKnownColor: this._lastKnownColor
            };

            const presentation = module.presentation.resolve({
                config: { ...this.config, colors: configured },
                state: this._entityState(),
                runtime
            });

            this._lastKnownColor = runtime.lastKnownColor || this._lastKnownColor;

            if (presentation && presentation.colors && this.config._layered !== false &&
                (this.config.colors || this.config.border))
                presentation.colors.outer = faceColors(this.hass, this.config, {
                    center:presentation.colors.center, inner:presentation.colors.inner, outer:'#34383d'
                }).outer;

            if( presentation && presentation.colors )
                return presentation;
        }

        const unavailable = configured.unavailable || '#555b63';

        return {
            colors: {
                center: unavailable,
                inner: unavailable,
                outer: unavailable
            },
            secondary: null
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

        // The menu engine computes the reachable layout envelope for native
        // and wrapped launchers alike; no second layout scanner lives here.
        const anchorSize = Number(this._anchorRenderedSize) || this.size;

        if( this.config.match_anchor_size !== false ) {
            menu.cube_size = anchorSize;
            menu.size = anchorSize * MENU_EXTENT_FACTOR;
        }

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

        if (menu.promoted_center && this.config._layered) {
            for (const key of ['colors','border','face_mode','name','label','variables'])
                if (this.config[key] !== undefined)
                    menu.promoted_center[key] = cloneDeep(this.config[key]);
        }

        const center = merge({}, this.config);
        delete center.menu;
        center.interactive = false;
        if (this.config.mode === 'hub') {
            center.interactive = true;
            center.tap_action = { action: 'honeycomb-close' };
        }
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
            this._clearTapTimer();
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

        if( distance > 12 && ! this._holdTriggered ) {
            this._pointerMoved = true;
            this._clearHoldTimer();
        }
    }

    _handlePointerUp(e)
    {
        if( this._pointerId === null || e.pointerId !== this._pointerId )
            return;

        const wasHold = this._holdTriggered;

        this._clearHoldTimer();
        this._pointerId = null;
        this._holdTriggered = false;

        if( wasHold || this._pointerMoved )
        {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (this.config.double_tap_action) {
            if (this._tapTimer) {
                this._clearTapTimer();
                this._executeAction(this.config.double_tap_action);
            } else {
                this._tapTimer = setTimeout(() => {
                    this._tapTimer = null;
                    this._executeAction(this.config.tap_action || {action:'toggle'});
                }, 300);
            }
        } else this._executeAction(this.config.tap_action || { action: 'toggle' });
    }

    _clearTapTimer()
    {
        if (this._tapTimer) clearTimeout(this._tapTimer);
        this._tapTimer = null;
    }

    _handlePointerCancel()
    {
        this._clearTapTimer();
        this._clearHoldTimer();
        this._pointerId = null;
        this._holdTriggered = false;
    }

    _openHoneycombMenu(menu)
    {
        const root = this.getRootNode ? this.getRootNode() : null;
        const host = root && root.host ? root.host : null;
        const context = host && host._menuContext ? host._menuContext : null;

        if( context && typeof window.honeycomb_menu_in_context === 'function' )
            return window.honeycomb_menu_in_context(context, menu, this.config);

        if( typeof window.honeycomb_menu !== 'function' )
            return null;

        return window.honeycomb_menu(menu, this.config);
    }

    _openMenu()
    {
        if( !isButtonVisible(this.config, this._latestHass(), this.config.variables) )
            return;
        const menu = this._persistentMenuConfig();

        if( ! menu || typeof window.honeycomb_menu !== 'function' )
            return;

        const rect = this.getBoundingClientRect();

        // Use the actual rendered width, not only the configured number. This
        // prevents the center from subtly growing when the surrounding ring is
        // opened inside responsive Lovelace layouts.
        this._anchorRenderedSize = rect.width;

        if( this.config.match_anchor_size !== false ) {
            menu.cube_size = rect.width;
            menu.size = rect.width * MENU_EXTENT_FACTOR;
        }

        if( menu.persistent_center )
            menu.persistent_center.size = rect.width;

        menu.anchor_x = rect.left + (rect.width / 2);
        menu.anchor_y = rect.top + (rect.height / 2);

        const openedMenu = this._openHoneycombMenu(menu);

        if( openedMenu )
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
        const latest = this._latestHass();
        if( ! action || ! latest || this.config.disabled || !isButtonVisible(this.config, latest, this.config.variables) )
            return;
        this.hass = latest;
        if (typeof action === 'string') action = {action};

        // Evaluate service arguments at activation time, preserving nested menu
        // definitions for their own rendering context.
        if (action.action !== 'honeycomb-open-nested' && !action.honeycomb_menu) {
            try {
                action = getTemplateOrValue(this.hass, this._entityState(), this.config.variables || {}, merge({}, action));
            } catch (_) { return; }
        }

        const actionName = action.action || 'toggle';

        if( actionName === 'none' )
            return;

        const host = this.getRootNode().host;
        if (dispatchCubeAction(this, action, host && host.config)) return;

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
            return;
        }
        delegateHAAction(this, action);
    }

    _latestHass()
    {
        const homeAssistant = document.querySelector('home-assistant');
        return homeAssistant && homeAssistant.hass || this.hass;
    }

    render()
    {
        if( ! this.config )
            return html``;

        const presentation = this._resolvePresentation();
        const colors = presentation.colors;
        const border = faceBorder(this.hass, this.config);
        const foreground = this._foregroundForBackground(colors.center);
        const secondary = this.config.label !== undefined
            ? presentationValue(this.hass, this.config, this.config.label, 'Unavailable') : presentation.secondary;
        const name = this.config.name === undefined ? ''
            : presentationValue(this.hass, this.config, this.config.name, 'Unavailable');
        const icon = presentationValue(this.hass, this.config, this.config.icon, 'mdi:hexagon-outline');
        const metrics = contentMetrics(this.size, !!name, !!secondary);

        return html`
            <div
                class="persistent-center"
                style="
                    --honeycomb-persistent-size: ${this.size}px;
                    --honeycomb-persistent-foreground: ${foreground};
                    --honeycomb-cube-icon: ${metrics.icon}px;
                    --honeycomb-cube-primary: ${metrics.primary}px;
                    --honeycomb-cube-secondary: ${metrics.secondary}px;
                "
            >
                ${renderHexFace(this.size, border, this.config.face_mode, colors)}

                <div class="content ${secondary ? 'has-secondary' : ''} ${name ? 'has-primary' : ''}">
                    ${(icon === '' || icon === 'honeycomb:bee') ? html`
                        <img
                            class="bee-icon ${this._beeFlapping ? 'flap' : ''}"
                            .src=${HONEYCOMB_BEE_PNG}
                            alt=""
                            aria-hidden="true">
                    ` : html`<ha-icon .icon=${icon}></ha-icon>`}
                    ${name ? html`<div class="primary">${name}</div>` : ''}
                    ${secondary ? html`<div class="secondary">${secondary}</div>` : ''}
                </div>

                ${this.config.interactive !== false && !this.config.disabled ? html`
                    <div
                        class="interaction-surface"
                        role="button"
                        tabindex="0"
                        aria-label=${name || 'Honeycomb control'}
                        @keydown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._executeAction(this.config.tap_action); } }}
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

export default HoneycombCube;
