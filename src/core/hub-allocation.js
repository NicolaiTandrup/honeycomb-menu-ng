// Pure physical allocation. The browser currently supports eight rings plus
// center (217 cells); configured identities/dependencies have no population cap.
const MAX_HUB_SLOT = 216;
function allocateHubSlots(entries, {previous = new Map(), centerReserved = false, capacity = MAX_HUB_SLOT} = {}) {
    if (!Number.isSafeInteger(capacity) || capacity < 0) throw new Error('Invalid Hub capacity.');
    const placements = new Map(), reservations = new Map(), diagnostics = [];
    const occupied = new Set(centerReserved ? [0] : []);
    const valid = entries.filter(entry => {
        const {slot, mode, id} = entry;
        if (!['hard','soft','priority'].includes(mode) || !Number.isSafeInteger(slot) || slot < 0) {
            diagnostics.push({code:'invalid-slot', id, slot}); return false;
        }
        if (slot > capacity) {
            diagnostics.push({code:'overflow', id, slot}); return false;
        }
        return true;
    });
    const place = (entry, slot) => { placements.set(entry.id, slot); occupied.add(slot); };
    for (const entry of valid.filter(e => e.mode === 'hard')) {
        if (occupied.has(entry.slot)) {
            diagnostics.push({code:'hard-collision', id:entry.id, slot:entry.slot, winner:reservations.get(entry.slot) || 'branding'});
        } else {
            occupied.add(entry.slot); reservations.set(entry.slot, entry.id);
            if (entry.visible) placements.set(entry.id, entry.slot);
        }
    }
    const priority = valid.filter(e => e.mode === 'priority' && e.visible);
    const soft = valid.filter(e => e.mode === 'soft' && e.visible);
    // All preferred claims precede ANY fallback. Configuration order breaks ties.
    for (const entry of priority) if (!occupied.has(entry.slot)) place(entry, entry.slot);
    const firstFree = avoid => {
        for (let slot = 0; slot <= capacity; slot++) if (!occupied.has(slot) && !(avoid && avoid.has(slot))) return slot;
        return undefined;
    };
    const allocate = (group, lower = []) => {
        for (const entry of group) {
            const slot = previous.get(entry.id);
            if (!placements.has(entry.id) && Number.isSafeInteger(slot) && slot >= 0 && slot <= capacity && !occupied.has(slot)) place(entry, slot);
        }
        const held = new Set(lower.map(e => previous.get(e.id)).filter(slot => slot !== undefined));
        for (const entry of group) if (!placements.has(entry.id)) {
            // Prefer empty holes over displacing unaffected lower-ranked cells.
            let slot = !occupied.has(entry.slot) && !held.has(entry.slot) ? entry.slot : firstFree(held);
            if (slot === undefined) slot = firstFree();
            if (slot === undefined) diagnostics.push({code:'overflow', id:entry.id, slot:entry.slot});
            else place(entry, slot);
        }
    };
    allocate(priority, soft);
    allocate(soft);
    return {placements, reservations, diagnostics};
}
module.exports = {allocateHubSlots, MAX_HUB_SLOT};
