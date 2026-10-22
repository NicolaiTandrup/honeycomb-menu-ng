// Renderer capability only. Domain adapters normalize health and measured watts.
const BASE_CYCLE_MS=3000,MIN_CYCLE_MS=500,MAX_CYCLE_MS=10000,TRANSITION_MS=350;
const isTemplate=v=>typeof v==='string' && /\[\[\[|HCJS:|\$\{/.test(v);
const numericKeys=['power_w','max_power_w','min_cycle_ms','max_cycle_ms','cycle_ms'];
function enabled(state){return !!state && state.enabled!==false && state.active===true && state.available===true && state.fault===false && typeof state.power_w==='number' && Number.isFinite(state.power_w) && state.power_w>0;}
function timing(state){
    if(!state || !['power','fixed'].includes(state.speed_mode===undefined?'fixed':state.speed_mode))return null;
    const mode=state.speed_mode || 'fixed';
    const cycle=value=>typeof value==='number' && Number.isFinite(value) && value>=MIN_CYCLE_MS && value<=MAX_CYCLE_MS;
    if(mode==='fixed'){
        if(['max_power_w','min_cycle_ms','max_cycle_ms'].some(k=>state[k]!==undefined))return null;
        const ms=state.cycle_ms===undefined?BASE_CYCLE_MS:state.cycle_ms;
        return cycle(ms)?{cycleMs:ms}:null;
    }
    if(state.cycle_ms!==undefined || typeof state.max_power_w!=='number' || !Number.isFinite(state.max_power_w) || state.max_power_w<=0 ||
       typeof state.power_w!=='number' || !Number.isFinite(state.power_w) || state.power_w<=0)return null;
    const fast=state.min_cycle_ms===undefined?900:state.min_cycle_ms,slow=state.max_cycle_ms===undefined?2200:state.max_cycle_ms;
    if(!cycle(fast)||!cycle(slow)||fast>slow)return null;
    const fraction=Math.max(0,Math.min(1,state.power_w/state.max_power_w));
    return {cycleMs:slow+(fast-slow)*fraction};
}
function validate(value){
    if(value===undefined || value===false)return;
    if(!value || typeof value!=='object' || Array.isArray(value) ||
       Object.keys(value).some(k=>!['enabled','active','available','fault','speed_mode',...numericKeys].includes(k)) ||
       ['active','available','fault','power_w'].some(k=>value[k]===undefined))
        throw new Error('energy_wave requires normalized active, available, fault and power_w with supported optional speed settings.');
    for(const [key,v] of Object.entries(value)){
        if(key==='speed_mode'){
            if(!['power','fixed'].includes(v))throw new Error('energy_wave.speed_mode must be power or fixed.');
        }else if(!isTemplate(v) && (numericKeys.includes(key)?typeof v!=='number'||!Number.isFinite(v):typeof v!=='boolean'))
            throw new Error('energy_wave values require booleans/numbers or HA JS templates; speed_mode is literal.');
    }
    const mode=value.speed_mode || 'fixed';
    if(mode==='power' && (value.max_power_w===undefined || value.cycle_ms!==undefined) ||
       mode==='fixed' && ['max_power_w','min_cycle_ms','max_cycle_ms'].some(k=>value[k]!==undefined))
        throw new Error('Power speed requires max_power_w and cycle limits; fixed speed uses only cycle_ms.');
    for(const k of ['cycle_ms','min_cycle_ms','max_cycle_ms'])if(value[k]!==undefined && !isTemplate(value[k]) && (value[k]<MIN_CYCLE_MS || value[k]>MAX_CYCLE_MS))
        throw new Error('Energy cycle limits must be between 500 and 10000 milliseconds.');
    if(value.max_power_w!==undefined && !isTemplate(value.max_power_w) && value.max_power_w<=0)throw new Error('max_power_w must be positive.');
    if(mode==='power'){
        const min=value.min_cycle_ms===undefined?900:value.min_cycle_ms,max=value.max_cycle_ms===undefined?2200:value.max_cycle_ms;
        if(!isTemplate(min)&&!isTemplate(max)&&min>max)throw new Error('min_cycle_ms must not exceed max_cycle_ms.');
    }
}
// One observer/listener set and one short-lived rate-transition RAF for all cubes.
// CSS geometry/keyframes stay unchanged. WAAPI rate updates preserve animation phase.
const clients=new Map();let observer=null,motion=null,frame=null;
const MAX_ANIMATIONS=24;
function apply(record,rate){record.animation.updatePlaybackRate(rate);record.rate=rate;}
function tick(now){
    frame=null;let pending=false;
    for(const record of clients.values())if(record.animation && record.transition){
        const t=Math.max(0,Math.min(1,(now-record.transition.start)/TRANSITION_MS)),ease=t*t*(3-2*t);
        apply(record,record.transition.from+(record.target-record.transition.from)*ease);
        if(t>=1)record.transition=null;else pending=true;
    }
    if(pending)frame=requestAnimationFrame(tick);
}
function schedule(){if(frame===null)frame=requestAnimationFrame(tick);}
function stopUnusedFrame(){if(frame!==null && ![...clients.values()].some(r=>r.animation && r.transition)){cancelAnimationFrame(frame);frame=null;}}
function sync(host){
    const r=clients.get(host);if(!r || !host.hasAttribute('energy-wave-running'))return;
    const contour=host.shadowRoot && host.shadowRoot.querySelector('.energy-contour');
    const animation=contour && contour.getAnimations()[0];
    if(!animation)return;
    if(typeof animation.updatePlaybackRate!=='function'){
        host.removeAttribute('energy-wave-running');r.animation=null;r.transition=null;stopUnusedFrame();return;
    }
    if(r.animation!==animation){r.animation=animation;r.transition=null;apply(r,r.target);}
}
function refresh(){
    let running=0;
    for(const [host,r] of clients){
        const run=r.visible && !document.hidden && motion && !motion.matches && running<MAX_ANIMATIONS;
        host.toggleAttribute('energy-wave-running',!!run);
        if(run){sync(host);if(host.hasAttribute('energy-wave-running'))running++;}
        else{r.animation=null;r.transition=null;}
    }
    stopUnusedFrame();
}
function setCycle(host,cycleMs){
    const r=clients.get(host);if(!r)return;
    const target=BASE_CYCLE_MS/cycleMs;
    if(target===r.target)return;
    r.target=target;
    if(r.animation){r.transition={from:r.rate,start:performance.now()};schedule();}
}
function attach(host){
    if(!clients.size){
        motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
        if(motion && typeof motion.addEventListener!=='function')motion=null;
        observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(clients.has(e.target))clients.get(e.target).visible=e.isIntersecting;refresh();}):null;
        if(motion)motion.addEventListener('change',refresh);
        document.addEventListener('visibilitychange',refresh);
    }
    clients.set(host,{visible:false,animation:null,transition:null,target:1,rate:1});if(observer)observer.observe(host);refresh();
    return ()=>{
        if(observer)observer.unobserve(host);clients.delete(host);host.removeAttribute('energy-wave-running');refresh();
        if(!clients.size){if(observer)observer.disconnect();observer=null;if(motion)motion.removeEventListener('change',refresh);motion=null;document.removeEventListener('visibilitychange',refresh);stopUnusedFrame();}
    };
}
module.exports={enabled,validate,timing,attach,setCycle,sync,MAX_ANIMATIONS,BASE_CYCLE_MS,TRANSITION_MS,diagnostics:()=>({eligible:clients.size,observers:observer?1:0,transitionFrame:frame!==null})};
