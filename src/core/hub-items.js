const { resolveButtons, allocateButtons } = require('./slot-allocation.js');

function hubSlots(count, logo)
{
    const classic = logo
        ? {1:[2],2:[2,3],3:[2,4,6],4:[2,3,1,4],5:[1,2,3,4,5],6:[1,2,3,4,5,6]}
        : {1:[0],2:[2,3],3:[2,3,0],4:[1,2,0,3],5:[1,2,0,3,4],6:[1,2,3,4,5,6],7:[0,1,2,3,4,5,6]};
    return classic[count] || Array.from({length:count}, (_, i) => i);
}

// Hub center is the only extension to #68's physical ring allocator. All ring
// conflicts, reservations, displacement and overflow stay in that allocator.
function allocateHubItems(items, visible, options = {})
{
    const diagnostics = [];
    const valid = items.filter(button => {
        const raw = button.slot;
        const slot = Number(raw);
        const accepted = ['number','string'].includes(typeof raw) &&
            !(typeof raw === 'string' && !raw.trim()) && Number.isInteger(slot) && slot >= 0 && slot <= 18;
        if (!accepted) diagnostics.push('Hub slot must be 0–18; invalid or excess item omitted.');
        return accepted;
    });
    const entries = resolveButtons(valid, visible);
    // resolveButtons deliberately only accepts ring hard targets. Center hard
    // reservations must also survive hidden state.
    const candidates = valid.filter(button => Number(button.slot) === 0)
        .map(button => ({button, visible:visible(button)}))
        .filter(entry => entry.visible || entry.button.slot_mode === 'hard');
    const hard = candidates.filter(entry => entry.button.slot_mode === 'hard');
    const priorities = candidates.filter(entry => entry.button.slot_mode === 'priority');
    const soft = candidates.filter(entry => !['hard','priority'].includes(entry.button.slot_mode));
    const centerClaim = options.logo ? null : hard[0] || priorities[0] || soft[0];
    const center = centerClaim && centerClaim.visible ? centerClaim.button : null;
    const ring = entries.filter(entry => Number(entry.button.slot) !== 0);
    for (const entry of candidates) {
        if (entry === centerClaim || entry.button === (centerClaim && centerClaim.button)) continue;
        if (entry.button.slot_mode === 'hard') {
            diagnostics.push('Hub center is reserved; first hard declaration or logo wins.');
        } else if (entry.visible) {
            ring.push({...entry, button:{...entry.button, slot:1}});
        }
    }
    const allocated = allocateButtons(ring, {empty_slots:'hidden'});
    return {...allocated, center, diagnostics:[...diagnostics, ...allocated.diagnostics]};
}

module.exports = { hubSlots, allocateHubItems };
