import {LitElement,html,css,svg} from 'lit';
import {styleMap} from 'lit/directives/style-map.js';
const info=require('./core/info-cube');
import './honeycomb-menu-item.js';

// The shell is an ordinary shared CubeElement. Only the read-only text layout
// and modal lifetime belong here; modules never implement their own overlay.
class InfoCube extends LitElement {
    static get properties(){return {config:{},_page:{state:true},_layout:{state:true},_geometry:{state:true}};}
    static get styles(){return css`
        :host{position:fixed;inset:0;z-index:10001;display:block;touch-action:none;}
        .backdrop{position:absolute;inset:0;background:transparent;}
        .surface{position:absolute;outline:none;cursor:pointer;touch-action:none;}
        .surface:focus-visible{outline:2px solid var(--primary-color,#2196f3);outline-offset:-6px;}
        honeycomb-menu-ng-item{position:absolute;inset:0;pointer-events:none;}
        .text{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;}
        text{font-family:sans-serif;user-select:none;}
        .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;}
    `;}
    constructor(){
        super();this._page=0;this._geometry=null;this._layout=null;
        this._resize=()=>this._relayout();
        this._keys=e=>{
            const open=document.querySelectorAll('honeycomb-ng-info');
            if(!this.isConnected || open[open.length-1]!==this)return;
            if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this._return();}
            else if(['PageDown','PageUp','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();this._turn(['PageDown','ArrowDown'].includes(e.key)?1:-1);}
            else if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();this._focusSurface();}
        };
    }
    set hass(value){
        this._hass=value;if(!this.config)return;
        const signature=JSON.stringify(info.dependencies(this.config).map(id=>value&&value.states&&value.states[id]));
        this._signature=signature;this._relayout();
    }
    get hass(){return this._hass;}
    configure(config,{paintSnapshot,hass,anchor,size,observe,positionElement,readGeometry,onReturn,onExpire}){
        info.validate(config);this.paintSnapshot=require('./core/info-paint').resolve(config,paintSnapshot);this.config=config;this.anchor=anchor;this.cubeSize=size;this.observe=observe;this.readGeometry=readGeometry;
        this.positionElement=positionElement;
        this.onReturn=onReturn;this.onExpire=onExpire;this.hass=hass;
    }
    connectedCallback(){
        super.connectedCallback();window.addEventListener('resize',this._resize);
        window.visualViewport && window.visualViewport.addEventListener('resize',this._resize);
        document.addEventListener('keydown',this._keys,true);
        this._timer=setTimeout(()=>{this._timer=null;this.onExpire && this.onExpire();},30000);
        if(typeof ResizeObserver!=='undefined' && this.observe){this._observer=new ResizeObserver(this._resize);this._observer.observe(this.observe);}
        if(this.positionElement){this._positionObserver=new MutationObserver(this._resize);this._positionObserver.observe(this.positionElement,{attributes:true,attributeFilter:['style']});}
        this._relayout();this.updateComplete.then(()=>{if(this.isConnected)this._focusSurface();});
    }
    disconnectedCallback(){
        super.disconnectedCallback();clearTimeout(this._timer);this._timer=null;
        window.removeEventListener('resize',this._resize);window.visualViewport && window.visualViewport.removeEventListener('resize',this._resize);
        document.removeEventListener('keydown',this._keys,true);
        if(this._observer)this._observer.disconnect();this._observer=null;
        if(this._positionObserver)this._positionObserver.disconnect();this._positionObserver=null;this.positionElement=null;
        this.observe=null;this.readGeometry=null;this.onReturn=null;this.onExpire=null;
    }
    _relayout(){
        if(!this.config||!this.anchor)return;
        if(this.readGeometry){const current=this.readGeometry();this.anchor=current.anchor;this.cubeSize=current.size;this.source=current.source;}
        const footprint=info.footprint(this.cubeSize),viewport=window.visualViewport;
        const vw=viewport && viewport.width||innerWidth,vh=viewport && viewport.height||innerHeight;
        const ox=viewport&&viewport.offsetLeft||0,oy=viewport&&viewport.offsetTop||0;
        const width=Math.max(1,Math.min(footprint.width*(this.config.scale||1),2*Math.max(0,Math.min(this.anchor.x-ox-12,ox+vw-12-this.anchor.x)),2*Math.max(0,Math.min(this.anchor.y-oy-12,oy+vh-12-this.anchor.y))/1.1547));
        const height=width*1.1547;
        const geometry={width,height,left:this.anchor.x-width/2,top:this.anchor.y-height/2,footprint};
        geometry.connector=info.connector(this.config,this.source,geometry);
        const geometryKey=JSON.stringify(geometry);
        if(geometryKey!==this._geometryKey){this._geometry=geometry;this._geometryKey=geometryKey;}
        if(this._layout && this._layoutWidth===width && this._layoutSignature===this._signature)return;
        this._layoutWidth=width;this._layoutSignature=this._signature;
        this._canvas=this._canvas||document.createElement('canvas');const context=this._canvas.getContext('2d');
        this._layout=info.layoutText(this.config,this.hass,width,(text,font)=>{context.font=font;return context.measureText(text).width;});
        this._page=Math.min(this._page,this._layout.pages.length-1);
    }
    _focusSurface(){const surface=this.shadowRoot.querySelector('.surface');if(surface)surface.focus();}
    _return(){this.onReturn && this.onReturn();}
    _turn(delta){if(this._layout)this._page=Math.max(0,Math.min(this._layout.pages.length-1,this._page+delta));}
    render(){
        const g=this._geometry,l=this._layout;if(!g||!l)return html``;
        const label=l.pages.length>1?`${this._page+1}/${l.pages.length}`:l.warnings.length?'Limited':'Tap to return';
        const footerY=g.height*.84,limits=info.band(g.width,g.height,footerY-12,footerY+4,17),ctx=this._canvas.getContext('2d');ctx.font='400 12px sans-serif';
        const footer=[label,'Return','↩',''].find(text=>ctx.measureText(text).width<=limits.width);
        return html`<div class="backdrop" @pointerdown=${e=>e.stopPropagation()} @click=${e=>e.stopPropagation()}></div>
        <div class="surface" role="dialog" aria-modal="true" tabindex="0" aria-label=${info.value(this.config.title,this.hass)||'Information'} aria-describedby="info-description"
            style=${styleMap({left:g.left+'px',top:g.top+'px',width:g.width+'px',height:g.height+'px',clipPath:'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)'})}
            @wheel=${e=>{e.preventDefault();e.stopPropagation();if(Math.abs(e.deltaY)>2)this._turn(Math.sign(e.deltaY));}}
            @pointerdown=${e=>{e.stopPropagation();this._pointer={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
            @pointerup=${e=>{e.stopPropagation();const p=this._pointer;this._pointer=null;if(!p||p.id!==e.pointerId)return;const dy=e.clientY-p.y;if(Math.abs(dy)>20)this._turn(dy<0?1:-1);else if(Math.abs(e.clientX-p.x)<12)this._return();}}
            @pointercancel=${()=>{this._pointer=null;}} @click=${e=>e.stopPropagation()}>
            <honeycomb-menu-ng-item style=${`width:${g.width}px;--honeycomb-persistent-size:${g.width}px`} .paintSnapshot=${this.paintSnapshot} .config=${info.shell(this.config)} .size=${g.width} .hass=${this.hass}></honeycomb-menu-ng-item>
            ${g.connector?html`<svg class="text connector" viewBox=${`0 0 ${g.width} ${g.height}`} aria-hidden="true"><line x1=${g.connector.x1} y1=${g.connector.y1} x2=${g.connector.x2} y2=${g.connector.y2} stroke=${g.connector.color} stroke-width="4" stroke-linecap="round"></line></svg>`:''}
            <svg class="text" viewBox=${`0 0 ${g.width} ${g.height}`} role="img" aria-label=${`Page ${this._page+1} of ${l.pages.length}`}>
                <defs><clipPath id="info-safe"><polygon points=${`${g.width/2},17 ${g.width-17},${g.height/4+9} ${g.width-17},${g.height*.75-9} ${g.width/2},${g.height-17} 17,${g.height*.75-9} 17,${g.height/4+9}`}></polygon></clipPath></defs>
                <g clip-path="url(#info-safe)">
                ${l.pages[this._page].map(line=>{
                    const x=line.align==='center'?line.x-line.width/2:line.align==='right'?line.x-line.width:line.x;
                    return svg`<g>${line.background?svg`<rect x=${x} y=${line.top} width=${line.width} height=${line.bottom-line.top} fill=${line.background}></rect>`:''}
                    <text class="info-line" x=${line.x} y=${line.y} font-size=${line.size} font-weight=${line.weight} fill=${line.color} text-anchor=${line.align==='center'?'middle':line.align==='right'?'end':'start'}>${line.text}</text></g>`;
                })}
                <text class="footer" x=${g.width/2} y=${footerY} font-size="12" fill=${(this.config.colors && this.config.colors.foreground)||'#f6f7f9'} text-anchor="middle">${footer}</text>
                </g>
            </svg>
            <span id="info-description" class="sr">${l.text}. Tap or press Enter or Escape to return. Fixed 30 second lifetime. ${l.pages.length>1?'Swipe, scroll or use PageDown/PageUp for more pages.':''} ${l.warnings.join('. ')}</span>
            <span class="sr" role="status" aria-live="polite">Page ${this._page+1} of ${l.pages.length}</span>
        </div>`;
    }
}
if(!customElements.get('honeycomb-ng-info'))customElements.define('honeycomb-ng-info',InfoCube);
export default InfoCube;
