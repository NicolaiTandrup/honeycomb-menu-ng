const { sonosButtonStyles } = require('./presentation.js');
const MINUTES=[15,30,45,60,90];
const PHASES=['running','off','expired','restart_cancelled','group_changed','action_failed'];
function settings(item) {
    return {...(item.sleep_timer || {}),player:item.entity};
}
function status(hass, options, now=Date.now()) {
    const states=hass && hass.states || {}, unavailable=state=>!state || ['unknown','unavailable'].includes(state.state);
    const valid=(key,domain)=>typeof options[key]==='string' && new RegExp(`^${domain}\\.[a-z0-9_]+$`).test(options[key]);
    if (!valid('state','input_text') || !valid('deadline','input_datetime') || !valid('script','script'))
        return {ready:false,label:'Setup required',reason:'setup_required',running:false};
    const helper=states[options.state],deadline=states[options.deadline],script=states[options.script];
    if (typeof hass.callService!=='function' || unavailable(helper) || unavailable(deadline) || unavailable(script) ||
        !hass.services || !hass.services.script || !hass.services.script[options.script.slice(7)])
        return {ready:false,label:'Setup unavailable',reason:'setup_unavailable',running:false};
    let record;
    try { record=helper.state.startsWith('hc1:') ? JSON.parse(helper.state.slice(4)) : null; } catch (_) { record=null; }
    if (!deadline.attributes || deadline.attributes.has_date!==true || deadline.attributes.has_time!==true || !record || record.v!==1 || record.p!==options.player || !PHASES.includes(record.s) ||
        (record.s==='running' && (!Number.isFinite(record.e) || record.e<=0 || !MINUTES.includes(record.m) || !/^[a-f0-9]{64}$/.test(record.g))))
        return {ready:false,label:'Check setup',reason:'setup_invalid',running:false};
    const player=states[options.player],group=player && player.attributes && player.attributes.group_members;
    const leader=Array.isArray(group) && states[group[0]];
    const playable=!unavailable(player) && !unavailable(leader) && group.includes(options.player) &&
        new Set(group).size===group.length && group.every(id=>{
            const member=states[id],other=member && member.attributes && member.attributes.group_members;
            return !unavailable(member) && Array.isArray(other) && other[0]===group[0] &&
                other.length===group.length && [...other].sort().join('|')===[...group].sort().join('|');
        }) && leader.state==='playing' && !!(Number(leader.attributes.supported_features)&1);
    const running=record.s==='running';
    const remaining=running ? Math.max(0,Math.ceil((record.e*1000-now)/60000)) : 0;
    const label=running ? remaining ? `${remaining} min` : 'Due' :
        ({off:'Off',expired:'Expired',restart_cancelled:'Restarted',group_changed:'Group changed',action_failed:'Check HA'})[record.s];
    return {ready:true,running,record,playable,remaining,label,reason:record.s,
        refreshAt:running && remaining>0 ? Math.min(now+60000,record.e*1000+10) : null};
}
function buildMenu(item) {
    const options=settings(item);
    return {entity:item.entity,nested_expand:true,inherit_inner:true,empty_slots:'hidden',idle_timeout:0,
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
    const options=config._sleep || {}, value=status(hass,options), choice=options.minutes!==undefined;
    const disabled=choice && (!value.ready || (options.minutes!==0 && !value.playable));
    const selected=value.running && (!choice || options.minutes===value.record.m);
    return {colors:{center:disabled ? '#464a50' : '#34424e',inner:selected ? '#d6a932' : '#34383d',outer:'#34383d'},
        secondary:choice ? !value.ready ? value.label : options.minutes===0 ? value.running ? 'Cancel timer' : 'Off' : !value.playable ? 'No playback' :
            value.running && value.record.m===options.minutes ? 'Restart' : 'Start' : value.label,
        disabled,refreshAt:value.refreshAt};
}
function notifyUser(message) {
    if (typeof document==='undefined') return;
    const root=document.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true}));
}
const pending=new WeakMap();
async function command({hass,actionConfig,notify=notifyUser}) {
    const options=actionConfig.sleep || {},minutes=actionConfig.minutes,value=status(hass,options);
    if (!value.ready || ![0,...MINUTES].includes(minutes) || (minutes && !value.playable)) {
        notify(!value.ready ? 'Sleep Timer requires the documented Home Assistant package and matching helper/script configuration.' : 'Sleep Timer needs an available, playing Sonos group.');
        return false;
    }
    const connection=hass.connection || hass.callService;
    if (!pending.has(connection)) pending.set(connection,new Set());
    const requests=pending.get(connection),key=options.script;
    if (requests.has(key)) return false;
    requests.add(key);let timeout;
    try {
        await Promise.race([hass.callService('script',options.script.slice(7),{
            player:options.player,operation:minutes===0 ? 'cancel' : 'start',minutes},{}),
            new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('request_timeout')),30000);})]);
        return true;
    } catch (_) {
        notify('Sleep Timer request failed or timed out. Check the live HA timer state, package setup and script trace before retrying.');
        return false;
    } finally {clearTimeout(timeout);requests.delete(key);}
}
function registerActions(registry) {
    registry.register('honeycomb-sonos-sleep',context=>{void command(context);return true;});
}
module.exports={MINUTES,settings,status,buildMenu,buildButton,resolve,command,registerActions};
