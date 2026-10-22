const easee=require('./easee');
const registry=require('./registry');
const COLORS={fault:'#ef5350',disabled:'#f2c94c',connected:'#43c95b',disconnected:'#42a5f5',unknown:'#858b94'};
const absent=state=>!state || ['unknown','unavailable','none',''].includes(String(state.state).toLowerCase());
const boolean=state=>absent(state) ? null : state.state === 'on' ? true : state.state === 'off' ? false : null;
function time(state) {
    const value=state && (state.last_reported || state.last_updated);
    return typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) : NaN;
}
function measurement(state,kind,maxAge,now) {
    if (absent(state) || typeof state.state !== 'string' && typeof state.state !== 'number' || String(state.state).trim() === '') return null;
    const n=Number(state.state),unit=String(state.attributes && state.attributes.unit_of_measurement || '').toLowerCase();
    const scale={power:{w:1,kw:1000},energy:{wh:.001,kwh:1},current:{a:1,ma:.001}}[kind][unit];
    if (!Number.isFinite(n) || n < 0 || scale === undefined) return null;
    const stamp=time(state);
    if (kind === 'power' && (!Number.isFinite(stamp) || stamp > now+30000 || now >= stamp+maxAge*1000)) return null;
    return {value:n*scale,expires:kind === 'power' ? stamp+maxAge*1000 : null};
}
function association(hass,options,connected,now) {
    if (connected !== true || !options) return {name:null,reason:connected === false ? 'disconnected' : 'not-configured'};
    const source=(hass && hass.states || {})[options.entity],attrs=source && source.attributes || {};
    if (absent(source) || !Array.isArray(attrs.assignments)) return {name:null,reason:'association-unavailable'};
    const stamp=typeof attrs.updated_at === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(attrs.updated_at) ? Date.parse(attrs.updated_at) : NaN;
    const expires=stamp+options.max_age*1000;
    if (!Number.isFinite(stamp) || stamp > now+30000 || now >= expires) return {name:null,reason:'association-stale'};
    const rows=attrs.assignments;
    if (rows.length > 10000 || rows.some(row=>!row || typeof row !== 'object')) return {name:null,reason:'association-invalid',expires};
    const own=rows.filter(row=>row.charger === options.charger_key);
    if (own.length !== 1) return {name:null,reason:own.length ? 'association-ambiguous' : 'association-missing',expires};
    const value=own[0];
    if (typeof value.car !== 'string' || !value.car.trim() || typeof value.car_name !== 'string' || !value.car_name.trim() ||
        !['auto_assigned','manual_until_disconnect'].includes(value.mode)) return {name:null,reason:'association-unconfirmed',expires};
    const assigned=rows.filter(row=>row.car === value.car && ['auto_assigned','manual_until_disconnect'].includes(row.mode));
    if (assigned.length !== 1) return {name:null,reason:'association-conflict',expires};
    return {name:value.car_name,car:value.car,reason:'confirmed',expires};
}
function state(hass,options,now=Date.now()) {
    const mapped=easee.mapEntities(hass,options,registry.entries(hass));
    const states=hass && hass.states || {},get=role=>states[mapped.entities[role]];
    const raw=get('status'),status=easee.normalize(raw && raw.state,options.provider === 'easee'),online=boolean(get('online'));
    const session=registry.session(hass);
    const offline=absent(raw) || ['offline','unavailable'].includes(status) ||
        !!mapped.entities.online && online !== true || !!(session && !session.online) || !!(hass && hass.connection && hass.connection.connected === false);
    const fault=status === 'error' || status === 'erratic_ev' || status.startsWith('error_');
    const enabledValue=boolean(get('enabled'));
    const disabled=enabledValue === false || ['disabled','suspended','off'].includes(status);
    let connected=easee.connection(status);
    const physical=boolean(get('connected'));
    const contradictory=physical !== null && connected !== null && physical !== connected;
    if (mapped.entities.connected) connected=contradictory ? null : physical;
    if (offline) connected=null;
    let power=measurement(get('power'),'power',options.max_age,now);
    if (session && session.measurementFloor && time(get('power')) < session.measurementFloor) power=null;
    const available=!offline && !mapped.issues.includes('device-mismatch') && !mapped.issues.includes('provider-mismatch') && !mapped.issues.includes('unverified-status');
    const active=available && !fault && !disabled && enabledValue === true && connected === true && status === 'charging' && !!power && power.value > 0;
    const offlineLabel=status === 'offline' || online === false || session && !session.online || hass && hass.connection && hass.connection.connected === false ? 'Offline' : status === 'unknown' ? 'Status unknown' : 'Unavailable';
    const label=offline || !available ? offlineLabel : fault ? 'Fault' : disabled ? 'Disabled' : contradictory ? 'Status unknown' :
        status === 'charging' ? 'Charging' : status === 'ready_to_charge' ? 'Ready' : status === 'completed' ? 'Completed' :
        status === 'disconnected' ? 'No car' : status === 'paused_due_to_equalizer' || status === 'stop_charging' || status === 'paused' ? 'Paused' :
        ['awaiting_start','awaiting_authorization','de_authorizing','start_charging','awaiting_load_balancing','awaiting_smart_start','awaiting_scheduled_start','authenticating','searching_for_master'].includes(status) ? 'Waiting' : 'Status unknown';
    const color=!available || fault ? COLORS.fault : disabled ? COLORS.disabled : enabledValue === true && connected === true ? COLORS.connected :
        enabledValue === true && connected === false ? COLORS.disconnected : COLORS.unknown;
    const link=association(hass,options.association,connected,now);
    const vehicle=offline ? offlineLabel : connected === true ? link.name || 'Car connected' : connected === false ? 'No car' : 'Connection unknown';
    const lock=get('physical_lock');
    const locked=absent(lock) ? null : lock.state === 'locked' ? true : lock.state === 'unlocked' ? false :
        lock.attributes && lock.attributes.device_class === 'lock' ? boolean(lock) === null ? null : !boolean(lock) : null;
    const numeric=kind=>measurement(get(kind),kind === 'session_energy' ? 'energy' : 'current',options.max_age,now);
    const refresh=[power && power.expires,link.expires].filter(v=>v > now);
    return {options,entities:mapped.entities,identity:mapped.identity,issues:mapped.issues,status,label,available,fault,disabled,enabled:enabledValue,
        connected,contradictory,power,active,color,vehicle,link,locked,energy:numeric('session_energy'),current:numeric('current'),limit:numeric('limit'),
        refreshAt:refresh.length ? Math.min(...refresh) : null};
}
function aggregate(hass,options,now=Date.now()) {
    const seen=new Set(),powers=new Set(),values=[];
    for (const charger of options.chargers) {
        const value=state(hass,charger,now),power=value.entities.power;
        if (seen.has(value.identity) || power && powers.has(power)) continue;
        seen.add(value.identity);if(power)powers.add(power);values.push(value);
    }
    // Unknown is never zero. Noncharging positive reports are contradictory,
    // so they cannot be silently added as verified charging power.
    const valid=values.filter(v=>v.available && !v.fault && v.power &&
        (v.status === 'charging' && v.enabled === true && !v.disabled && v.connected === true || v.power.value === 0));
    const watts=valid.reduce((n,v)=>n+v.power.value,0),complete=valid.length === values.length;
    const expiries=values.map(v=>v.refreshAt).filter(v=>v > now);
    return {values,watts,complete,known:valid.length,connected:values.filter(v=>v.connected === true).length,
        connectionsKnown:values.every(v=>v.connected !== null),active:values.some(v=>v.active),refreshAt:expiries.length ? Math.min(...expiries) : null};
}
function writable(hass,value,role) {
    const id=value.entities[role],source=(hass && hass.states || {})[id];
    return !!(value.available && !value.fault && value.label !== 'Status unknown' && !value.contradictory && typeof id === 'string' && id.startsWith('switch.') && boolean(source) !== null &&
        hass && typeof hass.callService === 'function' && hass.services && hass.services.switch && hass.services.switch.turn_on && hass.services.switch.turn_off);
}
function snapshot(hass,config) {
    const options=config._charger,values=options.aggregate ? options.chargers : [options],entries=registry.entries(hass),states=hass && hass.states || {};
    const ids=new Set();
    const field=config._charger_field;
    const roles=!field || field === 'details' ? null : ['status','enabled','online','connected',
        ...(field === 'permanent_lock' ? ['permanent_lock','physical_lock'] : []),
        ...(field === 'session_energy' ? ['session_energy'] : []),...(field === 'current' ? ['current','limit'] : [])];
    for (const c of values) {
        for(const [role,id] of Object.entries(easee.mapEntities(hass,c,entries).entities))if(!roles || roles.includes(role))ids.add(id);
        if (c.association && (!field || ['vehicle','details'].includes(field))) ids.add(c.association.entity);
    }
    const value=registry.session(hass);
    return JSON.stringify([Array.from(ids).sort().map(id=>[id,states[id],hass && hass.entities && hass.entities[id]]),
        hass && hass.services && hass.services.switch,hass && hass.connection && hass.connection.connected,value && value.version]);
}
module.exports={COLORS,absent,boolean,time,measurement,association,state,aggregate,writable,snapshot};
