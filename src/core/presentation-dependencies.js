// Declarative static faces depend on their entity's state/attributes. Arbitrary
// existing JS templates/custom content remain conservative, never guessed from
// a partial JS parser (which could miss computed entity IDs or user context).
const KEYS = ['name','label','icon','colors','border','styles','background','foreground','variables','custom_fields'];
function presentationDependencies(config) {
    let wildcard = !!config.custom_fields;
    const visit = value => {
        if (typeof value === 'string' && /\[\[\[|HCJS:|\$\{/.test(value)) wildcard = true;
        else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    for (const key of KEYS) visit(config[key]);
    return {wildcard, entity:config.entity, sonos:['sonos','sonos-favorite'].includes(config.mode) ? config._sonos : null,
        sonosPlayer:config.mode==='sonos-favorite' ? (config._sonos || {}).player : config.entity, sleep:config._sleep};
}
function presentationSnapshot(hass, dependency) {
    const entity = (hass && hass.states || {})[dependency.entity];
    if (dependency.sleep) {
        const states=hass && hass.states || {};
        const reported=entity && entity.attributes && entity.attributes.group_members;
        const group=Array.isArray(reported) ? reported : [];
        return JSON.stringify([entity,group.map(id=>[states[id],hass && hass.entities && hass.entities[id]]),
            hass && hass.services && hass.services.sonos]);
    }
    if (dependency.sonos) {
        const states=hass && hass.states || {};
        const player=states[dependency.sonosPlayer] || entity;
        const leader=(player && player.attributes && player.attributes.group_members || [])[0];
        return JSON.stringify([entity,player,states[dependency.sonos.favorites],states[dependency.sonos.cache],states[leader],
            ...(dependency.sonos.browse ? [hass && hass.entities && hass.entities[dependency.sonosPlayer],hass && hass.entities && hass.entities[leader]] : [])]);
    }
    return JSON.stringify(entity ? [entity.state, entity.attributes] : null);
}
module.exports = {presentationDependencies, presentationSnapshot};
