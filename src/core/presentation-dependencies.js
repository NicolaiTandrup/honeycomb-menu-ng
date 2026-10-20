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
    return {wildcard, entity:config.entity};
}
function presentationSnapshot(hass, dependency) {
    const entity = (hass && hass.states || {})[dependency.entity];
    return JSON.stringify(entity ? [entity.state, entity.attributes] : null);
}
module.exports = {presentationDependencies, presentationSnapshot};
