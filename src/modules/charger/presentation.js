const model=require('./model');
const {SUBMENU_FILL,SUBMENU_INNER}=require('../../core/submenu-theme');
const {recordFor}=require('./actions');
const registry=require('./registry');
const {waveOptions}=require('./config');
const number=(value,digits=1)=>Number(value).toFixed(digits);
const neutral='#202224',outer='#34383d';
function energyWave(options,value,config) {
    const wave=waveOptions(config.energy_wave === undefined ? options.wave : config.energy_wave);
    if (wave === false) return false;
    return {...wave,active:value.active,available:value.available !== false,fault:!!value.fault,power_w:value.watts === undefined ? value.power && value.power.value || 0 : value.watts};
}
function resolve({hass,config}) {
    const options=config._charger;
    if (!options) return {colors:{center:neutral,inner:model.COLORS.unknown,outer},secondary:'Not configured'};
    if (options.aggregate) {
        const value=model.aggregate(hass,options);
        const power=value.complete || value.known ? (value.complete ? '' : '≥ ')+number(value.watts/1000)+' kW' : '— kW';
        const count=value.connected+(value.connectionsKnown ? '' : '+')+' '+(value.connected === 1 && value.connectionsKnown ? 'car' : 'cars');
        const color=value.values.some(v=>!v.available || v.fault) ? model.COLORS.fault : value.active ? model.COLORS.connected :
            value.values.some(v=>v.connected) ? model.COLORS.connected : model.COLORS.disconnected;
        return {name:power,secondary:count,active:value.active,colors:{center:value.active ? color : neutral,inner:color,outer},
            ariaLabel:`${options.name}: ${power}, ${count}${value.complete ? '' : ', power incomplete'}`,
            energyWave:energyWave(options,{...value,available:true,fault:false},config),refreshAt:value.refreshAt};
    }
    const value=model.state(hass,options),role=config._charger_field;
    let name=options.name,secondary=value.status === 'charging' && value.available && !value.fault && !value.disabled ?
        value.power ? number(value.power.value/1000)+' kW' : 'Power unknown' : value.label;
    let tertiary=value.vehicle,disabled=false,refreshAt=!role || role === 'details' ? value.refreshAt : role === 'vehicle' ? value.link.expires : null;
    let color=value.color;
    let iconBadge,labelLayout;
    if (!role) {
        name=!value.available || value.fault ? value.label : value.disabled ? 'Disabled' : value.vehicle;
        secondary=options.name;tertiary=null;labelLayout='two-row';
        if (value.active) iconBadge=number(value.power.value/1000)+' kW';
    }
    if (role) {
        tertiary=null;
        if (role === 'enabled' || role === 'permanent_lock') {
            const id=value.entities[role],source=(hass && hass.states || {})[id];
            const record=recordFor(hass,value,role);
            const writable=model.writable(hass,value,role);
            name=role === 'enabled' ? 'Enabled' : 'Cable lock';
            secondary=id ? model.absent(source) ? 'Unavailable' : model.boolean(source) === null ? 'Unknown' : source.state.toUpperCase() : 'Not mapped';
            if (role === 'permanent_lock') tertiary=value.locked === null ? 'Physical unknown' : value.locked ? 'Locked' : 'Unlocked';
            if (!id && role === 'permanent_lock' && value.locked !== null) {secondary=value.locked ? 'Locked' : 'Unlocked';tertiary='Read-only';}
            if (record) {
                tertiary=record.phase === 'sending' ? 'Sending…' : record.phase === 'pending' ? 'Awaiting HA' : record.phase === 'failed' ? 'Command failed' : 'Not confirmed';
                if (record.deadline > Date.now()) refreshAt=refreshAt ? Math.min(refreshAt,record.deadline) : record.deadline;
            }
            disabled=!writable || !!(record && ['sending','pending'].includes(record.phase));
        } else if (role === 'session_energy') {
            name='Session';secondary=value.energy ? number(value.energy.value,2)+' kWh' : value.entities.session_energy ? 'Unavailable' : 'Not mapped';disabled=true;
        } else if (role === 'vehicle') {
            name=value.link.name || 'Vehicle';secondary=value.link.name ? 'Connected' : value.vehicle;disabled=true;
        } else if (role === 'current') {
            name=value.current ? 'Current' : value.limit ? 'Allocation' : 'Current';
            secondary=value.current || value.limit ? number((value.current || value.limit).value)+' A' : 'Not available';
            tertiary=value.current && value.limit ? 'Limit '+number(value.limit.value)+' A' : null;disabled=true;
        } else {
            name='Details';secondary=value.label;
            const warnings=value.issues.length+(!value.power ? 1 : 0)+(options.association && value.connected && !value.link.name ? 1 : 0);
            tertiary=warnings ? warnings+' diagnostic'+(warnings === 1 ? '' : 's') : 'Home Assistant';
        }
    }
    return {name,secondary,tertiary,disabled,active:!role && value.active,
        ...(!role ? {iconBadge,labelLayout} : {}),
        colors:{center:role ? SUBMENU_FILL : value.active ? color : neutral,inner:role ? SUBMENU_INNER : color,outer},
        ariaLabel:[name,secondary,tertiary,iconBadge,!role && value.status === 'charging' && !value.power ? 'Power unknown' : null].filter(Boolean).join(', '),refreshAt,
        ...(!role ? {energyWave:energyWave(options,value,config)} : {})};
}
function diagnostics({hass,config}) {
    const options=config._charger;
    if (options.aggregate) {
        const value=model.aggregate(hass,options);
        return {configured:options.chargers.length,unique:value.values.length,power_complete:value.complete,measurements:value.known,connections_known:value.connectionsKnown};
    }
    const value=model.state(hass,options);
    return {provider:options.provider,available:value.available,fault:value.fault,connection_known:value.connected !== null,charging:value.active,
        measured_power_fresh:!!value.power,association:value.link.reason,issues:value.issues,capabilities:Object.keys(value.entities),
        writable_enabled:model.writable(hass,value,'enabled'),writable_permanent_lock:model.writable(hass,value,'permanent_lock')};
}
module.exports={resolve,diagnostics,snapshot:model.snapshot,observe:registry.observe};
