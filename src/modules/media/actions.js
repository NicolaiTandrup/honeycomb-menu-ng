function handleGroupVolume({ hass, actionConfig, entity })
{
    if( ! hass || ! actionConfig )
        return false;

    const entityId =
        actionConfig.entity ||
        entity ||
        null;

    if( ! entityId )
        return false;

    const state = hass.states[entityId];
    const members =
        state &&
        state.attributes &&
        Array.isArray(state.attributes.group_members)
            ? state.attributes.group_members.filter(Boolean)
            : [];

    const targets = members.length
        ? Array.from(new Set(members))
        : [entityId];

    if( ! targets.includes(entityId) )
        targets.unshift(entityId);

    const direction = String(actionConfig.direction || '').toLowerCase();
    const service = direction === 'down' ? 'volume_down' : 'volume_up';

    hass.callService(
        'media_player',
        service,
        {},
        { entity_id: targets }
    );

    return true;
}

function registerActions(registry)
{
    registry.register('honeycomb-media-volume', handleGroupVolume);
}

module.exports = {
    handleGroupVolume,
    registerActions
};
