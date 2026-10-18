const { resolveRings, activeSlotPool } = require('./layout.js');

function targetOf(button)
{
    const legacy = button.position !== undefined;
    const slot = legacy ? Number(button.position) : Number(button.slot) - 1;
    return Number.isInteger(slot) && slot >= 0 && slot < 18 ? slot : null;
}

// Preserve template-stack fallbacks and the break/skip sentinels. Visibility
// predicates receive original configuration and must never mutate it.
function resolveButtons(stacks, visible)
{
    const entries = [];
    (stacks || []).forEach(stack => {
        let reservation = null;
        for( const button of (Array.isArray(stack) ? stack : [stack]) )
        {
            if( button === 'break' )
                break;
            if( !button || button === 'skip' || typeof button !== 'object' || Object.keys(button).length === 0 )
                continue;
            if( visible(button) )
            {
                entries.push({ button, visible: true });
                return;
            }
            if( !reservation && button.slot_mode === 'hard' && button.position === undefined && targetOf(button) !== null )
                reservation = { button, visible: false };
        }
        if( reservation )
            entries.push(reservation);
    });
    return entries;
}

function allocateButtons(entries, options = {})
{
    const hard = [], priority = [], soft = [], automatic = [], diagnostics = [];
    for( const entry of entries )
    {
        const { button } = entry;
        const target = targetOf(button);
        if( button.position !== undefined || button.slot !== undefined )
        {
            if( target === null )
                continue;
            if( button.position !== undefined || button.slot_mode === 'hard' )
                hard.push({ ...entry, target });
            else if( button.slot_mode === 'priority' )
                priority.push({ ...entry, target });
            else
                soft.push({ ...entry, target });
        }
        else if( entry.visible )
            automatic.push(entry);
    }

    const rings = resolveRings(entries.length, [...hard, ...priority].map(entry => entry.target));
    const pool = activeSlotPool(rings);
    const buttons = new Array(18), occupied = new Set(), reserved = new Set();
    const place = (entry, target) => {
        occupied.add(target);
        if( entry.visible )
            buttons[target] = entry.button;
        else
            reserved.add(target);
    };
    hard.forEach(entry => {
        if( !occupied.has(entry.target) )
            place(entry, entry.target);
        else
            diagnostics.push(`Hard slot ${entry.target + 1} is already occupied; first declaration wins.`);
    });

    const clockwise = (entry, preferred) => {
        const start = Math.max(0, pool.indexOf(preferred));
        for( let offset = 0; offset < pool.length; offset++ )
        {
            const slot = pool[(start + offset) % pool.length];
            if( !occupied.has(slot) )
            {
                place(entry, slot);
                return;
            }
        }
        diagnostics.push('No free slot available; excess button omitted in configuration order.');
    };

    // First protect every available priority claim, then relocate conflicting
    // claims clockwise. A conflict must not steal a later preferred slot.
    const displaced = [];
    priority.forEach(entry => {
        if( !occupied.has(entry.target) )
            place(entry, entry.target);
        else
        {
            diagnostics.push(`Priority slot ${entry.target + 1} is occupied; moving clockwise.`);
            displaced.push(entry);
        }
    });
    displaced.forEach(entry => clockwise(entry, entry.target));
    soft.forEach(entry => {
        const preferred = pool.includes(entry.target) ? entry.target
            : rings.inner && !rings.outer ? entry.target % 6 : 6 + entry.target % 12;
        clockwise(entry, preferred);
    });
    automatic.forEach(entry => clockwise(entry, pool[0]));

    if( options.empty_slots !== 'hidden' )
        pool.forEach(slot => { if( buttons[slot] === undefined ) buttons[slot] = {}; });
    return { buttons, rings, reserved, diagnostics };
}

module.exports = { resolveButtons, allocateButtons };
