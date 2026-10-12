import HoneycombPersistentControl from "./honeycomb-persistent-control.js";

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const { toCenterDescriptor } = require('./core/hub-launcher.js');

class HoneycombPersistentHub extends HoneycombPersistentControl
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
        if( this._anchorWatchRaf )
            cancelAnimationFrame(this._anchorWatchRaf);

        const tick = () => {
            this._anchorWatchRaf = null;

            if( ! this.isConnected || ! this._hubMenu )
                return;

            const rect = this.getBoundingClientRect();

            if( rect.width > 0 && rect.height > 0 )
            {
                const x = rect.left + (rect.width / 2);
                const y = rect.top + (rect.height / 2);

                if(
                    this._lastAnchorX === null ||
                    this._lastAnchorY === null ||
                    Math.abs(x - this._lastAnchorX) > 0.5 ||
                    Math.abs(y - this._lastAnchorY) > 0.5
                )
                {
                    this._lastAnchorX = x;
                    this._lastAnchorY = y;

                    if( typeof this._hubMenu.reanchor === 'function' )
                        this._hubMenu.reanchor(x, y);
                }
            }

            this._anchorWatchRaf = requestAnimationFrame(tick);
        };

        this._anchorWatchRaf = requestAnimationFrame(tick);
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

                opened.addEventListener('closed', () => {
                    if( this._anchorWatchRaf )
                    {
                        cancelAnimationFrame(this._anchorWatchRaf);
                        this._anchorWatchRaf = null;
                    }

                    this._hubMenu = null;
                    this._lastAnchorX = null;
                    this._lastAnchorY = null;

                    if( this.isConnected && this.config && this.config.auto_open !== false )
                        setTimeout(() => this._scheduleHubOpen(), 0);
                }, { once: true });
            }
        });
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

        const safeCount = Math.max(1, Math.min(7, count));

        if( showLogo && safeCount <= 6 )
            return logoLayouts[safeCount] || [];

        return noLogoLayouts[safeCount] || [];
    }

    _shouldShowLogo()
    {
        const logo = this.config ? this.config.logo : 'auto';
        const count = this.config && Array.isArray(this.config.items)
            ? this.config.items.filter(Boolean).length
            : 0;

        // Seven real items always consume center slot 0 + ring slots 1-6.
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
                    menu.persistent_center = merge({}, center.config);
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
        const module = resolvedModule || moduleRegistry.resolve(item, this.hass);

        if( ! module )
            throw new Error(`No Honeycomb module could handle item type "${item && item.type}".`);

        const submenu = item.menu
            ? merge({}, item.menu)
            : (
                typeof module.buildMenu === 'function'
                    ? module.buildMenu({
                        item,
                        hass: this.hass
                    })
                    : null
            );

        if( typeof module.buildLauncher !== 'function' )
            throw new Error(`Honeycomb module "${module.id}" does not provide buildLauncher().`);

        const launcher = module.buildLauncher({
            item,
            index,
            slot,
            submenu,
            hass: this.hass
        });

        // Only the persistent Hub base uses the full physical hex cell.
        // Detail/promoted centers keep the normal inset face, so this does not
        // change the geometry that is already correct inside Light/Sonos menus.
        if( launcher && launcher.face_mode === undefined )
            launcher.face_mode = this._hubBaseFaceMode || 'cell';

        return launcher;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Hub requires a configuration.');

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

        const items = (next.items || []).filter(Boolean).slice(0, 7);
        const showLogo = this._shouldShowLogo.call({ config: next });
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
