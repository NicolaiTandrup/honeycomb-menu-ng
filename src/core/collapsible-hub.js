const {allocateHubSlots,MAX_HUB_SLOT}=require('./hub-allocation');
function settings(value) {
    if(value===undefined || value===false)return null;
    const config=value===true?{}:value;
    if(!config || typeof config!=='object' || Array.isArray(config))throw Error('collapsible must be true, false or an options object.');
    for(const key of Object.keys(config))if(!['expanded_center','primary_slot','idle_timeout','mobile','expanded_size'].includes(key))throw Error('Unknown collapsible option: '+key);
    const result={expanded_center:'primary',idle_timeout:30000,mobile:true,expanded_size:100,...config};
    if(!['primary','bee'].includes(result.expanded_center))throw Error('collapsible.expanded_center must be primary or bee.');
    if(result.expanded_center==='bee' && (!Number.isSafeInteger(result.primary_slot)||result.primary_slot<1||result.primary_slot>MAX_HUB_SLOT))throw Error('collapsible.primary_slot must be an available slot 1–216 for bee center.');
    if(!Number.isFinite(result.idle_timeout)||result.idle_timeout<1000)throw Error('collapsible.idle_timeout must be at least 1000 milliseconds.');
    if(typeof result.mobile!=='boolean'||!Number.isFinite(result.expanded_size)||result.expanded_size<44||result.expanded_size>200)throw Error('Invalid collapsible mobile/expanded_size option.');
    return result;
}
function expandedAllocation(entries,primary,options,previous=new Map()) {
    const moved=options.expanded_center==='bee';
    const expanded=entries.map(entry=>entry.id===primary.id && moved?{...entry,slot:options.primary_slot,mode:'hard'}:entry);
    const result=allocateHubSlots(expanded,{previous,centerReserved:moved});
    if(result.diagnostics.some(d=>['hard-collision','invalid-slot','overflow'].includes(d.code)))throw Error('collapsible expanded slot conflict: '+JSON.stringify(result.diagnostics));
    return result;
}
function mobileGeometry(menu,viewport,desired=100,safe={}) {
    const width=menu.sizes.containerWidth/menu.sizes.item,height=menu.sizes.containerHeight/menu.sizes.item;
    const left=16+(safe.left||0),right=16+(safe.right||0),top=72+(safe.top||0),bottom=40+(safe.bottom||0);
    const size=Math.min(desired,(viewport.width-left-right)/width,(viewport.height-top-bottom)/height);
    return {size:Math.max(1,size),x:viewport.offsetLeft+left+(viewport.width-left-right)/2,y:viewport.offsetTop+top+(viewport.height-top-bottom)/2};
}
module.exports={settings,expandedAllocation,mobileGeometry};
