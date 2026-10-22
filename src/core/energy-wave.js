// A renderer capability, not a Charger adapter. All state is explicitly normalized.
function enabled(state){return !!state && state.enabled!==false && state.active===true && state.available===true && state.fault===false && typeof state.power_w==='number' && Number.isFinite(state.power_w) && state.power_w>0;}
function validate(value){
    if(value===undefined || value===false)return;
    if(!value || typeof value!=='object' || Array.isArray(value) ||
       Object.keys(value).some(k=>!['enabled','active','available','fault','power_w'].includes(k)) ||
       ['active','available','fault','power_w'].some(k=>value[k]===undefined))
        throw new Error('energy_wave requires normalized active, available, fault and power_w; enabled is optional.');
    for(const [key,v] of Object.entries(value)){
        const template=typeof v==='string' && /\[\[\[|HCJS:|\$\{/.test(v);
        if(!template && (key==='power_w'?typeof v!=='number'||!Number.isFinite(v):typeof v!=='boolean'))
            throw new Error('energy_wave values must be booleans/numeric power_w or HA JS templates.');
    }
}
// One shared observer/listener pair, only while eligible attached cubes exist.
const clients=new Map();let observer=null,motion=null;
const MAX_ANIMATIONS=24;
function refresh(){let running=0;for(const [host,visible] of clients){const run=visible && !document.hidden && motion && !motion.matches && running<MAX_ANIMATIONS;if(run)running++;host.toggleAttribute('energy-wave-running',!!run);}}
function attach(host){
    if(!clients.size){
        motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
        if(motion && typeof motion.addEventListener!=='function')motion=null;
        observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(clients.has(e.target))clients.set(e.target,e.isIntersecting);refresh();}):null;
        if(motion)motion.addEventListener('change',refresh);
        document.addEventListener('visibilitychange',refresh);
    }
    clients.set(host,false);if(observer)observer.observe(host);refresh();
    return ()=>{
        if(observer)observer.unobserve(host);clients.delete(host);host.removeAttribute('energy-wave-running');refresh();
        if(!clients.size){if(observer)observer.disconnect();observer=null;if(motion)motion.removeEventListener('change',refresh);motion=null;document.removeEventListener('visibilitychange',refresh);}
    };
}
module.exports={enabled,validate,attach,MAX_ANIMATIONS,diagnostics:()=>({eligible:clients.size,observers:observer?1:0})};
