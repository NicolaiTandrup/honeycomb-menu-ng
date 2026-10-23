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
const options = {entity:player,members:[{entity:member,name:'Room B'}],toggle_member_script:script,favorites_sensor:'sensor.favorites_a'};
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
        assert.equal(menu.buttons[2].tap_action.sonos_item.toggle_member_script,script);
        assert.equal(menu.buttons[3].name,'Sleep');
        assert.equal(menu.buttons[3].tap_action.action,'honeycomb-open-nested');
        assert.deepEqual(menu.buttons[3].tap_action.honeycomb_nested_menu.buttons.map(b=>b.name),['15 min','30 min','45 min','60 min','90 min','Cancel']);
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
test('Sonos siblings inherit default or deliberately configured idle timeout without changing handlers',()=>{
    const sleep=require('../src/modules/sonos/sleep');
    for (const timeout of [undefined,0,2400]) {
        const item={...options,type:'sonos',...(timeout===undefined ? {} : {persistent:{menu:{idle_timeout:timeout}}})};
        const menu=buildCubeConfig(item,fixture()).menu;
        assert.equal(menu.idle_timeout,timeout===undefined ? 8000 : timeout);
        for (const [id,child] of [['radio',buildRadioMenu(options)],['join',buildJoinMenu(options)],['sleep',sleep.buildMenu(options)]]) {
            assert.equal(child.idle_timeout,undefined);
            assert.deepEqual(child._navigation_sibling,{group:`sonos:${player}`,id});
        }
    }
    assert.equal(buildJoinMenu({...options,entity:member,_selected_entity:player})._navigation_sibling.group,`sonos:${player}`);
});
test('Sonos functions inherit ordinary Light cube typography without a forced preset grid',()=>{
    assert.deepEqual(sonosButtonStyles(),{});
    assert.deepEqual(sonosButtonStyles({background:'#34424e'}),{card:[{background:'#34424e'}]});
    const light={entity:'light.zone_a',buttons:[{control:'preset-brightness'}]};
    applyPresetControls(light);
    assert.ok(light.buttons[0].styles.grid,'Light preset layout stays unchanged and distinct from ordinary function cubes');
});
test('native Radio preserves twelve slots, sensor ordering/name/accent and exact playback handlers',()=>{
 const radio=buildRadioMenu(options),hass=fixture();hass.states['sensor.favorites_a']={attributes:{items:{'FV:2/57':'Station Alpha'}}};
 assert.deepEqual(radio.buttons.map(b=>b.slot),Array.from({length:12},(_,i)=>i+7));
 const first=radio.buttons[0];assert.equal(evaluate(first.name,hass),'Station Alpha');
 assert.equal(evaluate(first.tap_action.data.media_content_id,hass),'FV:2/57');
 assert.equal(first.tap_action.perform_action,'media_player.play_media');assert.equal(first.tap_action.data.media_content_type,'favorite_item_id');
 assert.deepEqual(first.tap_action.target,{entity_id:player});assert.equal(first.mode,'sonos-favorite');
 assert.ok(!JSON.stringify(radio).includes('favorites_cache'));
});
test('Join always opens with a useful setup state, including solo/self-only/invalid candidates',()=>{
    for (const members of [undefined,[],[{entity:player}],[null,{entity:'light.zone_a'},{name:'Room B'}]]) {
        const join=buildJoinMenu({entity:player,members});
        assert.equal(join.inherit_inner,true);
        assert.equal(join.idle_timeout,undefined);
        assert.equal(join.buttons.length,1);
        assert.equal(join.buttons[0].name,'No rooms');
        assert.equal(join.buttons[0].interactive,false);
        const menu=buildCubeConfig({type:'sonos',entity:player,members},fixture()).menu;
        assert.equal(menu.buttons[2].tap_action.action,'honeycomb-sonos-open-join');
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
// Pure matcher fixtures inject Browse metadata, never synthetic cache entities.
const nativeProvider=require('../src/modules/sonos/native-favorites').provider;
nativeProvider.peek=(hass)=>({items:hass && hass._browseItems || [],status:'ready',version:1});
const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');
const LOGO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
const {discoverSonos}=require('../src/modules/sonos/discovery');
const {openJoin}=require('../src/modules/sonos/grouping');
test('legacy active_color is a fallback; real-shaped radio channel uniquely bridges FV IDs and stream URIs',()=>{
    const hass=fixture();hass.states[player]={state:'playing',attributes:{media_content_id:'x-sonosapi-hls:stream-a?sid=1',media_channel:'Station A',media_title:'Track A'}};
    hass.states['sensor.favorites_a']={state:'2',attributes:{items:{'FV:2/57':'Station A','FV:2/58':'Station B'}}};
    hass._browseItems=[{media_content_id:'FV:2/57',media_content_type:'favorite_item_id',title:'Station A',thumbnail:LOGO}];
    const config=buildCubeConfig({type:'media',entity:player,active_color:'#00bcd4',favorites_sensor:'sensor.favorites_a'},hass);
    assert.equal(station.recognizedFavorite(hass,config).id,'FV:2/57');
    const result=station.resolve({hass,config,state:hass.states[player]});assert.equal(result.artwork.url,LOGO);assert.notEqual(result.colors.center,'#00bcd4');
    hass.states[player].state='paused';assert.equal(station.resolve({hass,config,state:hass.states[player]}).forceColors.center,'#202224');
    hass.states[player].attributes.media_channel='Station A live';assert.equal(station.recognizedFavorite(hass,config),null);
    hass.states[player].attributes.media_channel='Station A';hass.states['sensor.favorites_a'].attributes.items['FV:2/58']='Station A';
    assert.equal(station.recognizedFavorite(hass,config),null,'Duplicate names are ambiguous');
    delete hass.states['sensor.favorites_a'].attributes.items['FV:2/58'];hass.states[player].attributes.media_content_id='https://example.invalid/track.mp3';
    assert.equal(station.recognizedFavorite(hass,config),null,'Arbitrary HTTP music titles/channels do not qualify');
});
test('discovery uses actual Sonos platform metadata, filters unrelated/hidden entities and fails closed',async()=>{
    const hass={entities:{a:{entity_id:player,platform:'sonos'},b:{entity_id:member,platform:'sonos'},c:{entity_id:'media_player.other',platform:'cast'},d:{entity_id:'media_player.hidden',platform:'sonos',hidden:true}}};
    assert.deepEqual((await discoverSonos(hass)).players,[player,member]);
    let requests=0;const callWS=async request=>{requests++;assert.equal(request.type,'config/entity_registry/list_for_display');return {entities:[{ei:player,pl:'sonos'},{ei:member,pl:'sonos'},{ei:'media_player.other',pl:'cast'}]};};
    assert.deepEqual((await discoverSonos({callWS})).players,[player,member]);assert.equal(requests,1);
    assert.equal((await discoverSonos({callWS:async()=>{throw Error('forbidden')}})).status,'unavailable');
    assert.equal((await discoverSonos({callWS:async()=>({entities:[{}]})})).status,'unavailable');
});
test('Join without members/script discovers native candidates; native join/unjoin uses actual live membership',async()=>{
    const hass=fixture();hass.entities={[player]:{entity_id:player,platform:'sonos'},[member]:{entity_id:member,platform:'sonos'}};
    for(const entity of [player,member])hass.states[entity].attributes.supported_features=524288;
    hass.services.media_player={join:{},unjoin:{}};let menu;
    await openJoin({hass,actionConfig:{sonos_item:{entity:player}},openNested:config=>menu=config});
    const action=menu.buttons[0].tap_action,calls=[];hass.callService=async(...args)=>calls.push(args);
    assert.equal(action.member,member);assert.equal(evaluate(menu.buttons[0].label,hass),'Not joined');
    await toggleMember({hass,actionConfig:action});assert.deepEqual(calls.pop(),['media_player','join',{group_members:[member]},{entity_id:player}]);
    hass.states[player].attributes.group_members=[player,member];hass.states[member].attributes.group_members=[player,member];
    await toggleMember({hass,actionConfig:action});assert.deepEqual(calls.pop(),['media_player','unjoin',{}, {entity_id:member}]);
    hass.states[member].attributes.supported_features=0;assert.equal(memberState(hass,player,member,'',true).label,'Grouping unsupported');
});
test('native follower resolves verified coordinator and stale async discovery cannot reopen a closed menu',async()=>{
    const hass=fixture();const third='media_player.player_c';hass.states[third]=state([third]);
    hass.states[player].attributes.group_members=[member,player];hass.states[member].attributes.group_members=[member,player];
    hass.entities=Object.fromEntries([player,member,third].map(id=>[id,{entity_id:id,platform:'sonos'}]));let menu;
    await openJoin({hass,actionConfig:{sonos_item:{entity:player}},openNested:config=>menu=config});
    assert.equal(menu.buttons[0].tap_action.coordinator,member);assert.equal(menu.buttons[0].entity,third);
    await openJoin({hass,actionConfig:{sonos_item:{entity:player}},isCurrent:()=>false,openNested:()=>assert.fail('Stale menu')});
});
function stationFixture(){
    const hass=fixture();
    hass.states[player].state='playing';hass.states[player].attributes.media_content_id='favorite_a';
    hass.states['sensor.favorites_a']={state:'3',attributes:{items:{favorite_a:'Station A',favorite_b:'Station B',favorite_c:'Station C'}}};
    hass._browseItems=['a','b','c'].map(s=>({media_content_id:`favorite_${s}`,thumbnail:LOGO}));
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
    const items=hass._browseItems;
    items[0].uri=current.attributes.media_content_id;
    assert.equal(station.recognizedFavorite(hass,config),null,'Browse does not supply URI mappings');
    current.attributes.media_content_id='favorite_a';
    items[1].uri=items[0].uri;assert.equal(station.recognizedFavorite(hass,config).id,'favorite_a','Untrusted URI fields do not affect exact favorite identity');
    delete items[1].uri;items.push({...items[0]});assert.equal(station.recognizedFavorite(hass,config),null);
    items.pop();delete hass.states['sensor.favorites_a'].attributes.items.favorite_a;
    assert.equal(station.recognizedFavorite(hass,config),null);
});
for(const thumbnail of ['',null,'javascript:alert(1)','//example.invalid/image.png','broken image.png'])
    test(`invalid/missing thumbnail ${String(thumbnail)} falls back to ordinary Sonos`,()=>{
        const {hass,config}=stationFixture();hass._browseItems[0].thumbnail=thumbnail;
        const result=station.resolve({hass,config,state:hass.states[player]});
        assert.equal(result.artwork,null);assert.equal(result.colors.center,'#00bcd4');
    });
test('failed image falls back until its cache key changes; custom image and hidden icon take precedence',()=>{
    const {hass,config}=stationFixture();let result=station.resolve({hass,config,state:hass.states[player]});
    const key=result.artwork.key;
    result=station.resolve({hass,config,state:hass.states[player],runtime:{failedArtworkKey:key}});
    assert.equal(result.artwork,null);assert.equal(result.colors.inner,'#00bcd4');
    hass._browseItems[0].thumbnail='/local/station-a.png';
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
test('Sonos snapshots track favorites/group leader but ignore unrelated updates',()=>{
    const {hass,config}=stationFixture(), deps=presentationDependencies(config);
    const before=presentationSnapshot(hass,deps);
    hass.states['sensor.unrelated']={state:'changed'};assert.equal(presentationSnapshot(hass,deps),before);
    hass.states['sensor.favorites_a'].attributes.items.favorite_a='Renamed';
    assert.notEqual(presentationSnapshot(hass,deps),before);
});
test('recognized Sonos navigation surface retains artwork and unavailable color beats station context',()=>{
    const {hass,config}=stationFixture();config.icon='mdi:arrow-left';
    assert.equal(station.resolve({hass,config,state:hass.states[player]}).artwork.url,LOGO);
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

test('real-shaped radio fixtures require map and Browse metadata corroboration',()=>{
    const data=require('./fixtures/sonos-radio.json'),{hass,config}=stationFixture();
    hass.states['sensor.favorites_a'].attributes.items=data.favorites;
    hass._browseItems=data.cache;
    for(const [key,id] of [['playing_a','FV:2/57'],['playing_b','FV:2/58']]) {
        hass.states[player].attributes=data[key];
        assert.equal(station.recognizedFavorite(hass,config).id,id);
        assert.equal(station.inspectFavorite(hass,config).diagnostics.match_stage,'radio_station_programme');
    }
    hass.states[player].attributes={...data.playing_a,media_channel:'Station Alpha'};
    assert.equal(station.recognizedFavorite(hass,config).id,'FV:2/57');
    hass._browseItems=JSON.parse(JSON.stringify(data.cache));
    hass._browseItems[0].title='Station Alpha — Region A';
    hass.states[player].attributes.media_channel=' STATION ALPHA — REGION A ';
    assert.equal(station.recognizedFavorite(hass,config),null,'Native labels must corroborate the official map');
    hass.states[player].attributes=data.unverified;
    assert.equal(station.recognizedFavorite(hass,config),null,'Never infer arbitrary broadcast suffixes');
    assert.equal(station.inspectFavorite(hass,config).diagnostics.reason,'channel_or_mapping_missing');
});
test('channel normalization preserves station identity and rejects conflicting map/metadata identities',()=>{
    const {hass,config}=stationFixture(),cache=hass._browseItems;
    hass.states['sensor.favorites_a'].attributes.items={favorite_a:'Státion A',favorite_b:'Station B'};
    cache[0].title='Státion A';cache[0].media_content_type='favorite_item_id';
    cache[1].title='Station B region';cache[1].media_content_type='favorite_item_id';
    hass.states[player].attributes={media_content_id:'x-sonosapi-hls:synthetic',media_channel:'  STA\u0301TION   A '};
    assert.equal(station.recognizedFavorite(hass,config).id,'favorite_a');
    hass.states[player].attributes.media_channel='Station A';
    assert.equal(station.recognizedFavorite(hass,config),null,'Diacritics are not guessed away');
    hass.states[player].attributes.media_channel='Státion A';cache[1].title='Státion A';
    assert.equal(station.inspectFavorite(hass,config).diagnostics.reason,'channel_ambiguous');
});
test('inspectable diagnostics contain reason/counts only, including missing metadata and artwork failures',()=>{
    const {hass,config}=stationFixture();
    let found=station.recognizedFavorite(hass,config),report=station.diagnostics({hass,config});
    assert.equal(report.presentation,'station_playing');assert.equal(report.candidate_count,1);
    report=station.diagnostics({hass,config,runtime:{failedArtworkKey:found.key}});
    assert.equal(report.artwork_load_failed,true);assert.equal(report.presentation,'standard_or_override');
    const serialized=JSON.stringify(report);
    for(const privateValue of [player,config._sonos.favorites,'favorite_a','Station A',LOGO]) assert.ok(!serialized.includes(privateValue));
    hass._browseItems=[];
    assert.equal(station.diagnostics({hass,config}).reason,'browse_metadata_missing');
});

test('FV/stream native metadata matching follows live group state and Browse changes without optimistic memory',()=>{
    const data=require('./fixtures/sonos-radio.json'),{hass,config}=stationFixture();
    hass.states['sensor.favorites_a'].attributes.items=data.favorites;
    hass._browseItems=JSON.parse(JSON.stringify(data.cache));
    hass.states[player].attributes={group_members:[member,player]};
    hass.states[member]={state:'playing',attributes:{...data.playing_a,group_members:[member,player]}};
    const resolve=()=>station.resolve({hass,config,state:hass.states[player]});
    assert.equal(resolve().artwork.url,'/station-a.svg');const color=resolve().colors.inner;
    for(const value of ['paused','idle','off']) {
        hass.states[member].state=value;
        assert.equal(resolve().forceColors.center,'#202224');assert.equal(resolve().colors.inner,color);
    }
    hass.states[member]={state:'playing',attributes:{...data.playing_b,group_members:[member,player]}};
    assert.equal(resolve().artwork.url,'/station-c.svg');assert.notEqual(resolve().colors.inner,color);
    hass.states[member].attributes.media_channel='Station B live';
    assert.equal(resolve().artwork,null,'Do not remember a station after identifiers become unverified');
    hass._browseItems[1].playback_uri=data.playing_b.media_content_id;
    assert.equal(resolve().artwork,null,'Native Browse has no stream mapping; ignore injected URI fields');
    delete hass.states['sensor.favorites_a'].attributes.items['FV:2/58'];
    assert.equal(resolve().artwork,null,'Removed favorites invalidate mappings immediately');
});

test('station/programme parsing is delimiter-bound, corroborated, unique and never fuzzy',()=>{
    const data=require('./fixtures/sonos-radio.json'),{hass,config}=stationFixture();
    hass.states['sensor.favorites_a'].attributes.items=JSON.parse(JSON.stringify(data.favorites));
    hass._browseItems=JSON.parse(JSON.stringify(data.cache));
    const probe=channel=>{hass.states[player].attributes={...data.playing_a,media_channel:channel};return station.inspectFavorite(hass,config)};
    for(const channel of ['Station Alpha · Programme A','  STATION   ALPHA • Programme A • Episode B ']) {
        assert.equal(probe(channel).favorite.id,'FV:2/57');
        assert.equal(probe(channel).diagnostics.match_stage,'radio_station_programme');
    }
    for(const channel of ['Station Alpha Plus · Programme','Station Alpha - Programme','Station Alpha: Programme','Station Alpha·Programme','Programme · Station Alpha','Station Alpha · ','Station Alpha / Programme'])
        assert.equal(probe(channel).favorite,null,channel);
    hass.states['sensor.favorites_a'].attributes.items['FV:2/58']='Station Alpha';
    assert.equal(probe('Station Alpha · Programme').diagnostics.reason,'channel_ambiguous');
    hass.states['sensor.favorites_a'].attributes.items['FV:2/58']='Station Beta';
    hass._browseItems[0].title='Different name';
    assert.equal(probe('Station Alpha · Programme').favorite,null,'Programme parsing requires map/cache corroboration');
    hass._browseItems[0].title='Station Alpha';
    hass.states['sensor.favorites_a'].attributes.items['FV:2/58']='Station Alpha · Programme';
    assert.equal(probe('Station Alpha · Programme').diagnostics.reason,'channel_ambiguous','Full-label vs parsed-station conflict is rejected');
});

test('Join reentry does not stack duplicate views and late stale discovery cannot reopen after Back',async()=>{
    const hass=fixture();let complete,calls=0,opened=0,live=true;
    hass.callWS=()=>{calls++;return new Promise(resolve=>complete=resolve)};
    const scope={},context={hass,actionConfig:{sonos_item:{entity:player}},requestScope:scope,
        isCurrent:()=>live,openNested:()=>opened++};
    const first=openJoin(context);
    assert.equal(await openJoin(context),false);assert.equal(calls,1);
    live=false;complete({entities:[{ei:player,pl:'sonos'}]});assert.equal(await first,false);assert.equal(opened,0);
    assert.equal(await openJoin({...context,menuConfig:{_sonos_join_entity:player}}),false);
});
test('playing artwork moves down with text space; paused and idle artwork stay compact inside gray fill',()=>{
    const {hass,config}=stationFixture();
    hass.states[player].attributes.volume_level=.02;
    let art=station.resolve({hass,config,state:hass.states[player]}).artwork;
    assert.equal(art.style.width,'48%');assert.equal(art.style.height,'37.161%');
    hass.states[player].state='paused';
    art=station.resolve({hass,config,state:hass.states[player]}).artwork;
    assert.equal(art.style.width,'48%');assert.equal(art.style.height,'48%');
    assert.equal(art.style.top,'26%');
    config.label='Custom label';config.show_name=true;config.name='Player A';
    art=station.resolve({hass,config,state:hass.states[player]}).artwork;
    assert.equal(art.style.height,'27.871%','Explicit labels still reserve space');
});

test('all Radio artwork contexts reserve sloped-edge padding and text zones',()=>{
    const {radioArtworkLayout}=require('../src/modules/sonos/artwork');
    for(const primary of [false,true])for(const secondary of [false,true]){
        const style=radioArtworkLayout({primary,secondary});
        assert.equal(style.width,'48%');assert.equal(style.left,'26%');
        assert.equal(style.top,primary || secondary ? '22%' : '26%');
        assert.ok(parseFloat(style.height)<=48);
        if(primary || secondary)assert.ok(parseFloat(style.top)+parseFloat(style.height)<60);
    }
});
