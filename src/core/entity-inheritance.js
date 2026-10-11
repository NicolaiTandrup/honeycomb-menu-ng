function applyEntityToAction(action, entity)
{
    if( ! action || typeof action !== 'object' || ! entity )
        return;

    const actionName = action.action;

    if( actionName === 'perform-action' )
    {
        if( ! action.target )
            action.target = { entity_id: entity };
    }
    else if( actionName === 'call-service' )
    {
        if( ! action.target )
        {
            if( ! action.service_data )
                action.service_data = {};

            if( action.service_data.entity_id === undefined )
                action.service_data.entity_id = entity;
        }
    }

    const nested = action.honeycomb_menu || action.honeycomb_nested_menu;

    if( nested )
        applyEntityInheritance(nested, entity);
}

function applyEntityInheritance(config, inheritedEntity)
{
    if( ! config || typeof config !== 'object' )
        return config;

    const localEntity =
        config.entity ||
        config.entity_id ||
        inheritedEntity ||
        null;

    if( localEntity && ! config.entity )
        config.entity = localEntity;

    if( config.center_button && typeof config.center_button === 'object' )
    {
        const centerEntity = config.center_button.entity || localEntity;

        if( centerEntity && ! config.center_button.entity )
            config.center_button.entity = centerEntity;

        ['tap_action', 'hold_action', 'double_tap_action', 'press_action'].forEach(key => {
            applyEntityToAction(config.center_button[key], centerEntity);
        });
    }

    if( config.persistent_center && typeof config.persistent_center === 'object' )
        applyEntityInheritance(config.persistent_center, localEntity);

    const visitButton = button => {
        if( ! button || typeof button !== 'object' )
            return;

        const buttonEntity =
            button.entity ||
            button.entity_id ||
            localEntity;

        if( buttonEntity && ! button.entity )
            button.entity = buttonEntity;

        ['tap_action', 'hold_action', 'double_tap_action', 'press_action'].forEach(key => {
            applyEntityToAction(button[key], buttonEntity);
        });
    };

    if( Array.isArray(config.buttons) )
    {
        config.buttons.forEach(entry => {
            if( Array.isArray(entry) )
                entry.forEach(visitButton);
            else
                visitButton(entry);
        });
    }

    return config;
}

module.exports = {
    applyEntityToAction,
    applyEntityInheritance
};
