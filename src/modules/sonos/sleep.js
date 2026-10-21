const { sonosButtonStyles } = require('./presentation.js');
const {connectionKey,invalidate}=require('../../core/presentation-updates.js');
const MINUTES=Object.freeze([15,30,45,60,90]);
const MAX_SECONDS=7200;
// Memory only: acknowledgements and estimates are NEVER device timer readback.
// Nothing is restored from storage, HA attributes or another browser's commands.
const sessions=new WeakMap();
function session(hass) {
    const key=connectionKey(hass);
    if (!key || !['object','function'].includes(typeof key)) return null;
    if (!sessions.has(key)) {
        const value={records:new Map(),pending:new Set(),epoch:0,online:true};
        sessions.set(key,value);
        if (typeof key.addEventListener==='function') {
            key.addEventListener('disconnected',()=>{
                value.records.clear();value.epoch++;value.online=false;invalidate({connection:key});
            });
            key.addEventListener('ready',()=>{value.online=true;invalidate({connection:key});});
        }
    }
    return sessions.get(key);
}
function settings(item) { return {player:item.entity}; }
function groupFor(hass,player) {
    const states=hass && hass.states || {},selected=states[player];
    const available=state=>state && !['unknown','unavailable'].includes(state.state);
    const reported=selected && selected.attributes && selected.attributes.group_members;
    if (!/^media_player\.[a-z0-9_]+$/.test(player || '') || !available(selected) ||
        !Array.isArray(reported) || !reported.length || !reported.includes(player) || new Set(reported).size!==reported.length) return null;
    const signature=[...reported].sort().join('|'),coordinator=reported[0];
    if (!reported.every(id=>{
        const member=states[id],group=member && member.attributes && member.attributes.group_members;
        const entry=hass.entities && hass.entities[id];
        return /^media_player\.[a-z0-9_]+$/.test(id) && available(member) && (!entry || !entry.platform || entry.platform==='sonos') &&
            Array.isArray(group) && group[0]===coordinator && group.length===reported.length && [...group].sort().join('|')===signature;
    })) return null;
    return {coordinator,signature,playing:states[coordinator].state==='playing'};
}
function status(hass,options,now=Date.now()) {
    const value=session(hass),group=groupFor(hass,options.player),services=hass && hass.services && hass.services.sonos || {};
    const connected=value && value.online && typeof hass.callService==='function';
    const setReady=!!(connected && group && services.set_sleep_timer),clearReady=!!(connected && group && services.clear_sleep_timer);
    if (value) for (const [coordinator,record] of value.records) {
        const current=groupFor(hass,coordinator);
        if (!current || current.coordinator!==coordinator || current.signature!==record.signature) value.records.delete(coordinator);
    }
    const record=group && value && value.records.get(group.coordinator);
    // A changed topology invalidates the local estimate permanently. It does NOT
    // cancel/re-arm a hardware timer or assert what a regrouped device will do.
    if (record && record.signature!==group.signature) value.records.delete(group.coordinator);
    const known=record && record.signature===group.signature ? record : null;
    const busy=!!(group && value && value.pending.has(group.coordinator));
    const remaining=known && known.phase==='set' ? Math.max(0,Math.ceil((known.deadline-now)/60000)) : null;
    const label=!connected ? 'HA offline' : !group ? 'Group unknown' : !setReady && !clearReady ? 'Sonos unavailable' : busy ? 'Sending…' :
        !known ? 'Status unknown' : known.phase==='failed' ? 'Check device' : known.phase==='cleared' ? 'Cancel sent' : remaining ? `Est. ${remaining} min` : 'Check device';
    return {ready:setReady || clearReady,setReady,clearReady,group,record:known,busy,remaining,label,
        running:!!(remaining>0),playable:!!(group && group.playing),
        refreshAt:remaining>0 && !busy ? Math.min(now+60000,known.deadline+10) : null};
}
function buildMenu(item) {
    const options=settings(item);
    return {entity:item.entity,nested_expand:true,inherit_inner:true,empty_slots:'hidden',
        _navigation_sibling:{group:`sonos:${item.entity}`,id:'sleep'},
        buttons:[...MINUTES,0].map((minutes,index)=>({slot:index+7,slot_mode:'hard',entity:item.entity,
            mode:'sonos-sleep',_sleep:{...options,minutes},name:minutes ? `${minutes} min` : 'Cancel',
            icon:minutes ? 'mdi:timer-outline' : 'mdi:timer-off-outline',show_name:true,show_label:true,autoclose:false,
            styles:sonosButtonStyles(),tap_action:{action:'honeycomb-sonos-sleep',sleep:options,minutes}}))};
}
function buildButton(item) {
    return {slot:4,slot_mode:'hard',entity:item.entity,mode:'sonos-sleep',_sleep:settings(item),
        icon:'mdi:timer-outline',name:'Sleep',show_name:true,show_label:true,autoclose:false,styles:sonosButtonStyles(),
        tap_action:{action:'honeycomb-open-nested',honeycomb_nested_menu:buildMenu(item)}};
}
function resolve({hass,config}) {
    const options=config._sleep || {},value=status(hass,options),choice=options.minutes!==undefined,cancel=options.minutes===0;
    const disabled=choice && (value.busy || (cancel ? !value.clearReady : !value.setReady || !value.playable));
    const selected=value.running && (!choice || options.minutes===value.record.minutes);
    return {colors:{center:disabled ? '#464a50' : '#34424e',inner:selected ? '#d6a932' : '#34383d',outer:'#34383d'},
        secondary:!choice ? value.label : value.busy ? 'Sending…' : !(cancel ? value.clearReady : value.setReady) ? !value.group || value.label==='HA offline' ? value.label : 'Sonos unavailable' :
            cancel ? 'OFF' : !value.playable ? 'No playback' : selected ? 'Reset' : 'Set',
        disabled,refreshAt:value.refreshAt};
}
function notifyUser(message) {
    if (typeof document==='undefined') return;
    const root=document.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true}));
}
async function command({hass,actionConfig,getHass=()=>hass,notify=notifyUser}) {
    const options=actionConfig.sleep || {},minutes=actionConfig.minutes,value=status(hass,options),cancel=minutes===0;
    if (![0,...MINUTES].includes(minutes) || minutes*60>MAX_SECONDS || (cancel ? !value.clearReady : !value.setReady || !value.playable)) {
        notify('Sleep Timer needs the official HA Sonos services and an available, consistent Sonos group; setting a timer also needs playback. No helpers or scripts are required.');
        return false;
    }
    const state=session(hass),group=value.group,key=group.coordinator,epoch=state.epoch;
    if (state.pending.has(key)) return false;
    state.pending.add(key);invalidate(hass);let timeout;
    const sentAt=Date.now();
    try {
        await Promise.race([hass.callService('sonos',cancel ? 'clear_sleep_timer' : 'set_sleep_timer',
            cancel ? {} : {sleep_time:minutes*60},{entity_id:key}),
            new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('request_timeout')),30000);})]);
        const current=groupFor(getHass(),options.player);
        if (state.epoch===epoch && current && current.coordinator===key && current.signature===group.signature)
            state.records.set(key,{signature:group.signature,phase:cancel ? 'cleared' : 'set',minutes,deadline:sentAt+minutes*60000});
        notify(cancel ? 'Sonos cancel command sent. Device timer status is not exposed by HA.' : 'Sonos timer sent to this group. Remaining time is a local estimate, not device status.');
        return true;
    } catch (_) {
        if (state.epoch===epoch) state.records.set(key,{signature:group.signature,phase:'failed'});
        notify('Sleep Timer request failed or timed out; the device may have received it. Check Sonos before retrying or use Cancel. No playback action will be retried automatically.');
        return false;
    } finally {clearTimeout(timeout);state.pending.delete(key);invalidate(hass);}
}
function registerActions(registry) {
    registry.register('honeycomb-sonos-sleep',context=>{void command(context);return true;});
}
module.exports={MINUTES,MAX_SECONDS,settings,groupFor,status,buildMenu,buildButton,resolve,command,registerActions};
