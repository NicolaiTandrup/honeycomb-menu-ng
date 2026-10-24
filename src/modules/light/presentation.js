const {selectedPalette}=require('./palette-state');
function kelvinToRgb(kelvin)
{
    let temp = Math.max(1000, Math.min(40000, Number(kelvin) || 2700)) / 100;
    let red;
    let green;
    let blue;

    if( temp <= 66 )
    {
        red = 255;
        green = 99.4708025861 * Math.log(temp) - 161.1195681661;
        blue = temp <= 19
            ? 0
            : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
    else
    {
        red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
        green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
        blue = 255;
    }

    const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
    return `rgb(${clamp(red)}, ${clamp(green)}, ${clamp(blue)})`;
}

function currentColor(state)
{
    if( ! state || ! state.attributes )
        return null;

    const attrs = state.attributes;

    if( Array.isArray(attrs.rgb_color) && attrs.rgb_color.length >= 3 )
        return `rgb(${attrs.rgb_color[0]}, ${attrs.rgb_color[1]}, ${attrs.rgb_color[2]})`;

    if( attrs.color_temp_kelvin )
        return kelvinToRgb(attrs.color_temp_kelvin);

    return null;
}

function isOnOffOnly(state)
{
    if( ! state )
        return false;

    const attrs = state.attributes || {};
    const modes = Array.isArray(attrs.supported_color_modes)
        ? attrs.supported_color_modes.filter(Boolean)
        : [];

    // Be conservative: only suppress the detail menu when Home Assistant
    // explicitly tells us that this is an on/off-only light. Missing
    // capabilities can happen temporarily for remote/unavailable entities.
    return modes.length > 0 && modes.every(mode => mode === 'onoff');
}

function brightnessLabel(config, state)
{
    const mode = config.show_brightness || 'when_on';

    if( mode === 'never' || ! state )
        return null;

    if( state.state === 'off' )
        return 'Off';

    if( state.state !== 'on' )
        return null;

    const attrs = state.attributes || {};
    const brightness = Number(attrs.brightness);

    if( Number.isFinite(brightness) )
    {
        const percentage = Math.max(
            0,
            Math.min(100, Math.round((brightness / 255) * 100))
        );

        return `${percentage}%`;
    }

    // On/off-only lights have no meaningful brightness percentage.
    // "On" also gives a sensible fallback for integrations that report an
    // active light without a brightness attribute.
    return 'On';
}

function resolve({ config, state, runtime, hass })
{
    selectedPalette(hass,config && config.entity);
    const configured = (config && config.colors) || {};
    const off = (config && config.off) || {};

    if( ! state || ['unavailable', 'unknown'].includes(state.state) )
    {
        const unavailable = configured.unavailable || '#555b63';
        return {
            colors: {
                center: unavailable,
                inner: unavailable,
                outer: unavailable
            },
            secondary: 'Unavailable'
        };
    }

    const on = state.state === 'on';
    const actual = currentColor(state);

    if( on && actual && runtime )
        runtime.lastKnownColor = actual;

    const preview =
        (runtime && runtime.lastKnownColor) ||
        off.preview_color ||
        '#4f7fae';

    const automaticCenter =
        on
            ? (actual || '#f3eadb')
            : (off.center_color || '#202224');

    const automaticInner =
        on
            ? (actual || automaticCenter)
            : preview;

    const automaticOuter = automaticCenter;

    return {
        active: on,
        colors: {
            center:
                configured.center && configured.center !== 'auto'
                    ? configured.center
                    : automaticCenter,
            inner:
                configured.inner_border && configured.inner_border !== 'auto'
                    ? configured.inner_border
                    : automaticInner,
            outer:
                configured.outer_border === 'auto'
                    ? automaticOuter
                    : (configured.outer_border || '#34383d')
        },
        secondary: brightnessLabel(config, state)
    };
}

module.exports = {
    resolve,
    currentColor,
    brightnessLabel,
    isOnOffOnly
};
