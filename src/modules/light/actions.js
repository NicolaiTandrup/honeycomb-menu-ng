function setNumberHelper(hass, entityId, value)
{
    if( ! hass || ! entityId || ! Number.isFinite(Number(value)) )
        return;

    hass.callService(
        'number',
        'set_value',
        { value: Number(value) },
        { entity_id: entityId }
    );
}

function handlePreset(mode, context)
{
    const {
        hass,
        actionConfig,
        entity
    } = context;

    if( ! hass || ! actionConfig || ! entity )
        return false;

    const light = hass.states[entity];

    if( ! light )
        return false;

    const type = actionConfig.preset_type;

    if( type === 'brightness' )
    {
        const helper = actionConfig.helper_entity;
        const helperState = helper ? hass.states[helper] : null;

        if( mode === 'apply' )
        {
            const value = helperState ? Number(helperState.state) : NaN;

            if( Number.isFinite(value) )
            {
                hass.callService(
                    'light',
                    'turn_on',
                    { brightness_pct: Math.max(0, Math.min(100, value)) },
                    { entity_id: entity }
                );
            }
        }
        else
        {
            const brightness = Number(light.attributes && light.attributes.brightness);

            if( Number.isFinite(brightness) )
            {
                setNumberHelper(
                    hass,
                    helper,
                    Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)))
                );
            }
        }

        return true;
    }

    if( type === 'kelvin' )
    {
        const helper = actionConfig.helper_entity;
        const helperState = helper ? hass.states[helper] : null;

        if( mode === 'apply' )
        {
            const value = helperState ? Number(helperState.state) : NaN;

            if( Number.isFinite(value) )
            {
                hass.callService(
                    'light',
                    'turn_on',
                    { color_temp_kelvin: Math.round(value) },
                    { entity_id: entity }
                );
            }
        }
        else
        {
            const kelvin = Number(light.attributes && light.attributes.color_temp_kelvin);

            if( Number.isFinite(kelvin) )
                setNumberHelper(hass, helper, Math.round(kelvin));
        }

        return true;
    }

    if( type === 'color' )
    {
        const hueEntity = actionConfig.hue_entity;
        const saturationEntity = actionConfig.saturation_entity;

        if( mode === 'apply' )
        {
            const hueState = hueEntity ? hass.states[hueEntity] : null;
            const satState = saturationEntity ? hass.states[saturationEntity] : null;
            const hue = hueState ? Number(hueState.state) : NaN;
            const saturation = satState ? Number(satState.state) : NaN;

            if( Number.isFinite(hue) && Number.isFinite(saturation) )
            {
                hass.callService(
                    'light',
                    'turn_on',
                    {
                        hs_color: [
                            Math.max(0, Math.min(360, hue)),
                            Math.max(0, Math.min(100, saturation))
                        ]
                    },
                    { entity_id: entity }
                );
            }
        }
        else
        {
            const hs = light.attributes && light.attributes.hs_color;

            if( Array.isArray(hs) && hs.length >= 2 )
            {
                setNumberHelper(
                    hass,
                    hueEntity,
                    Math.max(0, Math.min(360, Number(hs[0])))
                );
                setNumberHelper(
                    hass,
                    saturationEntity,
                    Math.max(0, Math.min(100, Number(hs[1])))
                );
            }
        }

        return true;
    }

    return false;
}

function registerActions(registry)
{
    registry.register(
        'honeycomb-preset-apply',
        context => handlePreset('apply', context)
    );

    registry.register(
        'honeycomb-preset-store',
        context => handlePreset('store', context)
    );
}

module.exports = {
    registerActions,
    handlePreset
};
