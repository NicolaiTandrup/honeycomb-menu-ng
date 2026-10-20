const {test} = require('node:test');
const assert = require('node:assert/strict');
const {compileVisibility, VisibilityIndex} = require('../src/core/visibility');
const {allocateHubSlots, MAX_HUB_SLOT} = require('../src/core/hub-allocation');
const {presentationDependencies, presentationSnapshot} = require('../src/core/presentation-dependencies');
const state = (value, attributes = {}) => ({state:value, attributes});
const condition = (entity='device_tracker.vehicle_a', expected='home') => ({condition:'state', entity, state:expected});
const evaluate = (config, states={}) => compileVisibility(config).evaluate({states});
const entry = (id, mode, slot, visible=true) => ({id, mode, slot, visible});

test('state/list/state_not and explicit unknown/unavailable matching', () => {
    assert.equal(evaluate(undefined), true); assert.equal(evaluate([]), true);
    assert.equal(evaluate(condition(), {'device_tracker.vehicle_a':state('home')}), true);
    assert.equal(evaluate(condition(), {'device_tracker.vehicle_a':state('away')}), false);
    for (const value of [undefined,'unknown','unavailable']) {
        const states = value === undefined ? {} : {'device_tracker.vehicle_a':state(value)};
        assert.equal(evaluate(condition(), states), null);
        assert.equal(evaluate({condition:'not',conditions:[condition()]}, states), null);
        assert.equal(evaluate({condition:'state',entity:'device_tracker.vehicle_a',state_not:'home'}, states), null);
    }
    assert.equal(evaluate(condition(undefined,['home','away']), {'device_tracker.vehicle_a':state('away')}), true);
    assert.equal(evaluate(condition(undefined,'unavailable'), {'device_tracker.vehicle_a':state('unavailable')}), true);
    assert.equal(evaluate({condition:'state',entity_id:'sensor.value_a',state_not:['unknown','unavailable']}, {'sensor.value_a':state('unknown')}), false);
});
test('logical operators follow three-valued truth tables, including NOT of child AND', () => {
    for (const a of [true,false,null]) for (const b of [true,false,null]) {
        const states = {};
        if (a !== null) states['binary_sensor.a'] = state(a ? 'on' : 'off');
        if (b !== null) states['binary_sensor.b'] = state(b ? 'on' : 'off');
        const conditions = [condition('binary_sensor.a','on'),condition('binary_sensor.b','on')];
        const expectedAnd = a === false || b === false ? false : a === null || b === null ? null : true;
        const expectedOr = a === true || b === true ? true : a === null || b === null ? null : false;
        assert.equal(evaluate(conditions,states),expectedAnd);
        assert.equal(evaluate({condition:'and',conditions},states),expectedAnd);
        assert.equal(evaluate({condition:'or',conditions},states),expectedOr);
        assert.equal(evaluate({condition:'not',conditions},states),expectedAnd === null ? null : !expectedAnd);
    }
});
test('numeric exclusive bounds, attributes and entity thresholds reject nonnumeric/missing values', () => {
    const c = {condition:'numeric_state',entity:'sensor.value_a',attribute:'watts',above:'input_number.limit_a',below:100};
    const states = {'sensor.value_a':state('on',{watts:50}), 'input_number.limit_a':state('10')};
    assert.equal(evaluate(c,states),true);
    for (const watts of [10,100,101]) {states['sensor.value_a'].attributes.watts=watts; assert.equal(evaluate(c,states),false);}
    for (const watts of ['',null,undefined,true,'unknown','NaN',Infinity]) {states['sensor.value_a'].attributes.watts=watts; assert.equal(evaluate(c,states),null);}
    states['sensor.value_a']=state('unavailable',{watts:50}); assert.equal(evaluate(c,states),null);
    states['sensor.value_a']=state('on',{watts:50}); delete states['input_number.limit_a']; assert.equal(evaluate(c,states),null);
});
test('invalid visibility cannot silently become unconditional visibility', () => {
    for (const value of [null,false,'home',{}, {condition:'xor',conditions:[]}, {condition:'or',conditions:[]},
        {condition:'not'}, {condition:'state',entity:'sensor.a'}, {condition:'state',entity:'sensor.a',state:1},
        {condition:'state',entity:'sensor.a',state:'on',state_not:'off'}, {condition:'state',entity:'[[[ return x ]]]',state:'on'},
        {...condition(),for:30}, {condition:'numeric_state',entity:'sensor.a'}, {condition:'numeric_state',entity:'sensor.a',above:NaN}])
        assert.throws(() => compileVisibility(value),/visibility/);
});
test('dependency index handles in-place attributes, new/removed entities and reconfiguration without stale IDs', () => {
    const entries = [{id:'items[0]',visibility:condition('sensor.value_a','on')},
        {id:'items[1]',visibility:{condition:'numeric_state',entity:'sensor.value_a',attribute:'watts',above:10}},
        {id:'items[2]',visibility:condition('sensor.value_b','on')}];
    const hass = {states:{'sensor.value_a':state('on',{watts:5}), 'sensor.value_b':state('off')}};
    const index = new VisibilityIndex(entries,hass);
    let n=index.metrics.evaluations;
    hass.states['sensor.unrelated']=state('1'); assert.equal(index.update(hass),false); assert.equal(index.metrics.evaluations,n);
    hass.states['sensor.value_a'].attributes.watts=20;
    assert.equal(index.update(hass),true); assert.equal(index.metrics.evaluations,n+1); assert.equal(index.values.get('items[1]'),true);
    n=index.metrics.evaluations; delete hass.states['sensor.value_b']; index.update(hass); assert.equal(index.metrics.evaluations,n+1); assert.equal(index.values.get('items[2]'),null);
    hass.states['sensor.value_b']=state('on'); assert.equal(index.update(hass),true);
    const next=new VisibilityIndex([{id:'items[0]',visibility:condition('sensor.value_c','on')}],hass);
    assert.equal(next.values.get('items[0]'),null); assert.equal(next.dependencies.size,1);
    hass.states['sensor.value_c']=state('on'); assert.equal(next.update(hass),true);
});
test('all items depending on one shared input update once each, independent of entity duplicates', () => {
    const hass={states:{'device_tracker.vehicle_a':state('away')}};
    const index=new VisibilityIndex(Array.from({length:250},(_,i)=>({id:`items[${i}]`,visibility:condition()})),hass);
    assert.equal(index.dependencies.size,1); const before=index.metrics.evaluations;
    hass.states['device_tracker.vehicle_a'].state='home'; index.update(hass);
    assert.equal(index.metrics.evaluations-before,250); assert.equal(index.values.size,250);
});
test('hard hidden reservations, center ownership and duplicate diagnostics never overwrite', () => {
    const result=allocateHubSlots([entry('a','hard',0,false),entry('b','hard',0),entry('c','priority',0),entry('d','soft',0)]);
    assert.equal(result.reservations.get(0),'a'); assert.equal(result.placements.has('a'),false); assert.equal(result.placements.has('b'),false);
    assert.equal(result.placements.get('c'),1); assert.equal(result.placements.get('d'),2);
    assert.deepEqual(result.diagnostics,[{code:'hard-collision',id:'b',slot:0,winner:'a'}]);
    assert.equal(allocateHubSlots([entry('a','soft',0)],{centerReserved:true}).placements.get('a'),1);
});
test('every priority preferred claim precedes fallbacks and ties use configuration order', () => {
    const result=allocateHubSlots([entry('hard','hard',1,false),entry('a','priority',1),entry('b','priority',0),entry('c','priority',0)],{capacity:3});
    assert.equal(result.placements.get('b'),0); assert.equal(result.placements.get('a'),2); assert.equal(result.placements.get('c'),3);
});
test('priority reclaims a preferred slot but unrelated soft identities remain stable', () => {
    const entries=[entry('hard','hard',0),entry('reserved','hard',2,false),entry('p','priority',1,false),entry('a','soft',0),entry('b','soft',0)];
    const first=allocateHubSlots(entries); assert.equal(first.placements.get('a'),1); assert.equal(first.placements.get('b'),3);
    entries[2].visible=true;
    const second=allocateHubSlots(entries,{previous:first.placements});
    assert.equal(second.placements.get('p'),1); assert.equal(second.placements.get('b'),3); assert.equal(second.placements.get('a'),4);
    entries[2].visible=false;
    const third=allocateHubSlots(entries,{previous:second.placements}); assert.equal(third.placements.get('a'),4); assert.equal(third.placements.get('b'),3);
});
test('priority fallback chooses an empty slot before unnecessarily displacing a stable soft item', () => {
    const result=allocateHubSlots([entry('hard','hard',1),entry('p','priority',1),entry('s','soft',0)],{previous:new Map([['s',0]])});
    assert.equal(result.placements.get('s'),0); assert.equal(result.placements.get('p'),2);
});
test('invalid slots and finite physical overflow are diagnosed, without truncating configured identities', () => {
    const entries=Array.from({length:250},(_,i)=>entry(`items[${i}]`,'soft',0));
    const result=allocateHubSlots(entries);
    assert.equal(entries.length,250); assert.equal(result.placements.size,MAX_HUB_SLOT+1); assert.equal(result.diagnostics.length,250-MAX_HUB_SLOT-1);
    assert.ok(result.diagnostics.every(d=>d.code==='overflow'));
    const invalid=allocateHubSlots([entry('a','hard',-1),entry('b','hard',1.5),entry('c','hard',Infinity),entry('d','hard',217)]);
    assert.equal(invalid.placements.size,0); assert.deepEqual(invalid.diagnostics.map(d=>d.code),['invalid-slot','invalid-slot','invalid-slot','overflow']);
});
test('allocation is pure/deterministic over many visibility histories and has no collisions', () => {
    let seed=17; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
    const entries=Array.from({length:50},(_,i)=>entry(`item${i}`,['hard','priority','soft'][i%3],i%15));
    let previous=new Map();
    for (let n=0;n<100;n++) {
        entries.forEach(e=>e.visible=random()%3!==0); const before=JSON.stringify(entries);
        const a=allocateHubSlots(entries,{previous}); const b=allocateHubSlots(entries,{previous});
        assert.deepEqual(a,b); assert.equal(JSON.stringify(entries),before);
        assert.equal(new Set(a.placements.values()).size,a.placements.size);
        for (const [slot,id] of a.reservations) for (const [item,placed] of a.placements) if(item!==id) assert.notEqual(placed,slot);
        previous=a.placements;
    }
});
test('presentation snapshots detect same-object changes; arbitrary JS stays conservative', () => {
    const dependency=presentationDependencies({entity:'light.zone_a',name:'Zone A'}); assert.equal(dependency.wildcard,false);
    const hass={states:{'light.zone_a':state('on',{brightness:10})}};
    const a=presentationSnapshot(hass,dependency); hass.states['light.zone_a'].attributes.brightness=20;
    assert.notEqual(presentationSnapshot(hass,dependency),a);
    for (const value of ['[[[ return states[variables.id].state ]]]','${hass.user.name}','HCJS:return entity.state'])
        assert.equal(presentationDependencies({label:value}).wildcard,true);
});
