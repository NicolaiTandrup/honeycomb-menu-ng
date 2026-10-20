const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {buildCubeConfig} = require('../src/core/cube-config');
const {buildRadioMenu} = require('../src/modules/sonos/favorites');
const {buildJoinMenu, memberState, toggleMember} = require('../src/modules/sonos/grouping');
const {sonosButtonStyles} = require('../src/modules/sonos/presentation');
const {applyPresetControls} = require('../src/modules/light/controls');
const {customActionRegistry} = require('../src/core/action-registry');
const player = 'media_player.player_a', member = 'media_player.player_b', script = 'script.player_a_toggle_member';
const state = (group, value = 'idle') => ({state:value, attributes:{group_members:group}});
const fixture = () => ({states:{[player]:state([player]),[member]:state([member]),[script]:{state:'off',attributes:{}}}, services:{script:{player_a_toggle_member:{}}}, callService:async()=>{}});
const actionConfig = {coordinator:player,member,script};
const options = {entity:player,members:[{entity:member,name:'Room B'}],toggle_member_script:script,favorites_sensor:'sensor.favorites_a',favorites_cache_sensor:'sensor.favorites_cache_a'};
function evaluate(value, hass, entity = member) {
    return new Function('hass','states','entity',value.slice(3,-3))(hass,hass.states,hass.states[entity]);
}

