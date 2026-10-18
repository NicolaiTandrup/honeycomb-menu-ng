/*
 * Persistent-Hub launcher classification.
 *
 * The Hub must decide how a base item is rendered from the module contract,
 * not from incidental/private properties on a generated launcher object.
 * This is especially important for physical slot 0 because classic
 * center_button and native honeycomb-persistent-control have different
 * behavior and presentation.
 */

function launcherKind(module, launcher)
{
    if( module && module.launcherKind )
        return module.launcherKind;

    if( launcher && launcher._persistent_launcher === true )
        return 'persistent';

    return 'generic';
}

// Normalize the module contract once before dynamic allocation. Both center
// and ring renderers then receive the same native/generic classification,
// including third-party modules that declare a kind without the legacy flag.
function normalizeLauncher(module, launcher)
{
    return launcher && {...launcher,
        _persistent_launcher: launcherKind(module, launcher) === 'persistent'};
}

function toCenterDescriptor(module, launcher)
{
    if( ! launcher || typeof launcher !== 'object' )
    {
        return {
            kind: 'none',
            config: null
        };
    }

    const kind = launcherKind(module, launcher);
    const config = { ...launcher };

    delete config.slot;
    delete config.slot_mode;
    delete config._persistent_launcher;

    if( kind === 'persistent' )
        config.interactive = true;

    return {
        kind,
        config
    };
}

module.exports = {
    normalizeLauncher,
    launcherKind,
    toCenterDescriptor
};
