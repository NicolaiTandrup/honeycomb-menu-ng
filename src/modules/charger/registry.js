// One bounded read-only registry request per HA connection, shared by all faces.
// A denied registry is a supported explicit-mapping fallback, never name guessing.
const {connectionKey}=require('../../core/presentation-updates');
const sessions=new WeakMap();
function session(hass) {
    const key=connectionKey(hass);
    if (!key || !['object','function'].includes(typeof key)) return null;
    if (!sessions.has(key)) sessions.set(key,{key,listeners:new Set(),commands:new Map(),entries:[],version:0,epoch:0,attempted:false,online:true});
    return sessions.get(key);
}
function notify(value) { if (value) [...value.listeners].forEach(fn=>fn()); }
function entries(hass) {
    const value=session(hass), map=new Map();
    for (const entry of [...(value && value.entries || []),...Object.entries(hass && hass.entities || {}).map(([id,e])=>({...e,entity_id:e.entity_id || id}))])
        if (entry && entry.entity_id) map.set(entry.entity_id,{...map.get(entry.entity_id),...entry});
    return [...map.values()];
}
function fetchRegistry(hass,value) {
    if (!value || value.attempted || !value.listeners.size || value.online === false) return;
    const call=hass.callWS ? request=>hass.callWS(request) : hass.connection && hass.connection.sendMessagePromise ? request=>hass.connection.sendMessagePromise(request) : null;
    if (!call) return;
    value.attempted=true;const epoch=value.epoch;
    let timeout;
    Promise.race([Promise.resolve().then(()=>call({type:'config/entity_registry/list'})),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),5000);})])
        .then(result=>{
            if (epoch !== value.epoch || !value.listeners.size) return;
            if (!Array.isArray(result) || result.length > 100000 || result.some(e=>!e || typeof e.entity_id !== 'string')) throw Error('Invalid registry');
            value.entries=result.filter(e=>e.platform === 'easee');value.version++;notify(value);
        }).catch(()=>{if (epoch === value.epoch) {value.registryUnavailable=true;value.version++;notify(value);}})
        .finally(()=>clearTimeout(timeout));
}
function observe(callback) {
    let current=null,latestHass=null,options=null;
    const needsDiscovery=config=>config && (config.aggregate ? config.chargers.some(c=>c.discover) : config.discover);
    const clean=()=>{
        if (!current) return;
        current.listeners.delete(callback);
        if (!current.listeners.size) {
            if(current.detach)current.detach();current.detach=null;
            current.epoch++;if(!current.entries.length)current.attempted=false;
        }
    };
    return {
        update(hass,config) {
            latestHass=hass;options=config._charger;
            const next=session(hass);
            if (next !== current) {clean();current=next;if(current)current.listeners.add(callback);}
            if (!current) return;
            current.hass=hass;
            if (needsDiscovery(options)) current.discover=true;
            if (!current.detach) {
                const value=current,key=value.key;let unsubscribe=null,disposed=false;
                const changed=()=>{
                    value.entries=[];value.attempted=false;value.epoch++;value.version++;
                    if(value.discover)fetchRegistry(value.hass,value);notify(value);
                };
                const disconnected=()=>{
                    value.online=false;value.measurementFloor=Date.now();value.epoch++;value.entries=[];value.version++;
                    for(const record of value.commands.values()){clearTimeout(record.timer);record.phase='unconfirmed';}
                    notify(value);
                };
                const ready=()=>{value.online=true;changed();};
                if(typeof key.addEventListener === 'function'){
                    key.addEventListener('disconnected',disconnected);key.addEventListener('ready',ready);
                }
                if(typeof key.subscribeEvents === 'function'){
                    Promise.resolve(key.subscribeEvents(changed,'entity_registry_updated')).then(fn=>{
                        if(disposed){if(typeof fn === 'function')fn();}else unsubscribe=fn;
                    }).catch(()=>{});
                }
                value.detach=()=>{
                    disposed=true;
                    if(typeof key.removeEventListener === 'function'){key.removeEventListener('disconnected',disconnected);key.removeEventListener('ready',ready);}
                    if(typeof unsubscribe === 'function')unsubscribe();
                    value.discover=false;
                };
            }
            if (needsDiscovery(options)) fetchRegistry(hass,current);
        },
        dispose(){clean();current=null;latestHass=null;}
    };
}
module.exports={session,entries,notify,observe};