test('Hub Sonos, legacy media and standalone Sonos compile identical slots and handlers',()=>{
    const menus=[{type:'sonos'},{type:'media'},{module:'sonos'}].map(selector=>buildCubeConfig({...options,...selector},fixture()).menu);
    for (const menu of menus) {
        assert.deepEqual(menu.buttons.map(b=>b.slot),[1,2,3,4,5,6]);
        assert.equal(menu.buttons[0].name,'Radio');
        assert.equal(menu.buttons[0].tap_action.action,'honeycomb-open-nested');
        assert.equal(menu.buttons[1].tap_action.perform_action,'media_player.media_play_pause');
        assert.equal(menu.buttons[2].tap_action.honeycomb_nested_menu.buttons[0].tap_action.script,script);
        assert.deepEqual(menu.buttons[3].tap_action,{action:'more-info'});
        assert.equal(menu.buttons[4].tap_action.direction,'down');
        assert.equal(menu.buttons[5].tap_action.direction,'up');
        assert.equal(menu.promoted_center.mode,'media');
        assert.equal(menu.promoted_center.show_volume,'when_playing');
    }
    assert.deepEqual(menus[0],menus[1]);assert.deepEqual(menus[0],menus[2]);
});
test('volume script overrides move with their cubes; explicit generic media slots stay unchanged',()=>{
    const menu=buildCubeConfig({...options,type:'sonos',group_volume_down_script:'script.volume_down_a',group_volume_up_script:'script.volume_up_a'},fixture()).menu;
    assert.equal(menu.buttons[4].tap_action.perform_action,'script.volume_down_a');
    assert.equal(menu.buttons[5].tap_action.perform_action,'script.volume_up_a');
    const generic=buildCubeConfig({type:'media',module:'media',entity:player},fixture()).menu;
    assert.deepEqual(generic.buttons.map(b=>b.slot),[1,2,4,6]);
    assert.equal(generic.buttons[0].tap_action.direction,'down');
    assert.equal(generic.buttons[2].tap_action.direction,'up');
});
test('Sonos typography and grid match actual Light preset styles locally',()=>{
    const light={entity:'light.zone_a',buttons:[{control:'preset-brightness'}]};
    applyPresetControls(light);
    assert.deepEqual(sonosButtonStyles(),light.buttons[0].styles);
});
test('Radio descriptor golden preserves all twelve slots, order, artwork/cache and playback',()=>{
    const radio=buildRadioMenu(options);
    assert.equal(crypto.createHash('sha256').update(JSON.stringify(radio)).digest('hex'),'f3228985cc370b69681e4fc1688d7631ce59726cbf3aab67b7f6a46e91958a07');
    assert.deepEqual(radio.buttons.map(b=>b.slot),Array.from({length:12},(_,i)=>i+7));
});
test('Join always opens with a useful setup state, including solo/self-only/invalid candidates',()=>{
    for (const members of [undefined,[],[{entity:player}],[null,{entity:'light.zone_a'},{name:'Room B'}]]) {
        const join=buildJoinMenu({entity:player,members});
        assert.equal(join.inherit_inner,true);
        assert.equal(join.idle_timeout,0);
        assert.equal(join.buttons.length,1);
        assert.equal(join.buttons[0].name,'No rooms');
        assert.equal(join.buttons[0].interactive,false);
        const menu=buildCubeConfig({type:'sonos',entity:player,members},fixture()).menu;
        assert.equal(menu.buttons[2].tap_action.action,'honeycomb-open-nested');
    }
});
test('candidate order is stable, selected player and duplicates excluded, twelve physical choices retained',()=>{
    const members=[{entity:player},{entity:member,name:'Room B'},{entity:member},...Array.from({length:15},(_,i)=>({entity:`media_player.room_${i}`}))];
    const join=buildJoinMenu({...options,members});
    assert.equal(join.buttons.length,12);
    assert.deepEqual(join.buttons.map(b=>b.slot),Array.from({length:12},(_,i)=>i+7));
    assert.equal(join.buttons[0].name,'Room B');
    assert.equal(join.buttons[1].entity,'media_player.room_0');
    assert.ok(join.buttons.every(b=>b.autoclose===false));
});
test('unnamed candidates use live friendly names with a literal ID fallback',()=>{
    const hass=fixture(), button=buildJoinMenu({...options,members:[{entity:member}]}).buttons[0];
    assert.equal(evaluate(button.name,hass),member);
    hass.states[member].attributes.friendly_name='Room B';
    assert.equal(evaluate(button.name,hass),'Room B');
});
test('membership labels and colors follow actual HA state, including in-place updates',()=>{
    const hass=fixture(), button=buildJoinMenu(options).buttons[0];
    assert.equal(evaluate(button.label,hass),'Not joined');
    const background=button.styles.card[0].background;
    const solo=evaluate(background,hass);
    hass.states[player].attributes.group_members=[player,member];
    hass.states[member].attributes.group_members=[player,member];
    assert.equal(evaluate(button.label,hass),'Joined');
    assert.notEqual(evaluate(background,hass),solo);
    hass.states[player].attributes.group_members=[player];
    assert.equal(evaluate(button.label,hass),'Updating group');
    hass.states[member].attributes.group_members=[member];
    assert.equal(evaluate(button.label,hass),'Not joined');
});
test('inner Join summary distinguishes solo, grouped, unknown and unavailable state',()=>{
    const hass=fixture();
    const label=buildCubeConfig({...options,type:'sonos'},hass).menu.buttons[2].label;
    assert.equal(evaluate(label,hass,player),'Solo');
    hass.states[player].attributes.group_members=[player,member,member];
    assert.equal(evaluate(label,hass,player),'1 joined');
    delete hass.states[player].attributes.group_members;
    assert.equal(evaluate(label,hass,player),'Group unknown');
    hass.states[player].state='unavailable';
    assert.equal(evaluate(label,hass,player),'Unavailable');
});
for (const [name,mutate,label] of [
    ['missing candidate',h=>delete h.states[member],'Unavailable'],
    ['unavailable candidate',h=>h.states[member].state='unavailable','Unavailable'],
    ['unavailable selected player',h=>h.states[player].state='unavailable','Player unavailable'],
    ['unknown selected membership',h=>delete h.states[player].attributes.group_members,'Group unknown'],
    ['unknown candidate membership',h=>delete h.states[member].attributes.group_members,'Group unknown'],
    ['selected follower',h=>h.states[player].attributes.group_members=['media_player.player_c',player],'Use group leader'],
    ['candidate grouped elsewhere',h=>h.states[member].attributes.group_members=['media_player.player_c',member],'Other group'],
    ['missing script entity',h=>delete h.states[script],'Script unavailable'],
    ['unavailable script entity',h=>h.states[script].state='unavailable','Script unavailable'],
    ['missing script service',h=>delete h.services.script.player_a_toggle_member,'Script unavailable'],
    ['unknown service registry',h=>delete h.services,'Script unavailable']
]) test(`${name} is read-only with explicit status`,async()=>{
    const hass=fixture();mutate(hass);let calls=0;hass.callService=async()=>calls++;
    assert.equal(memberState(hass,player,member,script).label,label);
    const messages=[];
    assert.equal(await toggleMember({hass,actionConfig,notify:m=>messages.push(m)}),false);
    assert.equal(calls,0);assert.equal(messages.length,1);
});
test('missing/unsupported script configuration is explicit and never calls a guessed service',async()=>{
    for (const script of ['',null,'media_player.join','script.turn_on.extra']) {
        const hass=fixture();hass.callService=()=>assert.fail('No service expected');
        assert.equal(memberState(hass,player,member,script).label,'Configure script');
        assert.equal(await toggleMember({hass,actionConfig:{...actionConfig,script},notify:()=>{}}),false);
    }
});
test('successful join/unjoin preserves the configured member script contract and waits for HA',async()=>{
    const hass=fixture(), calls=[];
    hass.callService=async(...args)=>calls.push(args);
    for (const joined of [false,true]) {
        hass.states[player].attributes.group_members=joined?[player,member]:[player];
        const snapshot=JSON.stringify(hass.states);
        assert.equal(await toggleMember({hass,actionConfig}),true);
        assert.equal(JSON.stringify(hass.states),snapshot,'No optimistic membership mutation');
    }
    assert.deepEqual(calls,[['script','player_a_toggle_member',{member},{}],['script','player_a_toggle_member',{member},{}]]);
    assert.ok(customActionRegistry.has('honeycomb-sonos-toggle-member'));
});
test('failed script requests produce feedback, preserve HA membership and permit retry',async()=>{
    const hass=fixture(), messages=[];
    hass.callService=async()=>{throw new Error('synthetic script failure')};
    assert.equal(await toggleMember({hass,actionConfig,notify:m=>messages.push(m)}),false);
    assert.equal(memberState(hass,player,member,script).label,'Not joined');
    assert.match(messages[0],/Could not update Sonos group/);
    hass.callService=async()=>{};
    assert.equal(await toggleMember({hass,actionConfig}),true);
});
test('repeat pending taps are suppressed across HA snapshots and rechecked after settlement',async()=>{
    const hass=fixture();hass.connection={};let resolve,calls=0;
    hass.callService=()=>{calls++;return new Promise(r=>resolve=r)};
    const first=toggleMember({hass,actionConfig});
    assert.equal(await toggleMember({hass:{...hass},actionConfig}),false);
    assert.equal(calls,1);resolve();assert.equal(await first,true);
    hass.states[member].state='unavailable';
    assert.equal(await toggleMember({hass,actionConfig,notify:()=>{}}),false);
    assert.equal(calls,1);
});
