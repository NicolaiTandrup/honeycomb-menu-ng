// Geometry for expanded scenes. Coordinates come from the existing layout engine;
// this module neither allocates slots nor renders controls.
const HEIGHT=1.1547;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function footprint(menu) {
    const center=menu._computeCenterPosition(),cx=center.x+.5,cy=center.y+HEIGHT/2;
    const points=[center];
    (menu.buttons || []).forEach((button,i)=>{if(button!==undefined){const p=menu._computeButtonPosition(i);if(p)points.push(p);}});
    // XY controls occupy scene space in addition to their surrounding cubes.
    if(menu.config.xy_pad)points.push({x:0,y:0},{x:menu.sizes.containerWidth/menu.sizes.item-1,y:menu.sizes.containerHeight/menu.sizes.item-HEIGHT});
    return {left:Math.min(...points.map(p=>p.x-cx)),right:Math.max(...points.map(p=>p.x+1-cx)),
        top:Math.min(...points.map(p=>p.y-cy)),bottom:Math.max(...points.map(p=>p.y+HEIGHT-cy))};
}
function boundsAt(f,size,anchor){return {left:anchor.x+f.left*size,right:anchor.x+f.right*size,top:anchor.y+f.top*size,bottom:anchor.y+f.bottom*size};}
function fits(f,size,anchor,region) {
    if(!anchor || !region)return false;
    const b=boundsAt(f,size,anchor),epsilon=.05;
    return b.left>=region.left-epsilon && b.right<=region.right+epsilon && b.top>=region.top-epsilon && b.bottom<=region.bottom+epsilon;
}
function fittedSize(f,region,desired){return Math.max(1,Math.min(desired,(region.right-region.left)/(f.right-f.left),(region.bottom-region.top)/(f.bottom-f.top)));}
function centerIn(f,size,region,preferred=null) {
    return {x:clamp(preferred?preferred.x:(region.left+region.right)/2,region.left-f.left*size,region.right-f.right*size),
        y:clamp(preferred?preferred.y:(region.top+region.bottom)/2,region.top-f.top*size,region.bottom-f.bottom*size)};
}
function freeRegions(viewport,image,gap=12) {
    if(!image)return [];
    if(image.right<=viewport.left || image.left>=viewport.right || image.bottom<=viewport.top || image.top>=viewport.bottom)return [{...viewport,key:'outside'}];
    const regions=[{...viewport,top:Math.max(viewport.top,image.bottom+gap),key:'below'},
        {...viewport,bottom:Math.min(viewport.bottom,image.top-gap),key:'above'},
        {...viewport,right:Math.min(viewport.right,image.left-gap),key:'left'},
        {...viewport,left:Math.max(viewport.left,image.right+gap),key:'right'}];
    return regions.filter(r=>r.right>r.left && r.bottom>r.top);
}
function place(f,viewport,image,desired=100,previous=null) {
    const candidates=freeRegions(viewport,image).map(region=>({region,size:fittedSize(f,region,desired)}))
        .filter(c=>c.size>=Math.min(80,desired) && c.size>=desired*.8);
    candidates.sort((a,b)=>b.size-a.size || (b.region.right-b.region.left)*(b.region.bottom-b.region.top)-(a.region.right-a.region.left)*(a.region.bottom-a.region.top));
    let best=candidates[0];
    // Retain a nearly equivalent region across tiny resizes instead of oscillating.
    const retained=previous && previous.region && candidates.find(c=>c.region.key===previous.region.key);
    if(best && retained && retained.size>=best.size-2 && (retained.region.right-retained.region.left)*(retained.region.bottom-retained.region.top)>=(best.region.right-best.region.left)*(best.region.bottom-best.region.top)*.95)best=retained;
    if(!best)best={region:{...viewport,key:'viewport'},size:fittedSize(f,viewport,desired)};
    return {...centerIn(f,best.size,best.region),...best};
}
function submenu(f,viewport,root,preferred,desired,image=null) {
    if(fits(f,desired,preferred,viewport))return {...preferred,size:desired,reason:'selected'};
    if(fits(f,desired,root,viewport))return {x:root.x,y:root.y,size:desired,reason:'root'};
    const alternate=place(f,viewport,image,desired,root);
    if(alternate.region.key!=='viewport')return {...alternate,reason:'region'};
    const size=fittedSize(f,viewport,desired);
    return {...centerIn(f,size,viewport,root),size,reason:'viewport'};
}
function chromeElements(owner) {
    const roots=new Set([document]);
    for(let node=owner;node;node=node.parentElement || (node.getRootNode && node.getRootNode().host)){
        const root=node.getRootNode();if(root)roots.add(root);if(node.shadowRoot)roots.add(node.shadowRoot);
    }
    const elements=new Set();
    for(const root of roots)if(root.querySelectorAll)for(const el of root.querySelectorAll('header,#header,#footer,.header,.toolbar,app-header,app-toolbar,ha-top-app-bar-fixed,ha-tabs,ha-sidebar,[data-honeycomb-viewport-inset]'))elements.add(el);
    return [...elements].slice(0,64);
}
function environment(menu,owner,image=null) {
    const v=window.visualViewport || {width:innerWidth,height:innerHeight,offsetLeft:0,offsetTop:0};
    const style=getComputedStyle(menu),safe=side=>16+(parseFloat(style.getPropertyValue('--hub-safe-'+side))||0);
    const viewport={left:v.offsetLeft+safe('left'),right:v.offsetLeft+v.width-safe('right'),top:v.offsetTop+safe('top'),bottom:v.offsetTop+v.height-safe('bottom')};
    for(const el of chromeElements(owner)) {
        const css=getComputedStyle(el);if(css.display==='none'||css.visibility==='hidden'||!['fixed','sticky'].includes(css.position))continue;
        const b=el.getBoundingClientRect();if(!b.width||!b.height)continue;
        if(b.width>=v.width*.5){if(b.top<=v.offsetTop+1&&b.bottom>viewport.top)viewport.top=Math.min(viewport.bottom-1,b.bottom+16);if(b.bottom>=v.offsetTop+v.height-1&&b.top<viewport.bottom)viewport.bottom=Math.max(viewport.top+1,b.top-16);}
        if(b.height>=v.height*.5){if(b.left<=v.offsetLeft+1&&b.right>viewport.left)viewport.left=Math.min(viewport.right-1,b.right+16);if(b.right>=v.offsetLeft+v.width-1&&b.left<viewport.right)viewport.right=Math.max(viewport.left+1,b.left-16);}
    }
    return {viewport,image,key:JSON.stringify([viewport,image])};
}
module.exports={HEIGHT,footprint,boundsAt,fits,fittedSize,centerIn,freeRegions,place,submenu,chromeElements,environment};
