// Public Charger schema. Entity IDs are explicit; names are never discovery keys.
const wave = require('../../core/energy-wave');
const ROLES = ['status','power','enabled','online','connected','session_energy','physical_lock','permanent_lock','current','limit'];
const ENTITY = /^(sensor|binary_sensor|switch|number|input_number|lock)\.[a-z0-9_]+$/;
const summary = item => item.type === 'charging-hub' || item.module === 'charging-hub' || item.mode === 'charger-summary';
function waveOptions(value) {
    if (value === false) return false;
    if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw Error('Charger energy_wave must be an object or false.');
    const options = value || {};
    const speed_mode = options.speed_mode || (options.cycle_ms !== undefined ? 'fixed' : 'power');
    const result = {...(speed_mode === 'power' ? {max_power_w:19400} : {}),...options,speed_mode};
    wave.validate({active:false,available:false,fault:false,power_w:0,...result});
    return result;
}
function settings(item) {
    if (item._charger) return item._charger;
    if (item.name !== undefined && (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 256)) throw Error('Charger name must be a nonempty text string (at most 256 characters).');
    if (summary(item)) {
        if (!Array.isArray(item.chargers)) throw Error('charging-hub requires a chargers list (which may be empty).');
        return {aggregate:true,name:item.name || 'Charging Hub',chargers:item.chargers.map(value=>{
            if (!value || summary(value) || value.chargers) throw Error('charging-hub members must be individual chargers.');
            return settings(value);
        }),wave:waveOptions(item.energy_wave)};
    }
    const provider = item.provider || 'generic';
    if (!['generic','easee'].includes(provider)) throw Error('Charger provider must be generic or easee.');
    const entities = {...item.entities};
    if (item.entity && entities.status && item.entity !== entities.status) throw Error('Charger entity and entities.status conflict.');
    entities.status = item.entity || entities.status;
    if (!entities.status) throw Error('Charger requires its status entity.');
    for (const [role,id] of Object.entries(entities)) {
        if (!ROLES.includes(role) || typeof id !== 'string' || !ENTITY.test(id)) throw Error('Charger entities requires supported roles and concrete HA entity IDs.');
        if (['enabled','permanent_lock'].includes(role) && !id.startsWith('switch.')) throw Error(`Charger ${role} must be a writable switch entity, not a physical sensor.`);
        if (role === 'online' && !id.startsWith('binary_sensor.')) throw Error('Charger online must be a binary sensor.');
        if (role === 'connected' && !id.startsWith('binary_sensor.')) throw Error('Charger connected must be a binary sensor.');
        if (role === 'physical_lock' && !/^(binary_sensor|lock)\./.test(id)) throw Error('Charger physical_lock must be a read-only binary sensor or lock state.');
    }
    if (entities.enabled && entities.enabled === entities.permanent_lock) throw Error('Enabled and permanent-lock controls cannot use the same switch.');
    if (entities.connected && entities.connected === entities.physical_lock) throw Error('Physical lock is not physical connection.');
    const max_age = item.max_age === undefined ? 300 : item.max_age;
    if (!Number.isFinite(max_age) || max_age < 10 || max_age > 86400) throw Error('Charger max_age must be 10–86400 seconds.');
    let association;
    if (item.association !== undefined) {
        const a=item.association;
        if (!a || !/^sensor\.[a-z0-9_]+$/.test(a.entity || '') || typeof a.charger_key !== 'string' || !a.charger_key.trim() ||
            Object.keys(a).some(k=>!['entity','charger_key','max_age'].includes(k))) throw Error('Charger association requires sensor entity and exact charger_key.');
        const age=a.max_age === undefined ? 300 : a.max_age;
        if (!Number.isFinite(age) || age < 10 || age > 86400) throw Error('Association max_age must be 10–86400 seconds.');
        association={...a,max_age:age};
    }
    if (item.discover !== undefined && typeof item.discover !== 'boolean') throw Error('Charger discover must be boolean.');
    if (item.device_id !== undefined && (typeof item.device_id !== 'string' || !item.device_id)) throw Error('Charger device_id must be an HA device ID.');
    return {provider,entity:entities.status,entities,name:item.name || 'Charger',device_id:item.device_id,
        discover:provider === 'easee' && item.discover !== false,max_age,association,wave:waveOptions(item.energy_wave)};
}
function validate(item) { if (item.type === 'charger' || item.module === 'charger' || summary(item)) settings(item); }
module.exports = {ROLES,settings,summary,waveOptions,validate};
