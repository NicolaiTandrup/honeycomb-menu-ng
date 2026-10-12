/*
 * Physical Honeycomb layout.
 *
 * Slot indexes are zero-based internally:
 *   center = 0 conceptually, ring buttons are indexes 0..17.
 *
 * Modules never own coordinates. They only request slots/layout envelopes.
 * This keeps a module free to grow from the classic 7-cube layout
 * (center + 6) to larger ring layouts without changing the physical center.
 */

const INNER_RING = Object.freeze([
    { x: 0,   y: 0.865 },
    { x: 0.5, y: 0 },
    { x: 1.5, y: 0 },
    { x: 2,   y: 0.865 },
    { x: 1.5, y: 1.725 },
    { x: 0.5, y: 1.725 }
]);

const OUTER_RING = Object.freeze([
    { x: -1,   y: 0.865 },
    { x: -0.5, y: 0 },
    { x: 0,    y: -0.865 },
    { x: 1,    y: -0.865 },
    { x: 2,    y: -0.865 },
    { x: 2.5,  y: 0 },
    { x: 3,    y: 0.865 },
    { x: 2.5,  y: 1.725 },
    { x: 2,    y: 2.59 },
    { x: 1,    y: 2.59 },
    { x: 0,    y: 2.59 },
    { x: -0.5, y: 1.725 }
]);

const INNER_POOL = Object.freeze([0, 1, 2, 3, 4, 5]);
const OUTER_POOL = Object.freeze([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);

// Persistent controls historically draw their outer face slightly inside the
// physical layout cell. That is useful for promoted/detail centers, but the
// persistent Hub base consists entirely of persistent controls and therefore
// gets a visibly larger gap between neighbouring cubes.
//
// "cell" uses the full pointy-hex cell. With the normal Honeycomb center
// offsets, neighbouring base cubes then meet with the same visual spacing as
// classic honeycomb-menu-item cubes.
const PERSISTENT_HEX_POINTS = Object.freeze({
    inset: '50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675',
    cell: '50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675'
});

function persistentHexPoints(mode = 'inset')
{
    return mode === 'cell'
        ? PERSISTENT_HEX_POINTS.cell
        : PERSISTENT_HEX_POINTS.inset;
}

function resolveRings(buttonCount, hardTargets = [])
{
    const total = Math.max(0, Number(buttonCount) || 0);

    let inner = total <= 6;
    let outer = total >= 7 && total <= 12;

    if( total >= 13 )
    {
        inner = true;
        outer = true;
    }

    if( total === 0 )
    {
        inner = true;
        outer = false;
    }

    hardTargets.forEach(target => {
        if( Number(target) < 6 )
            inner = true;
        else
            outer = true;
    });

    return { inner, outer };
}

function activeSlotPool(rings)
{
    const inner = !!(rings && rings.inner);
    const outer = !!(rings && rings.outer);

    if( inner && outer )
        return [...INNER_POOL, ...OUTER_POOL];

    if( outer )
        return [...OUTER_POOL];

    return [...INNER_POOL];
}

function centerPosition(hasOuter)
{
    return hasOuter
        ? { x: 2, y: 1.73 }
        : { x: 1, y: 0.865 };
}

function buttonPosition(slot, options = {})
{
    const index = Number(slot);
    const hasInner = options.inner !== false;
    const hasOuter = options.outer === true;

    if( ! Number.isInteger(index) || index < 0 || index >= 18 )
        return null;

    let position;

    if( index < 6 )
    {
        if( ! hasInner )
            return null;

        position = INNER_RING[index];
    }
    else
    {
        if( ! hasOuter )
            return null;

        position = OUTER_RING[index - 6];
    }

    if( ! position )
        return null;

    return hasOuter
        ? { x: position.x + 1, y: position.y + 0.865 }
        : { x: position.x, y: position.y };
}

module.exports = {
    INNER_RING,
    OUTER_RING,
    INNER_POOL,
    OUTER_POOL,
    resolveRings,
    activeSlotPool,
    centerPosition,
    buttonPosition,
    PERSISTENT_HEX_POINTS,
    persistentHexPoints
};
