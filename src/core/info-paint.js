// Info-only, immutable-at-open paint descriptions. Never copy markup or evaluate
// templates: read the source's rendered SVG paint, resolving local servers only.
const NS='http://www.w3.org/2000/svg';
const defaults={center:'rgba(52, 66, 78, 0.94)',inner_border:'#34424e',outer_border:'#34383d'};
const attrs=['x1','y1','x2','y2','cx','cy','r','fx','fy','fr','gradientUnits','gradientTransform','spreadMethod'];
function gradient(node,root,seen=new Set()){
    if(!node||!['linearGradient','radialGradient'].includes(node.localName)||seen.has(node)||seen.size>8)return null;
    seen.add(node);
    const href=node.getAttribute('href')||node.getAttributeNS('http://www.w3.org/1999/xlink','href');
    const parent=href&&href.startsWith('#')?gradient(root.getElementById(href.slice(1)),root,seen):null;
    const attributes={...(parent&&parent.attributes)};
    for(const key of attrs)if(node.hasAttribute(key))attributes[key]=node.getAttribute(key);
    const stops=[...node.children].filter(n=>n.localName==='stop').map(n=>{
        const s=getComputedStyle(n);return {offset:n.getAttribute('offset')||'0',color:s.stopColor,opacity:s.stopOpacity};
    });
    return {type:node.localName,attributes,stops:stops.length?stops:parent&&parent.stops||[]};
}
function capture(source){
    const result={};if(!source||!source.isConnected||!source.shadowRoot)return result;
    const root=source.shadowRoot;
    for(const [key,selector] of Object.entries({center:'.hex-fill',inner_border:'.hex-inner',outer_border:'.hex-outer'})){
        const face=root.querySelector(selector);if(!face)continue;
        const style=getComputedStyle(face),fill=style.fill;
        let opacity=Number(style.fillOpacity)||0;
        for(let n=face;n&&n!==root.host;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);
        const ref=/^url\(["']?(?:[^#]*#)([^"')]+)["']?\)$/.exec(fill);
        if(ref){const g=gradient(root.getElementById(ref[1]),root);if(g&&g.stops.length)result[key]={...g,opacity};}
        else if(fill&&fill!=='none'&&fill!=='source')result[key]={type:'solid',color:fill,opacity};
        else if(fill==='none')result[key]={type:'solid',color:'transparent',opacity:0};
    }
    return result;
}
function resolve(config,snapshot={}){
    const paints={};
    for(const key of Object.keys(defaults)){
        const value=(config.colors||{})[key];
        if(value==='source')paints[key]=snapshot[key]||{type:'solid',color:defaults[key],opacity:1};
        else if(typeof value==='string'&&/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value)&&typeof CSS!=='undefined'&&CSS.supports('background-image',value))paints[key]={type:'css',background:value,opacity:1};
    }
    return paints;
}
function server(paint,id){
    const node=document.createElementNS(NS,paint.type);node.id=id;
    for(const [key,value] of Object.entries(paint.attributes))node.setAttribute(key,value);
    for(const stop of paint.stops){const s=document.createElementNS(NS,'stop');s.setAttribute('offset',stop.offset);s.setAttribute('stop-color',stop.color);s.setAttribute('stop-opacity',stop.opacity);node.append(s);}
    return node;
}
function representative(paint){return paint&&(paint.type==='solid'?paint.color:paint.stops&&paint.stops[0]&&paint.stops[0].color);}
function connectorColor(source){
    const paint=capture(source).inner_border,c=source&&source._model&&source._model.colors.inner;
    if(paint&&paint.type!=='solid')return representative(paint)||defaults.inner_border;
    return c&&!/url\(|gradient\(/i.test(c)?c:representative(paint)||defaults.inner_border;
}
module.exports={capture,resolve,server,representative,connectorColor};
