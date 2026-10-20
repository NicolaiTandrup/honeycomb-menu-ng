import CubeElement from "./cube-element.js";
import { provideHass } from "./helpers.js";
const { buildCubeConfig, validatePhaseOne } = require('./core/cube-config.js');

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const { toCenterDescriptor } = require('./core/hub-launcher.js');

class HoneycombPersistentHub extends CubeElement
{
    static get is()
    {
        return 'honeycomb-persistent-hub';
    }

    constructor()
    {
        super();
        this._hubMenu = null;
        this._hubOpenScheduled = false;
        this._hubOpenRaf = null;
        this._anchorWatchRaf = null;
        this._lastAnchorX = null;
        this._lastAnchorY = null;
        this._menuContext = null;
        this._hubBaseFaceMode = 'cell';
        this._hubCenterDescriptor = null;
    }

    _ensureMenuContext()
    {
        if( ! this._menuContext && typeof window.honeycomb_menu_create_context === 'function' )
            this._menuContext = window.honeycomb_menu_create_context();

        return this._menuContext;
    }

    _openHoneycombMenu(menu)
    {
        const context = this._ensureMenuContext();

        if( context && typeof window.honeycomb_menu_in_context === 'function' )
            return window.honeycomb_menu_in_context(context, menu);

        return super._openHoneycombMenu(menu);
    }

    connectedCallback()
    {
        super.connectedCallback();

        // The host element is only a bootstrap/anchor when auto-open is
        // enabled. Keep it hidden so reconnect/edit transitions cannot flash
        // the default bee before the real persistent Hub is mounted.
        if( this.config && this.config.auto_open !== false )
            this.style.visibility = 'hidden';

        this._scheduleHubOpen();
    }

    firstUpdated()
    {
        this._scheduleHubOpen();
    }

    updated()
    {
        this._scheduleHubOpen();
    }

    disconnectedCallback()
    {
        if (this._anchorCleanup) { this._anchorCleanup(); this._anchorCleanup=null; }
        if( this._anchorWatchRaf )
        {
            cancelAnimationFrame(this._anchorWatchRaf);
            this._anchorWatchRaf = null;
        }

        if( this._hubOpenRaf )
        {
            cancelAnimationFrame(this._hubOpenRaf);
            this._hubOpenRaf = null;
        }

        // Lovelace edit mode can replace/preview cards faster than close
        // animations complete. Dispose the local overlay synchronously so a
        // removed Hub can never leave a ghost base on the dashboard.
        if( this._menuContext && typeof window.honeycomb_menu_context_dispose === 'function' )
            window.honeycomb_menu_context_dispose(this._menuContext);
        else if( this._hubMenu && this._hubMenu.isConnected )
            this._hubMenu.remove();

        super.disconnectedCallback();
        this._hubOpenScheduled = false;
        this._hubMenu = null;
        this._lastAnchorX = null;
        this._lastAnchorY = null;
        this._menuContext = null;
        this._hubCenterDescriptor = null;
    }

    _watchAnchor()
    {
        if (this._anchorCleanup) this._anchorCleanup();
        let frame = null;
        const measure = () => {
            frame = null;
            if (!this.isConnected || !(this._menuContext || {}).honeycomb) return;
            const rect = this.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const x=rect.left+rect.width/2, y=rect.top+rect.height/2;
            this._lastAnchorX=x; this._lastAnchorY=y;
            // Only the base follows the dashboard anchor; module centers remain locked.
            if (this._menuContext.navigation.phase === 'base') this._menuContext.honeycomb.reanchor(x,y);
            else if (this._menuContext.stack[0]) {
                const base=this._menuContext.stack[0].config || this._menuContext.stack[0];
                base.anchor_x=x; base.anchor_y=y;
            }
        };
        const schedule = () => { if (frame === null) frame=requestAnimationFrame(measure); };
        const resize = new ResizeObserver(schedule); resize.observe(this);
        const ancestors = new MutationObserver(schedule);
        for (let node=this;node && node !== document.body;node=node.parentElement || node.getRootNode().host)
            ancestors.observe(node,{attributes:true,attributeFilter:['style','class']});
        window.addEventListener('resize',schedule);
        document.addEventListener('scroll',schedule,true);
        this._anchorCleanup=()=>{
            if (frame !== null) cancelAnimationFrame(frame);
            resize.disconnect(); ancestors.disconnect();
            window.removeEventListener('resize',schedule); document.removeEventListener('scroll',schedule,true);
        };
        schedule();
    }

