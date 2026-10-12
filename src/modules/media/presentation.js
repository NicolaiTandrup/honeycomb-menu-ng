function volumeLabel(config, state)
{
    const mode = config.show_volume || 'when_playing';

    if( mode === 'never' || ! state || ! state.attributes )
        return null;

    if( mode === 'when_playing' && state.state !== 'playing' )
        return null;

    const volume = Number(state.attributes.volume_level);

    if( ! Number.isFinite(volume) )
        return null;

    const percentage = Math.max(0, Math.min(100, Math.round(volume * 100)));
    return `${percentage}%`;
}

function resolve({ config, state })
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

    const active =
        config.active_color ||
        configured.active ||
        '#00bcd4';

    const playing = state.state === 'playing';
    const automaticCenter =
        playing
            ? active
            : (off.center_color || '#202224');

    return {
        colors: {
            center:
                configured.center && configured.center !== 'auto'
                    ? configured.center
                    : automaticCenter,
            inner:
                configured.inner_border && configured.inner_border !== 'auto'
                    ? configured.inner_border
                    : active,
            outer:
                configured.outer_border === 'auto'
                    ? automaticCenter
                    : (configured.outer_border || '#34383d')
        },
        secondary: volumeLabel(config, state)
    };
}

module.exports = {
    resolve,
    volumeLabel
};
