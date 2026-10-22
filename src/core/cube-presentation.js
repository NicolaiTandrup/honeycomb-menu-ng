// Shared visual policy. Domain modules supply active state and resolved colors.
// No HA services, vendor state parsing, timers, navigation or slot ownership here.
function channels(color) {
    if(typeof color!=='string')return null;
    const hex=/^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
    if(hex){const s=hex[1].length===3?[...hex[1]].map(c=>c+c).join(''):hex[1];return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
    const rgb=/^rgb\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/i.exec(color.trim());
    if(rgb)return rgb.slice(1).map(Number).every(v=>v>=0 && v<=255)?rgb.slice(1).map(Number):null;
    const hsl=/^hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\s*\)$/i.exec(color.trim());
    if(!hsl)return null;
    const [h,s,l]=hsl.slice(1).map(Number);if(s>100 || l>100)return null;
    const hue=(h%360)/60,c=(1-Math.abs(2*l/100-1))*s/100,x=c*(1-Math.abs(hue%2-1)),m=l/100-c/2;
    return [[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.floor(hue)].map(v=>(v+m)*255);
}
function darken(color,amount=.4) {
    const rgb=channels(color);if(!rgb)return null;
    const fraction=typeof amount==='number' && Number.isFinite(amount)?Math.max(0,Math.min(.4,amount)):.4;
    return 'rgb('+rgb.map(v=>Math.round(v*(1-fraction))).join(', ')+')';
}
function resolveFill({colors,active=false,decorative=false,gradient,explicitCenter=false,customBackground=false,disabled=false,colorMix=false}) {
    const solid={type:'solid',center:colors.center};
    if((!active && !decorative) || disabled || gradient===false || gradient==='solid' || gradient && gradient.type==='solid')return solid;
    const explicitRadial=gradient && gradient.type==='radial';
    if((explicitCenter || customBackground) && !explicitRadial)return solid;
    const center=explicitCenter || decorative ? colors.center : colors.inner;
    const amount=gradient && typeof gradient.darken==='number'?gradient.darken:.4;
    const edge=gradient && gradient.edge || darken(center,amount) ||
        (colorMix && typeof center==='string' ? `color-mix(in srgb, ${center} ${100-Math.round(Math.max(0,Math.min(.4,amount))*100)}%, black)` : null);
    return edge ? {type:'radial',center,edge} : solid;
}
function validateGradient(value) {
    if(value===undefined || value===false || value==='solid')return;
    if(!value || typeof value!=='object' || Array.isArray(value) || !['radial','solid'].includes(value.type) ||
        Object.keys(value).some(k=>!['type','edge','darken'].includes(k)) ||
        value.edge!==undefined && (typeof value.edge!=='string' || !value.edge.trim()) ||
        value.darken!==undefined && (typeof value.darken!=='number' || !Number.isFinite(value.darken) || value.darken<0 || value.darken>.4))
        throw new Error('colors.fill_gradient requires type radial/solid, optional edge color, darken 0–0.4.');
}
function artworkLayout({primary=false,secondary=false,scale=1,offsetX=0,offsetY=0}={}) {
    const bounded=(v,min,max,fallback)=>typeof v==='number' && Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
    const width=Number((62*bounded(scale,.75,1.05,1)).toFixed(3)),height=Number(((primary && secondary?36:primary || secondary?48:62)*bounded(scale,.75,1.05,1)).toFixed(3));
    // Percent of usable fill. Preserve text zones, padding and image aspect ratio.
    const x=bounded(offsetX,-5,5,0),y=bounded(offsetY,-4,4,0);
    return {width:`${width}%`,left:`${(100-width)/2+x}%`,top:`${(primary || secondary?14:19)+y}%`,height:`${height}%`};
}
// Built-in design dimensions consume the same numeric size variable. User px overrides remain px.
const designLength=px=>`calc(var(--honeycomb-persistent-size,82px) / 82 * ${px})`;
module.exports={channels,darken,resolveFill,validateGradient,artworkLayout,designLength};