    _scheduleHubOpen()
    {
        if(
            this._hubOpenScheduled ||
            this._hubMenu ||
            ! this.isConnected ||
            ! this.config ||
            ! this.hass
        ) return;

        this._hubOpenScheduled = true;

        this._hubOpenRaf = requestAnimationFrame(() => {
            this._hubOpenRaf = null;
            this._hubOpenScheduled = false;

            if( ! this.isConnected || this._hubMenu )
                return;

            const opened = super._openMenu();

            if( opened )
            {
                this._hubMenu = opened;
                this._lastAnchorX = null;
                this._lastAnchorY = null;
                this._watchAnchor();

                this._trackHubMenu(opened);
            }
        });
    }

    _trackHubMenu(opened)
    {
        opened.addEventListener('closed',()=>queueMicrotask(()=>{
            if (!this.isConnected) return;
            const current=this._menuContext && this._menuContext.honeycomb;
            if (current && current !== opened) {
                this._hubMenu=current;
                this._trackHubMenu(current);
            } else {
                this._hubMenu=null;
                if (this.config.auto_open !== false) this._scheduleHubOpen();
            }
        }),{once:true});
    }

    _hubSlots(count, showLogo)
    {
        const noLogoLayouts = {
            1: [0],
            2: [2, 3],
            3: [2, 3, 0],
            4: [1, 2, 0, 3],
            5: [1, 2, 0, 3, 4],
            6: [1, 2, 3, 4, 5, 6],
            7: [0, 1, 2, 3, 4, 5, 6]
        };

        const logoLayouts = {
            1: [2],
            2: [2, 3],
            3: [2, 4, 6],
            4: [2, 3, 1, 4],
            5: [1, 2, 3, 4, 5],
            6: [1, 2, 3, 4, 5, 6]
        };

        if (count <= 7) return (showLogo ? logoLayouts[count] : noLogoLayouts[count]) || [];
        return Array.from({length:count},(_,index)=>showLogo ? index+1 : index);
    }

    _shouldShowLogo()
    {
        if ((this.config && this.config.items || []).some(item=>item.slot === 0)) return false;
        const logo = this.config ? this.config.logo : 'auto';
        const count = this.config && Array.isArray(this.config.items)
            ? this.config.items.filter(Boolean).length
            : 0;

        // Branding yields the center to real items at seven or more items.
        if( count >= 7 )
            return false;

        if( logo === false || logo === 'hide' || logo === 'hidden' )
            return false;

        if( logo === true || logo === 'show' || logo === 'visible' )
            return count >= 1;

        // Auto branding is useful when the center would otherwise be empty.
        return count >= 2 && count <= 6;
    }

