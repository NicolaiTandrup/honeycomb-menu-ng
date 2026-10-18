const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchesVisibility: visible } = require('../src/core/visibility');
const { resolveButtons, allocateButtons } = require('../src/core/slot-allocation');

const hass = { states: {
    'binary_sensor.vehicle_a_present': { state: 'on', attributes: { permitted: true } },
    'sensor.charger_1_power': { state: '1200', attributes: { limit: 16 } },
    'sensor.power_limit': { state: '2000' }
} };
const presence = { condition: 'state', entity: 'binary_sensor.vehicle_a_present', state: 'on' };
const numeric = (extra = {}) => ({ condition: 'numeric_state', entity: 'sensor.charger_1_power', ...extra });

test('HA state, state_not, lists, attributes, legacy syntax and missing states', () => {
    assert.equal(visible([presence], hass), true);
    assert.equal(visible([{ ...presence, state: ['off', 'on'] }], hass), true);
    assert.equal(visible([{ entity: presence.entity, state_not: ['off', 'unknown'] }], hass), true);
    assert.equal(visible([{ ...presence, attribute: 'permitted', state: 'true' }], hass), true);
    assert.equal(visible([{ ...presence, entity: 'binary_sensor.vehicle_b_present' }], hass), false);
    assert.equal(visible([{ ...presence, entity: 'sensor.missing', state: 'unknown' }], hass), true);
    assert.equal(visible([{ condition: 'state', entity_id: presence.entity, state: 'on' }], hass), true);
});

test('numeric_state bounds are exclusive, support attributes and entity thresholds', () => {
    assert.equal(visible([numeric({ above: 0, below: 2000 })], hass), true);
    assert.equal(visible([numeric({ above: 1200 })], hass), false);
    assert.equal(visible([numeric({ below: 1200 })], hass), false);
    assert.equal(visible([numeric({ below: 'sensor.power_limit' })], hass), true);
    assert.equal(visible([numeric({ attribute: 'limit', above: 15 })], hass), true);
    assert.equal(visible([numeric({ below: 'sensor.missing' })], hass), false);
});

test('unknown/unavailable/blank/missing numeric states and invalid bounds fail closed', () => {
    for( const state of ['unknown', 'unavailable', '', ' ', null, undefined, true, 'Infinity', [], [1], {}] )
        assert.equal(visible([numeric({ above: 0 })], { states: { 'sensor.charger_1_power': { state } } }), false);
    assert.equal(visible([numeric({ above: null })], hass), false);
    assert.equal(visible([numeric()], hass), false);
});

test('nested and/or/not use dashboard semantics and validate the entire tree', () => {
    const impossible = { ...presence, state: 'off' };
    assert.equal(visible([{ condition: 'and', conditions: [presence, numeric({ above: 0 })] }], hass), true);
    assert.equal(visible([{ condition: 'or', conditions: [impossible, presence] }], hass), true);
    assert.equal(visible([{ condition: 'not', conditions: [presence, impossible] }], hass), true);
    assert.equal(visible([{ condition: 'not', conditions: [presence] }], hass), false);
    for( const invalid of [null, 'on', {}, { condition: 'template' }, { condition: 'not' }] )
    {
        assert.equal(visible([invalid], hass), false);
        assert.equal(visible([{ condition: 'not', conditions: [invalid] }], hass), false);
        assert.equal(visible([{ condition: 'or', conditions: [presence, invalid] }], hass), false);
    }
    assert.equal(visible(undefined, hass), true);
    assert.equal(visible([], hass), true);
    assert.equal(visible(null, hass), false);
    assert.equal(visible([{ condition: 'state', entity: ' ', state: 'unknown' }], hass), false);
});

test('live state updates do not mutate conditions or require a new hass object', () => {
    const current = { states: { [presence.entity]: { state: 'off' } } };
    const condition = JSON.stringify(presence);
    assert.equal(visible([presence], current), false);
    current.states[presence.entity].state = 'on';
    assert.equal(visible([presence], current), true);
    current.states[presence.entity].state = 'off';
    assert.equal(visible([presence], current), false);
    assert.equal(JSON.stringify(presence), condition);
});

