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

function brightnessLabel(config, state)
{
    const mode = config.show_brightness || 'when_on';

    if( mode === 'never' || ! state || ! state.attributes )
        return null;

    if( mode === 'when_on' && state.state !== 'on' )
        return null;

    const brightness = Number(state.attributes.brightness);

    if( ! Number.isFinite(brightness) )
        return null;

    const percentage = Math.max(
        0,
        Math.min(100, Math.round((brightness / 255) * 100))
    );

    return `${percentage}%`;
}

function resolve({ config, state, runtime })
{
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
    brightnessLabel
};
