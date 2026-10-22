// Auto is an input to the existing numeric geometry engine, never a CSS scale.
const DEFAULT_SIZE=82;
function numericSize(value) {
    if(value==='auto' || value===undefined)return DEFAULT_SIZE;
    const size=Number(value);
    if(!Number.isFinite(size) || size<=0)throw new Error('Cube size must be auto or a positive finite number.');
    return size;
}
function position(value,free) {
    const keywords={left:'0%',top:'0%',center:'50%',right:'100%',bottom:'100%'};
    value=keywords[value] || value;
    if(/^-?[\d.]+%$/.test(value))return free*parseFloat(value)/100;
    if(/^-?[\d.]+px$/.test(value))return parseFloat(value);
    return null;
}
// The returned image rectangle may extend beyond the viewport when cover crops.
function imageFrame({width,height,naturalWidth,naturalHeight,fit='cover',objectPosition='50% 50%'}) {
    if(![width,height,naturalWidth,naturalHeight].every(v=>Number.isFinite(v)&&v>0))return null;
    const sx=width/naturalWidth,sy=height/naturalHeight;
    if(!['contain','cover','fill','none','scale-down'].includes(fit))return null;
    if(fit==='fill' && Math.abs(sx/sy-1)>.005)return null; // No misleading single scale for stretched images.
    const scale=fit==='none'?1:fit==='cover'?Math.max(sx,sy):fit==='scale-down'?Math.min(1,sx,sy):Math.min(sx,sy);
    const renderedWidth=naturalWidth*scale,renderedHeight=naturalHeight*scale;
    const parts=objectPosition.trim().split(/\s+/);if(parts.length===1)parts.push('50%');
    if(parts.length!==2)return null;
    const x=position(parts[0],width-renderedWidth),y=position(parts[1],height-renderedHeight);
    return x===null||y===null?null:{scale,width:renderedWidth,height:renderedHeight,x,y};
}
function composedParent(node){return node.parentElement || (node.getRootNode && node.getRootNode().host);}
function pictureCard(host){for(let node=composedParent(host);node;node=composedParent(node))if(node.localName==='hui-picture-elements-card')return node;return null;}
const records=new WeakMap();
let activeRecords=0;
function observeImage(host,notify) {
    const card=pictureCard(host);
    if(!card || typeof ResizeObserver!=='function'){notify({size:82,dx:0,dy:0});return ()=>{};}
    let record=records.get(card);
    if(!record){record=createRecord(card);records.set(card,record);activeRecords++;}
    record.clients.set(host,notify);record.watchClient(host);record.schedule();
    return ()=>{record.clients.delete(host);if(!record.clients.size){record.dispose();records.delete(card);activeRecords--;}else record.rewatch();};
}
function createRecord(card){
    const clients=new Map();let raf=null,image=null,root=null,imageHost=null;
    const schedule=()=>{if(raf===null)raf=requestAnimationFrame(measure);};
    const resize=new ResizeObserver(schedule),mutation=new MutationObserver(schedule);
    const observed=new Set();
    function watch(force=false){
        const nextRoot=card.shadowRoot && card.shadowRoot.querySelector('#root');
        const nextHost=nextRoot && [...nextRoot.children].find(n=>n.localName==='hui-image');
        const next=nextHost && nextHost.shadowRoot && nextHost.shadowRoot.querySelector('img#image');
        if(!force && nextRoot===root && nextHost===imageHost && next===image)return;
        if(image)image.removeEventListener('load',schedule);
        root=nextRoot;imageHost=nextHost;image=next;resize.disconnect();mutation.disconnect();observed.clear();
        for(const node of [card,card.shadowRoot,root,imageHost,imageHost && imageHost.shadowRoot,image]){
            if(!node || observed.has(node))continue;observed.add(node);
            mutation.observe(node,{childList:true,subtree:node===(imageHost && imageHost.shadowRoot),attributes:true,attributeFilter:['src','srcset','style','class']});
            if(node.nodeType===1)resize.observe(node);
        }
        if(image)image.addEventListener('load',schedule);
        for(const host of clients.keys())watchClient(host);
    }
    function watchClient(host){mutation.observe(host,{attributes:true,attributeFilter:['style','class']});}
    function measure(){
        raf=null;watch();let frame=null,rect=null,rootRect=null;
        if(image && image.complete && image.naturalWidth && root){
            rect=image.getBoundingClientRect();rootRect=root.getBoundingClientRect();
            const style=getComputedStyle(image);
            // Reject borders/padding, CSS scaling/rotation/skew/mirroring.
            let supported=['paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderTopWidth','borderRightWidth','borderBottomWidth'].every(k=>parseFloat(style[k])===0);
            for(let n=image;n && supported;n=composedParent(n)){
                const t=getComputedStyle(n).transform;
                if(t && t!=='none'){try{const m=new DOMMatrixReadOnly(t);supported=m.is2D && Math.abs(m.b)<.0001 && Math.abs(m.c)<.0001 && m.a>0 && Math.abs(m.a-1)<.0001 && Math.abs(m.d-1)<.0001;}catch(_){supported=false;}}
            }
            if(supported)frame=imageFrame({width:rect.width,height:rect.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:style.objectFit,objectPosition:style.objectPosition});
        }
        for(const [host,callback] of clients){
            let dx=0,dy=0;
            if(frame){
                const left=host.style.left,top=host.style.top;
                // Percentages are interpreted in the actual image frame, once.
                if(host.offsetParent===root && /^[-\d.]+%$/.test(left)&&/^[-\d.]+%$/.test(top)){
                    const x=parseFloat(left)/100,y=parseFloat(top)/100;
                    dx=rect.left+frame.x+x*frame.width-(rootRect.left+root.clientLeft+x*root.clientWidth);
                    dy=rect.top+frame.y+y*frame.height-(rootRect.top+root.clientTop+y*root.clientHeight);
                }
            }
            const bounds=card.getBoundingClientRect();
            callback({size:frame?82*frame.scale:82,dx,dy,visible:bounds.width>0 && bounds.height>0 && !['hidden','collapse'].includes(getComputedStyle(card).visibility)});
        }
    }
    resize.observe(card);mutation.observe(card,{childList:true});
    if(card.shadowRoot)mutation.observe(card.shadowRoot,{childList:true,subtree:true});
    window.addEventListener('resize',schedule);document.addEventListener('visibilitychange',schedule);
    return {clients,schedule,watchClient,rewatch:()=>watch(true),dispose(){if(raf!==null)cancelAnimationFrame(raf);resize.disconnect();mutation.disconnect();if(image)image.removeEventListener('load',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('visibilitychange',schedule);}};
}
module.exports={numericSize,imageFrame,observeImage,pictureCard,diagnostics:()=>({imageObservers:activeRecords})};
