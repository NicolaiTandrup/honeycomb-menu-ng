const {test}=require('node:test');
const assert=require('node:assert/strict');
const sleep=require('../src/modules/sonos/sleep');
const updates=require('../src/core/presentation-updates');
const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');
const player='media_player.player_a',member='media_player.player_b',other='media_player.player_c';
const options={player};
function fixture(){
    const calls=[],states={},connection=new EventTarget();
    for(const id of [player,member])states[id]={state:'playing',attributes:{group_members:[player,member]}};
    states[other]={state:'playing',attributes:{group_members:[other]}};
    return {connection,states,services:{sonos:{set_sleep_timer:{},clear_sleep_timer:{}}},callService:async(...args)=>{calls.push(args)},calls};
}
const action=(minutes,playerId=player)=>({sleep:{player:playerId},minutes});
const command=(hass,minutes,playerId=player)=>sleep.command({hass,actionConfig:action(minutes,playerId),notify:()=>{}});
test('native choices call exact supported services, seconds and selected group coordinator; never a helper',async()=>{
    const hass=fixture();
    for(const minutes of [15,30,45,60,90,0]){
        assert.equal(await command(hass,minutes,member),true);
        assert.deepEqual(hass.calls.pop(),['sonos',minutes ? 'set_sleep_timer' : 'clear_sleep_timer',minutes ? {sleep_time:minutes*60} : {},{entity_id:player}]);
    }
    for(const minutes of [-1,10,120,121,Infinity,'15',null])assert.equal(await command(hass,minutes),false);
    assert.equal(sleep.MAX_SECONDS,7200);assert.deepEqual(hass.calls,[]);
});
test('no setup or invented status: initially unknown; unsupported actions fail closed separately',async()=>{
    const hass=fixture();assert.equal(sleep.status(hass,options).label,'Status unknown');
    delete hass.services.sonos.set_sleep_timer;
    assert.equal(await command(hass,15),false);assert.equal(await command(hass,0),true);
    delete hass.services.sonos.clear_sleep_timer;
    assert.equal(await command(hass,0),false);
    assert.equal(sleep.status(hass,options).label,'Sonos unavailable');assert.equal(hass.calls.length,1);
});
test('successful command gives only a local estimate; no expiry service or confirmed OFF state',async()=>{
    const hass=fixture();await command(hass,15);
    const record=sleep.status(hass,options).record;
    assert.equal(sleep.status(hass,options,record.deadline-900000).label,'Est. 15 min');
    assert.equal(sleep.status(hass,options,record.deadline-61000).label,'Est. 2 min');
    const due=sleep.status(hass,options,record.deadline);
    assert.equal(due.label,'Check device');assert.equal(due.refreshAt,null);assert.equal(due.running,false);
    assert.equal(hass.calls.length,1,'A local clock cannot execute expiry');
    await command(hass,0);assert.equal(sleep.status(hass,options).label,'Cancel sent');
});
test('new browser/client cannot infer another client timer; HA disconnect invalidates estimates without touching device',async()=>{
    const hass=fixture();await command(hass,30);
    const otherClient={...hass,connection:new EventTarget()};
    assert.equal(sleep.status(otherClient,options).label,'Status unknown');
    hass.connection.dispatchEvent(new Event('disconnected'));
    assert.equal(sleep.status(hass,options).label,'HA offline');
    hass.connection.dispatchEvent(new Event('ready'));
    assert.equal(sleep.status(hass,options).label,'Status unknown');assert.equal(hass.calls.length,1);
});
test('malformed, unavailable, non-Sonos or conflicting groups never receive set or cancel',async()=>{
    for(const change of ['unavailable','missing','duplicate','conflicting','nonSonos','malformed']){
        const hass=fixture();
        if(change==='unavailable')hass.states[member].state='unavailable';
        if(change==='missing')delete hass.states[player];
        if(change==='duplicate')hass.states[player].attributes.group_members=[player,member,member];
        if(change==='conflicting')hass.states[member].attributes.group_members=[member,player];
        if(change==='nonSonos')hass.entities={[member]:{platform:'cast'}};
        if(change==='malformed')hass.states[player].attributes.group_members='invalid';
        assert.equal(await command(hass,15),false,change);assert.equal(await command(hass,0),false,change);
        assert.deepEqual(hass.calls,[]);assert.equal(sleep.resolve({hass,config:{_sleep:{...options,minutes:0}}}).disabled,true);
    }
});
test('paused group can cancel but cannot set; coordinator and topology are re-evaluated each click',async()=>{
    const hass=fixture();await command(hass,15,member);
    hass.states[player].state='paused';assert.equal(await command(hass,30,member),false);
    assert.equal(await command(hass,0,member),true);
    hass.states[player].attributes.group_members=[player];
    hass.states[member].attributes.group_members=[other,member];hass.states[other].attributes.group_members=[other,member];
    assert.equal(sleep.status(hass,{player:member}).label,'Status unknown');
    await command(hass,45,member);assert.deepEqual(hass.calls.at(-1),['sonos','set_sleep_timer',{sleep_time:2700},{entity_id:other}]);
    await command(hass,0,member);assert.equal(hass.calls.at(-1)[3].entity_id,other);
});
test('group change invalidates estimate and never sends an automatic action; independent coordinators do not cross-talk',async()=>{
    const hass=fixture();await command(hass,15);await command(hass,90,other);
    hass.states[player].attributes.group_members=[player];hass.states[member].attributes.group_members=[member];
    assert.equal(sleep.status(hass,options).label,'Status unknown');assert.equal(hass.calls.length,2);
    await command(hass,0);assert.equal(sleep.status(hass,{player:other}).label,'Est. 90 min');
});
test('pending requests deduplicate across followers, refresh faces without HA writes, and device errors remain uncertain',async()=>{
    const hass=fixture(),before=JSON.stringify(hass.states);let complete,changes=0;
    const unsubscribe=updates.subscribe(hass,()=>changes++);
    hass.callService=()=>new Promise(resolve=>complete=resolve);
    const first=command(hass,15,member);
    assert.equal(sleep.status(hass,options).label,'Sending…');
    assert.equal(sleep.resolve({hass,config:{_sleep:{...options,minutes:0}}}).disabled,true);
    assert.equal(await command(hass,30),false);complete();assert.equal(await first,true);
    assert.equal(changes,2);unsubscribe();
    hass.callService=async()=>{throw Error('synthetic device failure')};const messages=[];
    assert.equal(await sleep.command({hass,actionConfig:action(15),notify:m=>messages.push(m)}),false);
    assert.match(messages[0],/may have received/);assert.equal(sleep.status(hass,options).label,'Check device');
    assert.equal(JSON.stringify(hass.states),before);
});
test('an acknowledgement after HA disconnect or topology change does not restore a misleading estimate',async()=>{
    for(const disconnected of [false,true]){
        const hass=fixture();let complete;hass.callService=()=>new Promise(resolve=>complete=resolve);
        const request=command(hass,15);
        if(disconnected){hass.connection.dispatchEvent(new Event('disconnected'));hass.connection.dispatchEvent(new Event('ready'));}
        else {hass.states[player].attributes.group_members=[player];hass.states[member].attributes.group_members=[member];}
        complete();await request;assert.equal(sleep.status(hass,options).label,'Status unknown');
    }
});
test('Sleep dependency tracking uses group/platform and native service availability; settings have no helper configuration',()=>{
    const hass=fixture(),deps=presentationDependencies({entity:player,mode:'sonos-sleep',_sleep:options});
    const before=presentationSnapshot(hass,deps);hass.states['sensor.other']={state:'changed'};
    assert.equal(presentationSnapshot(hass,deps),before);
    hass.services.sonos={};assert.notEqual(presentationSnapshot(hass,deps),before);
    hass.states[player].attributes.group_members='invalid';assert.doesNotThrow(()=>presentationSnapshot(hass,deps));
    const menu=sleep.buildMenu({entity:player,sleep_timer:{player:member,script:'script.obsolete'}});
    assert.deepEqual(menu.buttons.map(b=>b.slot),[7,8,9,10,11,12]);
    assert.equal(menu.inherit_inner,true);assert.equal(menu.idle_timeout,undefined);
    assert.deepEqual(sleep.settings({entity:player,sleep_timer:{player:member}}),{player});
});

test('leader-only changes permanently invalidate estimates, and fresh immutable HA snapshots govern acknowledgements',async()=>{
    const hass=fixture();await command(hass,15);
    for(const id of [player,member])hass.states[id].attributes.group_members=[member,player];
    assert.equal(sleep.status(hass,options).label,'Status unknown');
    for(const id of [player,member])hass.states[id].attributes.group_members=[player,member];
    assert.equal(sleep.status(hass,options).label,'Status unknown','An observed coordinator change must not revive an old estimate');
    let complete;hass.callService=()=>new Promise(resolve=>complete=resolve);
    const fresh={...hass,states:structuredClone(hass.states)};
    const request=sleep.command({hass,actionConfig:action(15),getHass:()=>fresh,notify:()=>{}});
    fresh.states[player].attributes.group_members=[player];fresh.states[member].attributes.group_members=[member];
    complete();await request;assert.equal(sleep.status(fresh,options).label,'Status unknown');
});
