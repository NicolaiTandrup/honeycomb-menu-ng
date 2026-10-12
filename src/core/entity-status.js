function unavailableLabel(state, config = {})
{
    if( config.show_unavailable === false )
        return null;

    // Missing state and explicit HA unavailable both mean the persistent
    // control cannot currently reach its backing entity.
    if( ! state || state.state === 'unavailable' )
        return config.unavailable_label || 'Unavailable';

    return null;
}

module.exports = {
    unavailableLabel
};