function allocate(buttons, states = hass)
{
    const entries = resolveButtons(buttons, button => button.show !== false && visible(button.visibility, states));
    return allocateButtons(entries, { empty_slots: 'hidden' });
}
const ids = result => Array.from(result.buttons, button => button && button.name);

test('visible priority reclaims a slot from soft; hiding releases it on the next update', () => {
    const buttons = [
        { name: 'Charger 1', slot: 3, slot_mode: 'soft' },
        { name: 'Vehicle A', slot: 3, slot_mode: 'priority', visibility: [presence] }
    ];
    assert.equal(ids(allocate(buttons))[2], 'Vehicle A');
    assert.equal(ids(allocate(buttons))[3], 'Charger 1');
    const hidden = { states: { [presence.entity]: { state: 'off' } } };
    assert.equal(ids(allocate(buttons, hidden))[2], 'Charger 1');
    assert.equal(allocate(buttons, hidden).buttons.filter(Boolean).length, 1);
    assert.equal(ids(allocate(buttons))[2], 'Vehicle A');
});

test('hidden hard slots reserve space while hidden soft and priority consume none', () => {
    const result = allocate([
        { name: 'Charger 1', slot: 1, slot_mode: 'hard', show: false },
        { name: 'Vehicle A', slot: 2, slot_mode: 'soft', show: false },
        { name: 'Vehicle B', slot: 3, slot_mode: 'priority', show: false },
        { name: 'Charger 2' }
    ]);
    assert.equal(result.buttons[0], undefined);
    assert.deepEqual([...result.reserved], [0]);
    assert.equal(result.buttons[1].name, 'Charger 2');
});

test('hard claims beat priority; priority conflicts are deterministic before soft allocation', () => {
    const buttons = [
        { name: 'Reserved', slot: 1, slot_mode: 'hard', show: false },
        { name: 'Charger 1', slot: 1, slot_mode: 'priority' },
        { name: 'Charger 2', slot: 1, slot_mode: 'priority' },
        { name: 'Vehicle A', slot: 2, slot_mode: 'priority' },
        { name: 'Vehicle B', slot: 2, slot_mode: 'soft' }
    ];
    const result = ids(allocate(buttons));
    assert.deepEqual(result.slice(0, 5), [undefined, 'Vehicle A', 'Charger 1', 'Charger 2', 'Vehicle B']);
    assert.deepEqual(ids(allocate(buttons)), result);
});

test('duplicate hard first declaration wins even if hidden; overflow is stable and bounded', () => {
    const entries = [
        { name: 'Reserved', slot: 1, slot_mode: 'hard', show: false },
        { name: 'Duplicate', slot: 1, slot_mode: 'hard' },
        ...Array.from({ length: 22 }, (_, i) => ({ name: `Control ${i}`, slot: 2, slot_mode: 'priority' }))
    ];
    const result = allocate(entries);
    assert.equal(result.buttons[0], undefined);
    assert.equal(result.buttons.filter(Boolean).length, 17);
    assert.equal(result.buttons[17].name, 'Control 16');
    assert.ok(result.diagnostics.length > 0);
});

test('legacy positions, template stacks, break/skip and existing soft wrapping remain compatible', () => {
    const result = allocate([
        [{ name: 'Hidden override', slot: 2, slot_mode: 'hard', show: false }, { name: 'Fallback', slot: 2, slot_mode: 'hard' }],
        ['skip', { name: 'Wrapped', slot: 9 }],
        ['break', { name: 'Ignored' }],
        { name: 'Legacy', position: 5 },
        { name: 'Automatic' }
    ]);
    assert.deepEqual(ids(result).slice(0, 6), ['Automatic', 'Fallback', 'Wrapped', undefined, undefined, 'Legacy']);
    const original = [{ slot: 1, show: '[[[ return entity.state === "on"; ]]]' }];
    resolveButtons(original, () => false);
    assert.equal(typeof original[0].show, 'string');
});

test('priority outer slots are physical; empty placeholders are inert objects', () => {
    const entries = resolveButtons([{ slot: 18, slot_mode: 'priority', name: 'Vehicle A' }], () => true);
    const result = allocateButtons(entries);
    assert.equal(result.rings.outer, true);
    assert.equal(result.buttons[17].name, 'Vehicle A');
    assert.deepEqual(result.buttons[0], {});
});
