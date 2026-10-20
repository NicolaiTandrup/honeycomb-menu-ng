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
        assert.equal(menu.promoted_center.mode,'sonos');
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
    for(const button of radio.buttons)delete button.colors;
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

const station=require('../src/modules/sonos/station');
const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');
const LOGO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
function stationFixture(){
    const hass=fixture();
    hass.states[player].state='playing';hass.states[player].attributes.media_content_id='favorite_a';
    hass.states['sensor.favorites_a']={state:'3',attributes:{items:{favorite_a:'Station A',favorite_b:'Station B',favorite_c:'Station C'}}};
    hass.states['sensor.favorites_cache_a']={state:'3',attributes:{items:['a','b','c'].map(s=>({media_content_id:`favorite_${s}`,thumbnail:LOGO}))}};
    const config=buildCubeConfig({...options,type:'sonos'},hass);
    return {hass,config};
}
test('favorite accents use Light palette, distinct up to twelve and stable across reorder',()=>{
    const ids=Array.from({length:12},(_,i)=>`favorite_${i}`);
    assert.equal(new Set(ids.map(id=>station.accentColor(id,ids))).size,12);
    for(const id of ids){
        assert.ok(station.PALETTE.includes(station.accentColor(id,ids)));
        assert.equal(station.accentColor(id,ids),station.accentColor(id,[...ids].reverse()));
    }
    assert.notEqual(station.accentColor('favorite_a'),station.accentColor('favorite_c'));
});
test('Radio accent templates resolve identity without changing order or actions',()=>{
    const {hass}=stationFixture(), radio=buildRadioMenu(options);
    const color=evaluate(radio.buttons[0].colors.inner_border,hass);
    hass.states['sensor.favorites_a'].attributes.items={favorite_c:'Station C',favorite_a:'Station A',favorite_b:'Station B'};
    assert.equal(evaluate(radio.buttons[1].colors.inner_border,hass),color);
    assert.notEqual(evaluate(radio.buttons[0].colors.inner_border,hass),color);
});
test('recognized favorite inherits logo, ring and playing fill, then neutral paused/stopped fill',()=>{
    const {hass,config}=stationFixture();
    const resolve=()=>station.resolve({hass,config,state:hass.states[player]});
    const color=station.accentColor('favorite_a',Object.keys(hass.states['sensor.favorites_a'].attributes.items));
    assert.equal(resolve().artwork.url,LOGO);assert.equal(resolve().colors.center,color);assert.equal(resolve().colors.inner,color);
    for(const value of ['paused','idle','off']){
        hass.states[player].state=value;
        assert.equal(resolve().forceColors.center,'#202224');assert.equal(resolve().artwork.url,LOGO);
    }
});
test('matching is exact and rejects titles, ambiguous URIs, duplicate IDs and removed favorites',()=>{
    const {hass,config}=stationFixture(), current=hass.states[player];
    current.attributes.media_content_id='https://example.invalid/station-a';current.attributes.media_title='Station A';current.attributes.media_channel='Station A';
    assert.equal(station.recognizedFavorite(hass,config),null,'Names do not identify playback');
    const items=hass.states['sensor.favorites_cache_a'].attributes.items;
    items[0].uri=current.attributes.media_content_id;
    assert.equal(station.recognizedFavorite(hass,config).id,'favorite_a');
    items[1].uri=items[0].uri;assert.equal(station.recognizedFavorite(hass,config),null);
    delete items[1].uri;items.push({...items[0]});assert.equal(station.recognizedFavorite(hass,config),null);
    items.pop();delete hass.states['sensor.favorites_a'].attributes.items.favorite_a;
    assert.equal(station.recognizedFavorite(hass,config),null);
});
for(const thumbnail of ['',null,'javascript:alert(1)','//example.invalid/image.png','broken image.png'])
    test(`invalid/missing thumbnail ${String(thumbnail)} falls back to ordinary Sonos`,()=>{
        const {hass,config}=stationFixture();hass.states['sensor.favorites_cache_a'].attributes.items[0].thumbnail=thumbnail;
        const result=station.resolve({hass,config,state:hass.states[player]});
        assert.equal(result.artwork,null);assert.equal(result.colors.center,'#00bcd4');
    });
test('failed image falls back until its cache key changes; custom image and hidden icon take precedence',()=>{
    const {hass,config}=stationFixture();let result=station.resolve({hass,config,state:hass.states[player]});
    const key=result.artwork.key;
    result=station.resolve({hass,config,state:hass.states[player],runtime:{failedArtworkKey:key}});
    assert.equal(result.artwork,null);assert.equal(result.colors.inner,'#00bcd4');
    hass.states['sensor.favorites_cache_a'].attributes.items[0].thumbnail='/local/station-a.png';
    assert.ok(station.resolve({hass,config,state:hass.states[player],runtime:{failedArtworkKey:key}}).artwork);
    config.styles={card:[{'background-image':'url(/local/custom.png)'}]};
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).artwork,null);
    delete config.styles;config.custom_fields={content:'synthetic custom content'};
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).artwork,null);
    delete config.custom_fields;config.show_icon=false;
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).artwork,null);
});
test('grouped playback uses only reciprocal coordinator identity, never unrelated follower metadata',()=>{
    const {hass,config}=stationFixture();
    hass.states[player].attributes.group_members=[member,player];
    hass.states[member]=state([member,player],'playing');hass.states[member].attributes.media_content_id='favorite_c';
    assert.equal(station.recognizedFavorite(hass,config).id,'favorite_c');
    hass.states[member].state='paused';
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).forceColors.center,'#202224');
    hass.states[member].attributes.group_members=[member];
    assert.equal(station.recognizedFavorite(hass,config),null);
});
test('Sonos snapshots track favorites/cache/group leader but ignore unrelated updates',()=>{
    const {hass,config}=stationFixture(), deps=presentationDependencies(config);
    const before=presentationSnapshot(hass,deps);
    hass.states['sensor.unrelated']={state:'changed'};assert.equal(presentationSnapshot(hass,deps),before);
    hass.states['sensor.favorites_cache_a'].attributes.items[0].thumbnail='/local/changed.png';
    assert.notEqual(presentationSnapshot(hass,deps),before);
});
test('back arrow stays visible and unavailable color beats station context',()=>{
    const {hass,config}=stationFixture();config.icon='mdi:arrow-left';
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).artwork,null);
    hass.states[player].state='unavailable';
    const result=station.resolve({hass,config,state:hass.states[player]});
    assert.deepEqual(result.forceColors,{center:'#555b63',inner:'#555b63',outer:'#555b63'});
});
test('station contrast is local to station fills and respects explicit foreground/center choices',()=>{
    assert.equal(station.stationForeground('hsl(25, 85%, 55%)'),'#14202b');
    assert.equal(station.stationForeground('hsl(230, 85%, 55%)'),'#f6f7f9');
    const {hass,config}=stationFixture();
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).foreground,'#14202b');
    config.colors.center='#112233';
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).foreground,undefined);
});
