const model=require('./model');
const registry=require('./registry');
const ACK_MS=15000;
function recordFor(hass,value,role,now=Date.now()) {
    const store=registry.session(hass),key=value.identity+':'+role;
    const record=store && store.commands.get(key);
    if (!record) return null;
    // Never interpret a successful HTTP/service response as hardware success.
    const source=(hass.states || {})[record.target];
    if (source && source.state === record.desired && !['failed','unconfirmed'].includes(record.phase)) {
        clearTimeout(record.timer);store.commands.delete(key);return null;
    }
    if (record.deadline <= now && record.phase !== 'failed') {record.phase='unconfirmed';clearTimeout(record.timer);}
    return record;
}
function notifyUser(message) {
    if (typeof document === 'undefined') return;
    const root=document.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true}));
}
async function command({hass,actionConfig,itemConfig,getHass=()=>hass,isCurrent=()=>true,notify=notifyUser}) {
    const options=itemConfig && itemConfig._charger,role=itemConfig && itemConfig._charger_field;
    if (!options || options.aggregate || !['enabled','permanent_lock'].includes(role) || actionConfig.role !== role || !isCurrent()) return false;
    const current=getHass(),value=model.state(current,options),store=registry.session(current),existing=recordFor(current,value,role);
    if (!store || !model.writable(current,value,role) || existing && ['sending','pending'].includes(existing.phase)) {
        notify('Charger control unavailable or awaiting confirmation. Check the mapped switch and charger status.');return false;
    }
    const target=value.entities[role],source=current.states[target],desired=source.state === 'on' ? 'off' : 'on',key=value.identity+':'+role;
    const record={target,desired,phase:'sending',deadline:Date.now()+ACK_MS};
    if (existing) clearTimeout(existing.timer);
    if (!store.commands.has(key) && store.commands.size >= 256) {
        for(const [id,old] of store.commands) if(!['sending','pending'].includes(old.phase)){store.commands.delete(id);break;}
        if(store.commands.size >= 256){notify('Too many pending charger controls. Wait for HA confirmation before another command.');return false;}
    }
    store.commands.set(key,record);
    record.timer=setTimeout(()=>{if(store.commands.get(key)===record){record.phase='unconfirmed';registry.notify(store);}},ACK_MS);
    registry.notify(store);
    try {
        await Promise.race([current.callService('switch','turn_'+desired,{},{entity_id:target}),new Promise((_,reject)=>{
            record.requestTimeout=setTimeout(()=>reject(Error('timeout')),ACK_MS);
        })]);
        if (store.commands.get(key) !== record) return true;
        record.phase='pending';recordFor(getHass(),value,role);registry.notify(store);
        return true;
    } catch (_) {
        record.phase='failed';clearTimeout(record.timer);registry.notify(store);
        notify('Charger command failed or timed out. Check Home Assistant and the charger before retrying; no command is retried automatically.');return false;
    } finally {clearTimeout(record.requestTimeout);}
}
function registerActions(actions) { actions.register('honeycomb-charger-toggle',context=>{void command(context);return true;}); }
module.exports={ACK_MS,recordFor,command,registerActions};
