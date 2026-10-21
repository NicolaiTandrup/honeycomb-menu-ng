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
// classic honeycomb-menu-ng-item cubes.
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

function ringForSlot(slot)
{
    let ring = Math.max(1,Math.ceil((Math.sqrt(1+4*(Number(slot)+1)/3)-1)/2));
    return ring;
}
function ringCapacity(radius) { return 3*radius*(radius+1); }
function sceneCenter(radius) { return {x:radius,y:radius*.865}; }
function extendedPosition(slot, radius)
{
    const ring=ringForSlot(slot), start=3*(ring-1)*ring;
    let offset=slot-start, q=-ring, r=0;
    const directions=[[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
    for (const [dq,dr] of directions) {
        const steps=Math.min(offset,ring); q+=dq*steps; r+=dr*steps; offset-=steps;
        if (!offset) break;
    }
    return {x:radius+q+r/2,y:radius*.865+r*.865};
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

    const maximum=Math.max(total-1,...hardTargets,0);
    const radius=Math.max(outer?2:1,ringForSlot(maximum));
    return { inner, outer, radius };
}

function activeSlotPool(rings)
{
    if ((rings || {}).radius > 2) return Array.from({length:ringCapacity(rings.radius)},(_,i)=>i);
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

    if( ! Number.isSafeInteger(index) || index < 0 )
        return null;

    const radius=options.radius || (hasOuter?2:1);
    if (index >= 18) return extendedPosition(index,radius);
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

    const shift=radius-1;
    return {x:position.x+shift,y:position.y+shift*.865};
}

module.exports = {
    ringForSlot, ringCapacity, sceneCenter, extendedPosition,
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
