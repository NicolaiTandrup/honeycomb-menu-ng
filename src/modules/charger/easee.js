// Audited nordicopen/easee_hass 08534714fd1d84cb2dad39ac3e1d32cb45a5e8f3.
// Unique IDs are exactly `${product.id}_${definition key}`; no entity-name search.
const KEYS={status:['sensor','status'],power:['sensor','power'],session_energy:['sensor','session_energy'],enabled:['switch','is_enabled'],
    permanent_lock:['switch','cable_locked_permanently'],physical_lock:['binary_sensor','cable_locked'],online:['binary_sensor','online'],
    current:['sensor','current'],limit:['sensor','output_limit']};
const codes={1:'disconnected',2:'awaiting_start',3:'charging',4:'completed',5:'error',6:'ready_to_charge',7:'awaiting_authorization',8:'de_authorizing',
    100:'start_charging',101:'stop_charging',102:'offline',103:'awaiting_load_balancing',104:'awaiting_authorization',105:'awaiting_smart_start',
    106:'awaiting_scheduled_start',107:'authenticating',108:'paused_due_to_equalizer',109:'searching_for_master',157:'erratic_ev',
    158:'error_temperature_too_high',159:'error_dead_powerboard',160:'error_overcurrent',161:'error_pen_fault'};
function normalize(value) {
    const text=String(value === undefined ? '' : value).trim().toLowerCase().replace(/[\s-]+/g,'_');
    return codes[text] || ({car_disconnected:'disconnected',ready:'ready_to_charge',connected:'ready_to_charge',fault:'error',faulted:'error',disabled:'disabled',suspended:'suspended'}[text]) || text;
}
const connected=new Set(['awaiting_start','charging','completed','ready_to_charge','awaiting_authorization','de_authorizing','start_charging',
    'awaiting_load_balancing','awaiting_smart_start','awaiting_scheduled_start','authenticating','paused_due_to_equalizer']);
function connection(status) { return status === 'disconnected' ? false : connected.has(status) ? true : null; }
function mapEntities(hass,options,registry) {
    const map={...options.entities},byId=new Map(registry.map(e=>[e.entity_id,e])),anchor=byId.get(options.entity);
    const state=(hass && hass.states || {})[options.entity];
    const product=state && state.attributes && state.attributes.id;
    const device=options.device_id || anchor && anchor.device_id;
    const issues=[];
    if (anchor && options.device_id && anchor.device_id && anchor.device_id !== options.device_id) issues.push('device-mismatch');
    if (options.provider === 'easee' && anchor && anchor.platform && anchor.platform !== 'easee') issues.push('provider-mismatch');
    const prefix=product !== undefined ? String(product) : anchor && anchor.platform === 'easee' && /_status$/.test(anchor.unique_id || '') ? anchor.unique_id.slice(0,-7) : null;
    if (options.provider === 'easee' && options.discover && device && prefix && anchor && anchor.platform === 'easee' && anchor.unique_id === prefix+'_status') {
        for (const [role,[domain,key]] of Object.entries(KEYS)) {
            if (map[role]) continue;
            const candidates=registry.filter(e=>e.platform === 'easee' && e.device_id === device && e.unique_id === prefix+'_'+key &&
                e.entity_id.startsWith(domain+'.') && !e.disabled_by && !e.hidden_by);
            if (candidates.length === 1) map[role]=candidates[0].entity_id;
            else if (candidates.length > 1) issues.push('ambiguous-'+role);
        }
    }
    for (const [role,id] of Object.entries(map)) {
        const entry=byId.get(id),source=(hass && hass.states || {})[id],sourceId=source && source.attributes && source.attributes.id;
        const wrongCapability=options.provider === 'easee' && prefix && KEYS[role] && entry && entry.platform === 'easee' &&
            entry.unique_id && entry.unique_id !== prefix+'_'+KEYS[role][1];
        const lockAsPresence=['connected','online'].includes(role) && source && source.attributes && source.attributes.device_class === 'lock';
        const wrong=entry && (entry.disabled_by || device && entry.device_id && entry.device_id !== device ||
            options.provider === 'easee' && entry.platform && entry.platform !== 'easee') ||
            options.provider === 'easee' && prefix && sourceId !== undefined && String(sourceId) !== prefix || wrongCapability || lockAsPresence;
        if (wrong) {delete map[role];issues.push('unverified-'+role);}
    }
    return {entities:map,issues,identity:device ? 'device:'+device : options.provider === 'easee' && prefix ? 'easee:'+prefix : 'entity:'+options.entity};
}
module.exports={KEYS,normalize,connection,mapEntities};
