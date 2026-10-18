import HoneycombCube from './honeycomb-cube.js';

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const { hubSlots } = require('./core/hub-items.js');
const { normalizeLauncher } = require('./core/hub-launcher.js');

class HoneycombPersistentHub extends HoneycombCube
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
            return window.honeycomb_menu_in_context(context, menu, this.config);

        return super._openHoneycombMenu(menu);
    }

    connectedCallback()
    {
        super.connectedCallback();

        // The host element is only a bootstrap/anchor when auto-open is
        // enabled. Keep it hidden so reconnect/edit transitions cannot flash
        // the default bee before the real persistent Hub is mounted.
        if( !this._singleControl && this.config && this.config.auto_open !== false )
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

                    // Refresh the saved base anchor during responsive layout,
                    // while a promoted child retains its locked module anchor.
                    const context = this._menuContext;
                    const base = context && context.stack[0];
                    if (base && base.config) {
                        base.config.anchor_x = x;
                        base.config.anchor_y = y;
                    }
                    if (!context || !context.moduleAnchor)
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
            this._singleControl ||
            (this.config && this.config.auto_open === false) ||
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

            this._openMenu();
        });
    }

    _openMenu()
    {
        const opened = super._openMenu();
        if (opened && !this._singleControl) this._trackMenu(opened);
        return opened;
    }

    _trackMenu(menu)
    {
        if (this._hubMenu === menu) return;
        this._hubMenu = menu;
        this._lastAnchorX = this._lastAnchorY = null;
        this._watchAnchor();
        menu.addEventListener('closed', () => {
            // A replacement/back may install its next renderer synchronously
            // after the old one closes. Follow the context; never open a second
            // base over an existing child.
            setTimeout(() => {
                if (!this.isConnected || this._singleControl) return;
                const next = this._menuContext && this._menuContext.honeycomb;
                if (next && !next.closing) this._trackMenu(next);
                else {
                    this._hubMenu = null;
                    if (this.config.auto_open !== false) this._scheduleHubOpen();
                }
            }, 0);
        }, {once:true});
    }

    _hubSlots(count, showLogo)
    {
        return hubSlots(count, showLogo);
    }

    _shouldShowLogo()
    {
        const logo = this.config ? this.config.logo : 'auto';
        if (logo === 'auto' && (this.config.items || []).some(item => item &&
            (item.slot === 0 || (typeof item.slot === 'string' && item.slot.trim() && Number(item.slot) === 0))))
            return false;
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

        if( ! menu || this._singleControl )
            return menu;

        menu.idle_timeout = 0;
        menu._persistent_hub_root = true;

        // The persistent Hub is the stable dashboard base, not a popup level.
        // It should be present immediately on first render and when returning
        // from a detail level. Detail/nested Honeycomb menus keep normal classic
        // animation because they do not inherit this flag.
        menu.animate = false;

        menu._hub_items = this._hubItems;
        menu._hub_show_logo = this._shouldShowLogo();
        menu._hub_logo = merge({}, menu.persistent_center || {}, {
            icon: 'honeycomb:bee', name: '', label: '', interactive: true,
            tap_action: { action: 'honeycomb-bee-flap' },
            show_brightness: 'never', mode: 'hub', face_mode: this._hubBaseFaceMode
        });
        menu.persistent_center = null;
        menu.center_button = false;

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

        const launcher = normalizeLauncher(module, module.buildLauncher({
            item,
            index,
            slot,
            submenu,
            hass: this.hass
        }));

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

        const single = !Object.prototype.hasOwnProperty.call(config, 'items');
        if (this._hubOpenRaf) cancelAnimationFrame(this._hubOpenRaf);
        if (this._anchorWatchRaf) cancelAnimationFrame(this._anchorWatchRaf);
        this._hubOpenRaf = this._anchorWatchRaf = null;
        this._hubOpenScheduled = false;
        // Switching modes during Lovelace editing must not orphan an overlay.
        if (this._menuContext && this.config)
            window.honeycomb_menu_context_dispose(this._menuContext);
        this._hubMenu = null;
        this._singleControl = single;
        if (single) {
            super.setConfig(merge({size:82, mode:config.entity ? 'persistent' : 'hub'}, config));
            this.style.visibility = '';
            return;
        }
        const next = merge({}, config);

        _defaults(next, {
            mode: 'hub',
            size: 82,
            icon: 'honeycomb:bee',
            name: '',
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

        this._hubBaseFaceMode = config.base_face_mode || config.face_mode || 'cell';

        // The underlying custom element is only an anchor/bootstrap while the
        // persistent base is auto-open. Never let its default bee become a
        // transitional frame between local menu states.
        next.restore_on_close = next.auto_open === false;
        this.style.visibility = next.auto_open === false ? '' : 'hidden';

        const items = (next.items || []).filter(Boolean);
        const showLogo = this._shouldShowLogo.call({ config: next });
        const slots = this._hubSlots(items.length, showLogo);
        const defaults = merge({}, (next.menu || {}).button_defaults || {}, next.button_defaults || {});
        this._hubItems = items.map((source, index) => {
            const item = merge({}, defaults, source);
            const slot = item.slot !== undefined ? item.slot : slots[index];
            const module = moduleRegistry.resolve(item, this.hass);
            return merge({}, this._launcherButton(item, index, slot, module), {
                _hub_key: index, slot
            });
        });
        next.menu = merge({}, next.menu || {}, {
            empty_slots: 'hidden', idle_timeout: 0, buttons: [],
            button_defaults: defaults
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
