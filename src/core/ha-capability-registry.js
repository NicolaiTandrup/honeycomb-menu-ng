// Read-only generic registry metadata; never infer switch purpose from names.
const {connectionKey}=require('./presentation-updates');
const sessions=new WeakMap();
function session(hass) {
    const key=connectionKey(hass);
    if(!key || !['object','function'].includes(typeof key))return null;
    if(!sessions.has(key))sessions.set(key,{key,listeners:new Set(),commands:new Map(),entries:[],version:0,epoch:0,attempted:false,online:true,status:'idle'});
    return sessions.get(key);
}
function notify(value) {if(value)[...value.listeners].forEach(fn=>fn());}
function normalize(e,id) {
    const result={};
    for(const [name,short]of [['entity_id','ei'],['device_id','di'],['platform','pl'],['config_entry_id','ce'],['translation_key','tk'],['disabled_by','disabled_by']]){
        const v=e[name]!==undefined?e[name]:e[short];if(v!==undefined)result[name]=v;
    }
    result.entity_id=result.entity_id||id;return result;
}
function index(hass) {
    const value=session(hass);if(!value)return new Map();
    const display=hass.entities||null;
    if(value.index && value.indexVersion===value.version && value.display===display)return value.index;
    const byId=new Map(value.entries.map(e=>[e.entity_id,normalize(e)]));
    for(const [id,e]of Object.entries(display||{}))byId.set(id,{...byId.get(id),...normalize(e,id)});
    value.byDevice=new Map();for(const e of byId.values())if(e.device_id){if(!value.byDevice.has(e.device_id))value.byDevice.set(e.device_id,[]);value.byDevice.get(e.device_id).push(e);}
    value.index=byId;value.indexVersion=value.version;value.display=display;return byId;
}
function associatedSwitch(hass,entity,semantic) {
    const value=session(hass),entries=index(hass),root=entries.get(entity);
    if(!value||value.status!=='ready')return {entity:null,reason:value&&['failed','unavailable'].includes(value.status)?'registry_unavailable':'metadata_pending'};
    if(!root || !root.device_id || !root.platform)return {entity:null,reason:value&&value.status==='failed'?'registry_unavailable':'metadata_missing'};
    const candidates=(value.byDevice.get(root.device_id)||[]).filter(e=>e.entity_id.startsWith('switch.') && e.device_id===root.device_id &&
        e.platform===root.platform && !e.disabled_by && e.translation_key===semantic &&
        (!root.config_entry_id || e.config_entry_id===root.config_entry_id));
    return {entity:candidates.length===1?candidates[0].entity_id:null,reason:candidates.length===1?'same_device_exact_semantic':candidates.length>1?'ambiguous':'not_exposed'};
}
function fetchRegistry(hass,value) {
    if(value.attempted || !value.listeners.size || !value.online)return;
    const call=hass.callWS?x=>hass.callWS(x):hass.connection&&hass.connection.sendMessagePromise?x=>hass.connection.sendMessagePromise(x):null;
    if(!call){value.status='unavailable';return;}
    value.attempted=true;value.status='loading';const epoch=value.epoch;let timer;
    Promise.race([Promise.resolve().then(()=>call({type:'config/entity_registry/list'})),new Promise((_,reject)=>{
        value.cancelFetch=()=>reject(Error('cancelled'));timer=setTimeout(()=>reject(Error('timeout')),5000);
    })]).then(rows=>{
        if(epoch!==value.epoch || !value.listeners.size)return;
        if(!Array.isArray(rows)||rows.length>100000||rows.some(e=>!e||typeof e.entity_id!=='string'))throw Error('invalid registry');
        value.entries=rows;value.status='ready';value.version++;notify(value);
    }).catch(()=>{if(epoch===value.epoch){value.status='failed';value.version++;notify(value);}}).finally(()=>{clearTimeout(timer);if(epoch===value.epoch)value.cancelFetch=null;});
}
function observe(callback) {
    let current=null;
    const clean=()=>{
        if(!current)return;current.listeners.delete(callback);
        if(!current.listeners.size){if(current.detach)current.detach();current.detach=null;current.epoch++;if(current.cancelFetch)current.cancelFetch();current.cancelFetch=null;current.attempted=false;}
    };
    return {update(hass,config){
        const next=session(hass);if(next!==current){clean();current=next;if(current)current.listeners.add(callback);}
        if(!current)return;current.hass=hass;
        const options=config._climate||{},presets=((hass.states||{})[options.entity]||{}).attributes||{};
        const native=!!(presets.supported_features&16)&&Array.isArray(presets.preset_modes)&&presets.preset_modes.some(p=>typeof p==='string'&&p.toLowerCase()==='defrost');
        if(options.discover && !options.defrostEntity && !native)current.discover=true;
        if(!current.detach){
            const value=current,key=value.key;let unsubscribe=null,disposed=false;
            const changed=()=>{if(value.cancelFetch)value.cancelFetch();value.epoch++;value.entries=[];value.version++;value.attempted=false;if(value.discover)fetchRegistry(value.hass,value);notify(value);};
            const disconnected=()=>{value.online=false;changed();};const ready=()=>{value.online=true;changed();};
            if(key.addEventListener){key.addEventListener('ready',ready);key.addEventListener('disconnected',disconnected);}
            if(key.subscribeEvents)Promise.resolve(key.subscribeEvents(changed,'entity_registry_updated')).then(fn=>{if(disposed){if(typeof fn==='function')fn();}else unsubscribe=fn;}).catch(()=>{});
            value.detach=()=>{disposed=true;if(key.removeEventListener){key.removeEventListener('ready',ready);key.removeEventListener('disconnected',disconnected);}if(typeof unsubscribe==='function')unsubscribe();value.discover=false;};
        }
        if(current.discover)fetchRegistry(hass,current);
    },dispose(){clean();current=null;}};
}
module.exports={session,notify,index,associatedSwitch,observe};
