import CubeElement from "./cube-element.js";
import { provideHass, getTemplateOrValue, stringToBool } from "./helpers.js";
const { buildCubeConfig, validateCubeConfig } = require('./core/cube-config.js');

const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { moduleRegistry } = require('./modules/index.js');
const { toCenterDescriptor } = require('./core/hub-launcher.js');
const { VisibilityIndex } = require('./core/visibility.js');
const collapsibleHub=require('./core/collapsible-hub');
const expandedLayout=require('./core/expanded-layout');
const bee=require('./core/bee');
const navigationCore=require('./core/navigation-context');
const { allocateHubSlots } = require('./core/hub-allocation.js');

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
        this._hubMetrics = {allocations:0, commits:0};
        this._placements = new Map();
        this._diagnosticKeys = new Set();
    }

    _ensureMenuContext()
    {
        if( ! this._menuContext && typeof window.honeycombNG.createContext === 'function' )
        {
            this._menuContext = window.honeycombNG.createContext();
            this._menuContext.owner = this;
            this._menuContext.onIdle = () => this._scheduleStructure();
        }

        return this._menuContext;
    }

    _openHoneycombMenu(menu)
    {
        if(this._collapseOptions && !this._hubExpanded && this.config.size==='auto' && menu._persistent_hub_root){
            const size=this._floorplanSize();
            menu.size=size*3.586;
            if(menu.persistent_center)menu.persistent_center.size=size;
        }
        const context = this._ensureMenuContext();

        if( context && typeof window.honeycombNG.openInContext === 'function' )
            return window.honeycombNG.openInContext(context, menu);

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

        if (this._visibilityIndex) {
            this.hass = this.hass;
            this._flushStructure();
        }
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
        if (this._structureRaf) cancelAnimationFrame(this._structureRaf);
        this._structureRaf = null; this._structureScheduled = false;
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
        if( this._menuContext && typeof window.honeycombNG.disposeContext === 'function' )
            window.honeycombNG.disposeContext(this._menuContext);
        else if( this._hubMenu && this._hubMenu.isConnected )
            this._hubMenu.remove();

        this._clearExpansion();
        super.disconnectedCallback();
        this._hubOpenScheduled = false;
        this._hubMenu = null;
        this._lastAnchorX = null;
        this._lastAnchorY = null;
        this._menuContext = null;
        this._pendingStructure = false;
    }

    _floorplanSize(rect=this.getBoundingClientRect())
    {
        // Auto is already resolved by the shared image-sizing engine. A layout
        // box or an expanded scene must never become its numeric size source.
        return this.config.match_anchor_size===false || this.config.size==='auto' && this._imageAutoResolved ? this.size : rect.width;
    }

    _observeImageGeometry() { return super._observeImageGeometry() || !!this._collapseOptions; }
    _imageGeometryChanged() { if(this._hubExpanded)this._fitExpansion();else if(this._scheduleAnchorMeasure)this._scheduleAnchorMeasure(); }

    _resizeAutoMenu(menu,size)
    {
        if(this._hubExpanded)this._fitExpansion();
        else super._resizeAutoMenu(menu,size);
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
            const menu=this._menuContext.honeycomb;
            if(this._hubExpanded && this._collapseOptions){this._fitExpansion();return;}
            const itemSize=this._collapseOptions && this.config.size==='auto'?this._floorplanSize(rect):menu.offsetParent?rect.width:this.size;
            if (this.config.match_anchor_size !== false && Math.abs(menu.sizes.item-itemSize)>.01)
                menu.resizeCubes(itemSize);
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
        this._scheduleAnchorMeasure=schedule;
        const resize = new ResizeObserver(schedule);
        const ancestors = new MutationObserver(schedule);
        for (let node=this;node && node !== document.body;node=node.parentElement || node.getRootNode().host) {
            resize.observe(node);
            ancestors.observe(node,{attributes:true,attributeFilter:['style','class'],childList:true});
        }
        window.addEventListener('resize',schedule);
        document.addEventListener('scroll',schedule,true);
        this._anchorCleanup=()=>{
            this._scheduleAnchorMeasure=null;
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
        opened.addEventListener('honeycomb-ng-closed',()=>queueMicrotask(()=>{
            if (!this.isConnected) return;
            const current=this._menuContext && this._menuContext.honeycomb;
            if (current && current !== opened) {
                this._hubMenu=current;
                this._trackHubMenu(current);
            } else {
                this._hubMenu=null;
                this._flushStructure();
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
        if ((this.config && this.config.items || []).some(item=>item && Number(item.slot) === 0)) return false;
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

        const showLogo = this._hubShowLogo;

        if( showLogo )
        {
            menu.persistent_center=bee.descriptor(merge({},menu.persistent_center || {},{
                colors:this.config.colors,border:this.config.border,styles:this.config.styles,interactive:true,
                tap_action:{action:'honeycomb-bee-flap'},hold_action:{action:'honeycomb-bee-flap'},
                face_mode:this.config.base_face_mode || 'cell'
            }),{explicitCenter:this._logoExplicitCenter});
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

        if(this._collapseOptions) {
            menu._collapsible_hub=true;
            const primary=this._hubEntries.find(entry=>entry.slot===0);
            if(!this._hubExpanded) {
                const size=this._floorplanSize();
                menu.size=size*3.586;
                menu.buttons=[];
                const descriptor=toCenterDescriptor(primary.module,primary.launcher);
                const center=merge({},descriptor.config,{size,hold_action:{action:'honeycomb-hub-expand'},autoclose:false});
                if(!this._placements.has(primary.id)){menu.persistent_center=null;menu.center_button=false;}
                else if(descriptor.kind==='persistent'){menu.persistent_center=center;menu.center_button=null;}
                else {menu.center_button=center;menu.persistent_center=null;}
            } else {
                const entries=this._hubEntries.map(entry=>({...entry,visible:this._placements.has(entry.id)}));
                const allocation=collapsibleHub.expandedAllocation(entries,primary,this._collapseOptions,this._expandedPlacements);
                this._expandedPlacements=allocation.placements;
                menu.buttons=entries.filter(entry=>allocation.placements.has(entry.id)&&allocation.placements.get(entry.id)!==0)
                    .map(entry=>({...entry.launcher,slot:allocation.placements.get(entry.id),slot_mode:'hard',autoclose:false}));
                if(this._collapseOptions.expanded_center==='bee') {
                    menu.persistent_center=bee.descriptor({colors:this.config.colors,border:this.config.border,styles:this.config.styles,background:this.config.background,foreground:this.config.foreground},
                        {collapse:true,explicitCenter:this._logoExplicitCenter});
                    menu.center_button=null;
                } else {
                    const center=menu.persistent_center || menu.center_button;
                    if(center){center.autoclose=false;center.tap_action={action:'honeycomb-hub-collapse'};center.hold_action={action:'none'};delete center.double_tap_action;}
                }
                menu.idle_timeout=this._collapseOptions.idle_timeout;
            }
        }
        return menu;
    }

    _expandHub({pointerId=null}={})
    {
        if(!this._collapseOptions || this._hubExpanded || this.preview)return;
        this._hubExpanded=true;
        this._expansionReadyAt=pointerId===null?0:Date.now()+500;
        this._expansionCapture=e=>{
            if(Date.now()<this._expansionReadyAt){this._expansionReadyAt=0;e.preventDefault();e.stopImmediatePropagation();}
        };
        this._hubMenu.addEventListener('click',this._expansionCapture,true);
        window.honeycombNG.updateBase(this._menuContext,this._persistentMenuConfig());
        this._hubMenu._resetIdleTimeout();
        this._expansionResize=()=>this._fitExpansion();
        window.addEventListener('resize',this._expansionResize);
        if(window.visualViewport){visualViewport.addEventListener('resize',this._expansionResize);visualViewport.addEventListener('scroll',this._expansionResize);}
        this._expansionEscape=e=>{if(e.key==='Escape' && !e.defaultPrevented && !this._menuContext.info){e.preventDefault();window.honeycombNG.backInContext(this._menuContext);}};
        document.addEventListener('keydown',this._expansionEscape);
        this._expansionChromeResize=new ResizeObserver(this._expansionResize);
        this._expansionChromeMutation=new MutationObserver(this._expansionResize);
        for(const el of [...expandedLayout.chromeElements(this),document.documentElement]){
            this._expansionChromeResize.observe(el);this._expansionChromeMutation.observe(el,{attributes:true,attributeFilter:['class','style','hidden']});
        }
        this._fitExpansion();
    }

    _expansionEnvironment() { return expandedLayout.environment(this._hubMenu,this,this._floorplanImageRect); }

    _fitExpansion(options={})
    {
        const context=this._menuContext,menu=context && context.honeycomb;
        if(!this._hubExpanded || !menu || menu.closing || context.info)return;
        // Only an explicit legacy opt-out retains the old compact phone mode.
        // Default enlargement and desktop fitting never depend on a breakpoint.
        const compact=this._collapseOptions.small_screen===false && window.innerWidth<=600;
        if(compact)this._hideExpansionPopover(menu);
        else if(!menu.hasAttribute('popover')) {
            menu.setAttribute('popover','manual');
            menu.style.cssText+=';margin:0;padding:0;border:0;overflow:visible;background:transparent;inset:auto;';
            menu.showPopover();
            const openedAt=Date.now();
            this._expansionOutside=e=>{if(Date.now()-openedAt>500)this._handleExpansionOutside(e);};
            this._expansionPointerStart=e=>{const target=e.composedPath()[0];this._expansionOutsideDown=target===menu || !!(target.classList && target.classList.contains('hub-shield'));};
            menu.addEventListener('pointerdown',this._expansionPointerStart,true);
            menu.addEventListener('click',this._expansionOutside);
        }
        const environment=this._expansionEnvironment();
        if(navigationCore.isHubRoot(context.currentConfig)) {
            const f=expandedLayout.footprint(menu),rect=this.getBoundingClientRect(),key=environment.key+JSON.stringify(f)+(compact?JSON.stringify([rect.left,rect.top,this.size]):'');
            if(this._expandedRoot && this._expandedRoot.key===key && !options.entering){
                if(Math.abs(menu.sizes.item-this._expandedRoot.size)>.001)menu.resizeCubes(this._expandedRoot.size,{preserveStack:true});
                menu.reanchor(this._expandedRoot.x,this._expandedRoot.y);return;
            }
            const result=compact?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,size:this._floorplanSize(rect),region:{...environment.viewport,key:'compact'}}:expandedLayout.place(f,environment.viewport,environment.image,this._collapseOptions.expanded_size,this._expandedRoot);
            this._expandedRoot={...result,footprint:f,key};
            menu.resizeCubes(result.size,{preserveStack:true});menu.reanchor(result.x,result.y);
        } else {
            const root=this._expandedRoot;
            if(!root)return;
            const rect=this.getBoundingClientRect(),key=environment.key+JSON.stringify(root.footprint)+(compact?JSON.stringify([rect.left,rect.top,this.size]):'');
            if(root.key!==key) {
                const result=compact?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,size:this._floorplanSize(rect),region:{...environment.viewport,key:'compact'}}:expandedLayout.place(root.footprint,environment.viewport,environment.image,this._collapseOptions.expanded_size,root);
                this._expandedRoot={...result,footprint:root.footprint,key};
                const base=context.stack[0] && (context.stack[0].config || context.stack[0]);
                if(base){base.anchor_x=this._expandedRoot.x;base.anchor_y=this._expandedRoot.y;base.size=this._expandedRoot.size*3.586;if(base.persistent_center)base.persistent_center.size=this._expandedRoot.size;}
            }
            navigationCore.fitExpandedMenu(context,menu,environment,this._expandedRoot,options);
        }
    }

    _handleExpansionOutside(event)
    {
        const menu=this._menuContext && this._menuContext.honeycomb,target=event.composedPath()[0];
        const outside=target===menu || !!(target.classList && target.classList.contains('hub-shield'));
        if(outside && this._expansionOutsideDown){this._expansionOutsideDown=false;this._collapseHub();}
    }

    _hideExpansionPopover(menu)
    {
        if(menu && menu.hasAttribute('popover')) {
            menu.hidePopover();menu.removeAttribute('popover');
            menu.removeEventListener('click',this._expansionOutside);
            menu.removeEventListener('pointerdown',this._expansionPointerStart,true);this._expansionOutsideDown=false;
        }
    }

    _clearExpansion()
    {
        if(this._expansionChromeResize)this._expansionChromeResize.disconnect();
        if(this._expansionChromeMutation)this._expansionChromeMutation.disconnect();
        window.removeEventListener('resize',this._expansionResize);
        if(window.visualViewport){visualViewport.removeEventListener('resize',this._expansionResize);visualViewport.removeEventListener('scroll',this._expansionResize);}
        document.removeEventListener('keydown',this._expansionEscape);
        this._hideExpansionPopover(this._menuContext && this._menuContext.honeycomb);
        if(this._hubMenu)this._hubMenu.removeEventListener('click',this._expansionCapture,true);
        this._hubExpanded=false;this._expandedRoot=null;
    }

    _collapseHub()
    {
        if(!this._hubExpanded)return false;
        const context=this._menuContext;
        if(context.info)return false;
        const menu=context.honeycomb;
        for(const item of menu.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control'))item._cancelGesture();
        context.stack=[];
        context.currentConfig._persistent_hub_root=true;
        this._clearExpansion();
        const rect=this.getBoundingClientRect(),config=this._persistentMenuConfig();
        config.anchor_x=rect.left+rect.width/2;config.anchor_y=rect.top+rect.height/2;
        require('./core/navigation-context').resetNavigation(context);
        window.honeycombNG.updateBase(context,config);
        menu.resizeCubes(this._floorplanSize(rect));
        menu.reanchor(config.anchor_x,config.anchor_y);
        this._flushStructure();
        return true;
    }

    _launcherButton(item, index, slot, resolvedModule = null)
    {
        return buildCubeConfig(item, this.hass, index, slot);
    }

    get hass() { return super.hass; }
    set hass(value)
    {
        super.hass = value;
        if (!this._visibilityIndex) return;
        const changed = this._visibilityIndex.update(value);
        const showChanged = this._refreshLegacyShow();
        if (this._visibilityIndex.statusChanged || showChanged) this._publishDiagnostics();
        if (changed || showChanged) {
            this._pendingStructure = true;
            this._scheduleStructure();
        }
    }

    _refreshLegacyShow(initial = false)
    {
        let changed = false;
        for (const entry of this._legacyShowEntries || []) {
            if (!initial && !entry.liveShow) continue;
            let value = true;
            if (entry.show !== undefined) {
                try {
                    value = !!stringToBool(getTemplateOrValue(this.hass || {states:{}},
                        (this.hass && this.hass.states || {})[entry.item.entity], entry.item.variables || {}, entry.show));
                    this._showErrors.delete(entry.id);
                } catch (_) { value = false; this._showErrors.add(entry.id); }
            }
            if (this._showValues.get(entry.id) !== value) changed = true;
            this._showValues.set(entry.id, value);
        }
        return changed;
    }

    _structureBusy()
    {
        const context = this._menuContext;
        return !!(context && (context.info || context.stack.length || context.pointers.size || context.pendingActions.size ||
            (context.currentConfig && !context.currentConfig._persistent_hub_root))) ||
            !!(this._hubMenu && this._hubMenu.closing);
    }

    _scheduleStructure()
    {
        if (!this._pendingStructure || this._structureScheduled) return;
        this._structureScheduled = true;
        // Native events may run a microtask checkpoint between capture and
        // target listeners. A frame boundary guarantees the complete release
        // action (and any delayed double-tap token) has established ownership.
        this._structureRaf = requestAnimationFrame(() => {
            this._structureRaf = null;
            this._structureScheduled = false;
            if (this.isConnected) this._flushStructure();
        });
    }

    _flushStructure()
    {
        if (!this._pendingStructure || this._structureBusy()) return;
        this._pendingStructure = false;
        const mask = this._visibilityMask();
        if (mask === this._committedVisibility && !this._needsBaseRefresh) return;
        const changed = this._applyAllocation(this.config);
        if (!changed && !this._needsBaseRefresh) return;
        this._needsBaseRefresh = false;
        const context = this._menuContext;
        if (context && context.honeycomb) {
            const menu = this._persistentMenuConfig();
            menu.anchor_x = context.honeycomb._anchorX;
            menu.anchor_y = context.honeycomb._anchorY;
            window.honeycombNG.updateBase(context, menu);
        }
    }

    _publishDiagnostics()
    {
        this.diagnostics = (this._slotDiagnostics || []).concat(this._hubEntries
            .filter(entry => this._visibilityIndex.values.get(entry.id) === null)
            .map(entry => ({code:'visibility-indeterminate', id:entry.id})),
            [...(this._showErrors || [])].map(id => ({code:'show-error', id})));
        const keys = new Set(this.diagnostics.map(diagnostic => JSON.stringify(diagnostic)));
        for (const key of keys) if (!this._diagnosticKeys.has(key)) console.warn(`[Honeycomb Menu NG] ${key}`);
        this._diagnosticKeys = keys;
    }

    _visibilityMask()
    {
        return this._hubEntries.map(entry => this._visibilityIndex.values.get(entry.id) === true &&
            this._showValues.get(entry.id) !== false ? '1' : '0').join('');
    }

    _applyAllocation(config)
    {
        this._hubMetrics.allocations++;
        this._committedVisibility = this._visibilityMask();
        const entries = this._hubEntries.map(entry => ({...entry,
            visible:this._visibilityIndex.values.get(entry.id) === true && this._showValues.get(entry.id) !== false}));
        const result = allocateHubSlots(entries, {previous:this._placements, centerReserved:this._hubShowLogo});
        this._slotDiagnostics = result.diagnostics;
        this._publishDiagnostics();
        const signature = JSON.stringify([...result.placements].sort((a,b) => a[0].localeCompare(b[0])));
        if (signature === this._allocationSignature) return false;
        this._allocationSignature = signature;
        this._placements = result.placements;
        this._hubMetrics.commits++;
        const visible = entries.filter(entry => this._placements.has(entry.id)).map(entry => ({...entry,
            launcher:{...entry.launcher, slot:this._placements.get(entry.id), slot_mode:'hard'}}));
        const center = visible.find(entry => entry.launcher.slot === 0);
        this._hubCenterButton = center ? center.launcher : null;
        this._hubCenterDescriptor = center ? toCenterDescriptor(center.module, center.launcher) : null;
        config.menu = merge({}, this._baseMenuOptions, {empty_slots:'hidden', idle_timeout:0});
        config.menu.buttons = visible.filter(entry => entry.launcher.slot !== 0).map(entry => entry.launcher);
        return true;
    }

    setConfig(config)
    {
        if( ! config || typeof config !== 'object' )
            throw new Error('Honeycomb Persistent Hub requires a configuration.');

        validateCubeConfig(config, {hubItems:true});
        const collapseOptions=collapsibleHub.settings(config.collapsible);
        if(this._hubExpanded)this._collapseHub();
        this._collapseOptions=collapseOptions;
        if (!this._hasHassProvider) { this._hasHassProvider=true; provideHass(this); }
        const next = merge({}, config);
        this._logoExplicitCenter=!!(config.colors && config.colors.center && config.colors.center!=='auto');
        next._bee_explicit_center=this._logoExplicitCenter;

        _defaults(next, {
            mode: 'hub',
            size: collapseOptions ? 'auto' : 82,
            icon: 'honeycomb:bee',
            name: 'Honeycomb',
            items: [],
            auto_open: true,
            logo: collapseOptions ? false : 'auto',
            base_face_mode: 'cell',
            tap_action: { action: 'honeycomb-bee-flap' },
            show_brightness: 'never',
            colors: bee.COLORS
        });

        this._hubBaseFaceMode = next.base_face_mode || 'cell';

        // The underlying custom element is only an anchor/bootstrap while the
        // persistent base is auto-open. Never let its default bee become a
        // transitional frame between local menu states.
        next.restore_on_close = next.auto_open === false;
        this.style.visibility = next.auto_open === false ? '' : 'hidden';

        if (!Array.isArray(next.items)) throw new Error('Hub items must be a list.');
        const items = next.items.map((item,index) => ({item,index})).filter(entry => entry.item);
        const showLogo = this._shouldShowLogo.call({config:next});
        const slots = this._hubSlots(items.length, showLogo);
        const entries = items.map(({item,index}, order) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`items[${index}]: expected an item object.`);
            const mode = item.slot_mode === undefined ? 'hard' : item.slot_mode;
            if (!['hard','soft','priority'].includes(mode)) throw new Error(`items[${index}]: invalid slot_mode.`);
            if (mode === 'priority' && item.slot === undefined) throw new Error(`items[${index}]: priority requires a preferred slot.`);
            const id = `items[${index}]`;
            const requested = typeof item.slot === 'string' && /^\d+$/.test(item.slot) ? Number(item.slot) : item.slot;
            const slot = requested !== undefined ? requested : mode === 'soft' ? 0 : slots[order];
            const module = moduleRegistry.resolve(item, this.hass);
            const launcher = this._launcherButton(item, index, slot, module);
            launcher._hub_item_id = id;
            // The controller owns Hub show/visibility; classic allocation must
            // never reevaluate and mutate that gate while a gesture is active.
            delete launcher.show;
            const show = item.show !== undefined ? item.show : (item.persistent || {}).show;
            return {id, index, item, module, launcher, slot, mode, visibility:item.visibility, show,
                liveShow:typeof show === 'string' && /\[\[\[|HCJS:|\$\{/.test(show)};
        });
        if(collapseOptions) {
            const primary=entries.filter(entry=>entry.slot===0);
            if(primary.length!==1 || primary[0].mode!=='hard')throw Error('collapsible requires exactly one hard primary item in slot 0.');
            collapsibleHub.expandedAllocation(entries.map(entry=>({...entry,visible:true})),primary[0],collapseOptions);
        }
        const visibilityIndex = new VisibilityIndex(entries, this.hass);
        this._hubEntries = entries;
        this._hubShowLogo = showLogo;
        this._visibilityIndex = visibilityIndex;
        this._legacyShowEntries = entries.filter(entry => entry.show !== undefined);
        this._showValues = new Map();
        this._showErrors = new Set();
        this._refreshLegacyShow(true);
        this._allocationSignature = null;
        this._baseMenuOptions = merge({}, next.menu || {});
        this._applyAllocation(next);
        this._pendingStructure = false;
        this._ensureMenuContext();
        // Hub updates its compiled menu in place; a repeated YAML configuration
        // must replace that data even if it matches an earlier input signature.
        this._configInputSignature = undefined;
        super.setConfig(next);
        if (this._hubMenu) {
            this._needsBaseRefresh = true;
            this._pendingStructure = true;
            this._scheduleStructure();
        }
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
