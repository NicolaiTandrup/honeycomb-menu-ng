// A deliberately local subset of Home Assistant dashboard conditions. No
// backend template/device conditions or automation side effects are evaluated.
function numeric(value)
{
    if( !['number', 'string'].includes(typeof value) || String(value).trim() === '' )
        return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
}

function valid(condition)
{
    if( !condition || typeof condition !== 'object' || Array.isArray(condition) )
        return false;
    const kind = condition.condition || 'state'; // Legacy HA conditional syntax.
    if( ['and', 'or', 'not'].includes(kind) )
        return Array.isArray(condition.conditions) && condition.conditions.every(valid);
    if( typeof (condition.entity || condition.entity_id) !== 'string' || !(condition.entity || condition.entity_id).trim() )
        return false;
    if( kind === 'state' )
    {
        const values = condition.state !== undefined ? condition.state : condition.state_not;
        return values !== undefined && (Array.isArray(values) ? values : [values])
            .every(value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean');
    }
    if( kind === 'numeric_state' )
        return condition.above !== undefined || condition.below !== undefined;
    return false;
}

function check(condition, hass)
{
    const kind = condition.condition || 'state';
    if( kind === 'and' )
        return condition.conditions.every(child => check(child, hass));
    if( kind === 'or' )
        return condition.conditions.some(child => check(child, hass));
    if( kind === 'not' )
        return !condition.conditions.every(child => check(child, hass));

    const states = hass && hass.states || {};
    const entity = states[condition.entity || condition.entity_id];
    const raw = entity && (condition.attribute
        ? (entity.attributes || {})[condition.attribute] : entity.state);
    if( kind === 'state' )
    {
        const actual = raw === undefined || raw === null ? 'unknown' : String(raw);
        const expected = condition.state !== undefined ? condition.state : condition.state_not;
        const values = Array.isArray(expected) ? expected : [expected];
        const matches = values.some(value => String(value) === actual ||
            (typeof value === 'string' && states[value] && states[value].state === actual));
        return condition.state !== undefined ? matches : !matches;
    }

    const value = numeric(raw);
    if( value === null )
        return false;
    for( const key of ['above', 'below'] )
    {
        if( condition[key] === undefined )
            continue;
        const input = condition[key];
        const threshold = numeric(typeof input === 'string' && states[input] ? states[input].state : input);
        // Invalid thresholds fail closed instead of silently widening visibility.
        if( threshold === null || (key === 'above' ? value <= threshold : value >= threshold) )
            return false;
    }
    return true;
}

function matchesVisibility(conditions, hass)
{
    if( conditions === undefined )
        return true;
    // Validate the whole tree before evaluating NOT/OR so malformed conditions
    // cannot become true merely by being negated or placed in an unused branch.
    return Array.isArray(conditions) && conditions.every(valid) &&
        conditions.every(condition => check(condition, hass));
}

module.exports = { matchesVisibility };
