/*
 * Honeycomb Menu NG navigation core.
 *
 * Invariant:
 * - The persistent Hub base may establish a new module anchor.
 * - A promoted child establishes its own selected-cell anchor.
 * - In-place palettes/siblings retain the current anchor; Back restores the saved one.
 * - Returning to the Hub base clears the lock.
 */

const HUB_ROOT_FLAG = '_persistent_hub_root';

function finiteNumber(value)
{
    if (value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function readAnchor(config)
{
    if( ! config || typeof config !== 'object' )
        return null;

    const x = finiteNumber(config.anchor_x);
    const y = finiteNumber(config.anchor_y);

    return x === null || y === null ? null : { x, y };
}

function applyAnchor(config, anchor)
{
    if( ! config || ! anchor )
        return config;

    config.anchor_x = anchor.x;
    config.anchor_y = anchor.y;
    return config;
}

function isHubRoot(config)
{
    return !!(config && config[HUB_ROOT_FLAG] === true);
}

// Internal descriptors opt direct siblings into replacement. Unmarked child
// menus (including recursive palettes) always retain their meaningful depth.
function areSiblings(current, incoming)
{
    const from = current && current._navigation_sibling;
    const to = incoming && incoming._navigation_sibling;
    return !!(from && to && typeof from.group === 'string' && from.group &&
        from.group === to.group && typeof from.id === 'string' && from.id &&
        typeof to.id === 'string' && to.id);
}

function createMenuContext(options = {})
{
    const local = options.local === true;

    return {
        honeycomb: null,
        stack: [],
        currentConfig: null,
        pointers: new Set(),
        pendingActions: new Set(),
        local,
        moduleAnchor: null,
        navigation: {
            phase: local ? 'base' : 'global',
            depth: 0
        }
    };
}

function enterNested(context, currentConfig, incomingConfig)
{
    if( ! context || context.local !== true )
        return { fromBase: false, anchor: null };

    const fromBase = isHubRoot(currentConfig);

    if( fromBase )
    {
        const selectedAnchor = readAnchor(incomingConfig);

        if( selectedAnchor )
        {
            context.moduleAnchor = selectedAnchor;
            applyAnchor(incomingConfig, selectedAnchor);
        }

        context.navigation = {
            phase: 'module',
            depth: 1
        };

        return {
            fromBase: true,
            anchor: context.moduleAnchor
        };
    }

    if (incomingConfig.promote_to_center === true && readAnchor(incomingConfig))
        context.moduleAnchor=readAnchor(incomingConfig);
    if( context.moduleAnchor )
        applyAnchor(incomingConfig, context.moduleAnchor);

    if (areSiblings(currentConfig, incomingConfig))
        return { fromBase: false, anchor: context.moduleAnchor };

    const currentDepth =
        context.navigation && Number.isFinite(Number(context.navigation.depth))
            ? Number(context.navigation.depth)
            : 1;

    context.navigation = {
        phase: 'nested',
        depth: Math.max(2, currentDepth + 1)
    };

    return {
        fromBase: false,
        anchor: context.moduleAnchor
    };
}

function prepareBack(context, previousConfig)
{
    if( ! context || context.local !== true )
        return previousConfig;

    if( isHubRoot(previousConfig) )
    {
        context.moduleAnchor = null;
        context.navigation = {
            phase: 'base',
            depth: 0
        };
        return previousConfig;
    }

    // Stack entries are snapshots of each real level, not the newest anchor.
    context.moduleAnchor=readAnchor(previousConfig) || context.moduleAnchor;

    const currentDepth =
        context.navigation && Number.isFinite(Number(context.navigation.depth))
            ? Number(context.navigation.depth)
            : 2;
    const nextDepth = Math.max(1, currentDepth - 1);

    context.navigation = {
        phase: nextDepth <= 1 ? 'module' : 'nested',
        depth: nextDepth
    };

    return previousConfig;
}

function resetNavigation(context)
{
    if( ! context )
        return;

    context.moduleAnchor = null;

    if( context.local === true )
    {
        context.navigation = {
            phase: 'base',
            depth: 0
        };
    }
}

function canEstablishAnchor()
{
    return true; // Promotion may select a cell at any meaningful depth.
}

module.exports = {
    HUB_ROOT_FLAG,
    createMenuContext,
    isHubRoot,
    areSiblings,
    readAnchor,
    applyAnchor,
    enterNested,
    prepareBack,
    resetNavigation,
    canEstablishAnchor
};