    _persistentMenuConfig()
    {
        const menu = super._persistentMenuConfig();

        if( ! menu )
            return menu;

        menu.button_defaults=merge({}, (this.config.menu || {}).button_defaults || {});
        menu.idle_timeout = 0;
        menu._persistent_hub_root = true;

        // The persistent Hub is the stable dashboard base, not a popup level.
        // It should be present immediately on first render and when returning
        // from a detail level. Detail/nested Honeycomb menus keep normal classic
        // animation because they do not inherit this flag.
        menu.animate = false;

        const showLogo = this._shouldShowLogo();

        if( showLogo )
        {
            menu.persistent_center = merge(
                {},
                menu.persistent_center || {},
                {
                    icon: 'honeycomb:bee',
                    interactive: true,
                    tap_action: { action: 'honeycomb-bee-flap' },
                    show_brightness: 'never',
                    mode: 'hub',
                    face_mode: this.config.base_face_mode || 'cell'
                }
            );
            menu.center_button = null;
        }
        else
        {
            const center = this._hubCenterDescriptor;

            if( center && center.config )
            {
                if( center.kind === 'persistent' )
                {
                    // Physical slot 0 uses the same native control contract as
                    // the exact same module would use on the ring. Sonos/light
                    // therefore keep native live state + hold-to-open behavior.
                    menu.persistent_center = merge({}, menu.button_defaults, center.config);
                    menu.center_button = null;
                }
                else
                {
                    menu.persistent_center = null;
                    menu.center_button = merge({}, center.config);
                }
            }
            else
            {
                menu.persistent_center = null;
                menu.center_button = false;
            }
        }

        return menu;
    }

    _launcherButton(item, index, slot, resolvedModule = null)
    {
        return buildCubeConfig(item, this.hass, index, slot);
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Hub requires a configuration.');

        validatePhaseOne(config);
        if (!this._hasHassProvider) { this._hasHassProvider=true; provideHass(this); }
        const next = merge({}, config);

        _defaults(next, {
            mode: 'hub',
            size: 82,
            icon: 'honeycomb:bee',
            name: 'Honeycomb',
            items: [],
            auto_open: true,
            logo: 'auto',
            base_face_mode: 'cell',
            tap_action: { action: 'honeycomb-bee-flap' },
            show_brightness: 'never',
            colors: {
                center: '#f2b705',
                inner_border: '#17191c',
                outer_border: '#34383d',
                unavailable: '#20262d'
            }
        });

        this._hubBaseFaceMode = next.base_face_mode || 'cell';

        // The underlying custom element is only an anchor/bootstrap while the
        // persistent base is auto-open. Never let its default bee become a
        // transitional frame between local menu states.
        next.restore_on_close = next.auto_open === false;
        this.style.visibility = next.auto_open === false ? '' : 'hidden';

        const items = (next.items || []).filter(Boolean);
        const showLogo = this._shouldShowLogo.call({ config: next }) && !items.some(item=>item.slot === 0);
        const slots = this._hubSlots(items.length, showLogo);

        const resolved = items.map((item, index) => {
            const targetSlot = item.slot !== undefined ? Number(item.slot) : slots[index];
            const slot = Number.isInteger(targetSlot) ? targetSlot : slots[index];
            const module = moduleRegistry.resolve(item, this.hass);
            const launcher = this._launcherButton(item, index, slot, module);

            return {
                item,
                index,
                slot,
                module,
                launcher
            };
        });

        const centerEntry = ! showLogo
            ? resolved.find(entry => entry.slot === 0)
            : null;

        this._hubCenterButton = centerEntry
            ? centerEntry.launcher
            : null;
        this._hubCenterDescriptor = centerEntry
            ? toCenterDescriptor(centerEntry.module, centerEntry.launcher)
            : null;

        const ringButtons = resolved
            .filter(entry => entry.slot !== 0)
            .map(entry => entry.launcher);

        next.menu = merge({}, next.menu || {}, {
            empty_slots: 'hidden',
            idle_timeout: 0,
            buttons: ringButtons
        });

        super.setConfig(next);
    }
}

if( ! customElements.get(HoneycombPersistentHub.is) )
    customElements.define(HoneycombPersistentHub.is, HoneycombPersistentHub);

window.customCards = window.customCards || [];

if( ! window.customCards.some(card => card.type === HoneycombPersistentHub.is) )
{
    window.customCards.push({
        type: HoneycombPersistentHub.is,
        name: 'Honeycomb Persistent Hub',
        description: 'Direct persistent Honeycomb hub launcher for lights, media and future control types.'
    });
}

export default HoneycombPersistentHub;
