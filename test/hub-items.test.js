const {test} = require('node:test');
const assert = require('node:assert/strict');
const {allocateHubItems, hubSlots} = require('../src/core/hub-items');
const {matchesVisibility} = require('../src/core/visibility');
const {hiddenOwnerIndex} = require('../src/core/navigation-context');
const {menuCubeWidth, contentMetrics, cubeWidth} = require('../src/core/cube-metrics');
const {moduleRegistry} = require('../src/modules');
const item = (name, slot, mode, extra = {}) => ({name, slot, slot_mode:mode, ...extra});
const shown = button => button.show !== false;

test('Hub retains legacy configured-count layouts and supports nineteen cells without truncation', () => {
    assert.deepEqual(hubSlots(1,false), [0]);
    assert.deepEqual(hubSlots(3,false), [2,3,0]);
    assert.deepEqual(hubSlots(3,true), [2,4,6]);
    const items = hubSlots(19,false).map((slot,i) => item('Item '+i,slot,'hard'));
    const allocated = allocateHubItems(items,shown);
    assert.equal(allocated.center.name,'Item 0');
    assert.equal(allocated.buttons.filter(Boolean).length,18);
    assert.equal(allocated.diagnostics.length,0);
});

test('Hub hard reservations beat priority, priority beats soft, visibility releases claims live', () => {
    const items = [item('Charger 1',1,'soft'), item('Vehicle A',1,'priority', {show:false}),
        item('Reserved',2,'hard', {show:false})];
    const allocate = () => allocateHubItems(items, shown);
    assert.equal(allocate().buttons[0].name,'Charger 1');
    assert.equal(allocate().buttons[1],undefined);
    items[1].show = true;
    assert.equal(allocate().buttons[0].name,'Vehicle A');
    assert.equal(allocate().buttons[2].name,'Charger 1');
    items[1].show = false;
    assert.equal(allocate().buttons[0].name,'Charger 1');
    assert.ok(allocate().reserved.has(1));
});

test('Hub center uses deterministic hard/priority/soft conflicts and hidden hard reservation', () => {
    const items = [item('Soft',0,'soft'), item('Priority',0,'priority'), item('Hard',0,'hard',{show:false})];
    let allocated = allocateHubItems(items,shown);
    assert.equal(allocated.center,null);
    assert.equal(allocated.buttons[0].name,'Priority');
    assert.equal(allocated.buttons[1].name,'Soft');
    items[2].show = true;
    assert.equal(allocateHubItems(items,shown).center.name,'Hard');
    allocated = allocateHubItems(items.slice(0,2),shown);
    assert.equal(allocated.center.name,'Priority');
    assert.equal(allocated.buttons[0].name,'Soft');
    assert.ok(allocateHubItems([item('A',0,'hard'),item('B',0,'hard')],shown).diagnostics.length);
});

test('Hub shares HA conditions, does not equate availability with visibility, and does not mutate source', () => {
    const hass = {states:{'sensor.vehicle_a_battery':{state:'unavailable'}, 'binary_sensor.vehicle_a_present':{state:'off'}}};
    const items = [item('Vehicle A',1,'priority',{visibility:[{entity:'binary_sensor.vehicle_a_present',state:'on'}]}),
        item('Charger 1',2,'hard',{entity:'sensor.vehicle_a_battery'})];
    const original = JSON.stringify(items);
    const allocate = () => allocateHubItems(items,b => matchesVisibility(b.visibility,hass));
    assert.equal(allocate().buttons.filter(Boolean).length,1);
    hass.states['binary_sensor.vehicle_a_present'].state = 'on';
    assert.equal(allocate().buttons.filter(Boolean).length,2);
    assert.equal(JSON.stringify(items),original);
    assert.equal(allocateHubItems([],shown).buttons.filter(Boolean).length,0);
});

test('Hub overflow and ring collisions retain the #68 deterministic contract', () => {
    const items = Array.from({length:20}, (_,i) => item('Item '+i,1,'soft'));
    const allocated = allocateHubItems(items,shown);
    assert.equal(allocated.buttons.filter(Boolean).length,18);
    assert.equal(allocated.diagnostics.length,2);
    assert.deepEqual(allocateHubItems(items,shown),allocated);
    const hard = allocateHubItems([item('A',1,'hard'),item('B',1,'hard')],shown);
    assert.equal(hard.buttons[0].name,'A');
    assert.equal(hard.buttons.filter(Boolean).length,1);
});

test('nested hidden owners unwind to the closest valid parent including all descendants', () => {
    const context = {stack:[{owner:{show:true}}, {owner:{show:false}}, {owner:{show:true}}]};
    assert.equal(hiddenOwnerIndex(context,shown),1);
    context.stack[0].owner.show = false;
    assert.equal(hiddenOwnerIndex(context,shown),0);
    assert.equal(hiddenOwnerIndex({stack:[{config:{}}]},shown),-1);
});

test('physical cube sizing has one conversion boundary and shared icon/text proportions', () => {
    assert.equal(menuCubeWidth({size:82*3.586}),82);
    assert.equal(menuCubeWidth({size:225,cube_size:82}),82);
    assert.equal(menuCubeWidth({size:225}),225/3.586);
    assert.equal(cubeWidth(Infinity),72);
    assert.equal(cubeWidth(-1),72);
    const a = contentMetrics(82), b = contentMetrics(164);
    for (const key of Object.keys(a)) assert.equal(b[key],a[key]*2);
});

test('generic Hub cubes preserve advanced card/actions; native launchers accept common overrides', () => {
    const generic = moduleRegistry.get('generic');
    const custom = {type:'vehicle',name:'Vehicle A',styles:{name:[{color:'#fff'}]},
        custom_fields:{status:'Ready'}, double_tap_action:{action:'more-info'}, colors:{center:'#123456'}};
    const launcher = generic.buildLauncher({item:custom,index:0,slot:1});
    assert.equal(launcher.type,undefined);
    assert.deepEqual(launcher.custom_fields,custom.custom_fields);
    assert.deepEqual(launcher.double_tap_action,custom.double_tap_action);
    const action = {action:'none'};
    const light = moduleRegistry.get('light').buildLauncher({item:{type:'light',entity:'light.test',
        colors:{outer_border:'#34383d',inner_border:'#00ff00'}, tap_action:action},index:0,slot:1});
    assert.deepEqual(light.tap_action,action);
    assert.equal(light.colors.inner_border,'#00ff00');
});


test('Hub diagnoses malformed/excess slots instead of coercing them to center', () => {
    const malformed = [null, '', ' ', false, [], {}, -1, 19, Infinity];
    const allocated = allocateHubItems(malformed.map(slot => item('Invalid',slot,'hard')),shown);
    assert.equal(allocated.center,null);
    assert.equal(allocated.buttons.filter(Boolean).length,0);
    assert.equal(allocated.diagnostics.length,malformed.length);
});
