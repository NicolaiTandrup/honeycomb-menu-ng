const {test}=require('node:test');
const assert=require('node:assert/strict');
const sleep=require('../src/modules/sonos/sleep');
const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');
const player='media_player.player_a',member='media_player.player_b';
const options={player,state:'input_text.sonos_sleep_a',deadline:'input_datetime.sonos_sleep_deadline_a',script:'script.sonos_sleep_a'};
function fixture(){
    const calls=[],record={v:1,p:player,s:'off'},states={};
    for(const id of [player,member])states[id]={state:'playing',attributes:{group_members:[player,member],supported_features:1}};
    states[options.state]={state:'hc1:'+JSON.stringify(record),attributes:{}};
    states[options.deadline]={state:'2027-01-15 12:00:00',attributes:{timestamp:1800000000,has_date:true,has_time:true}};
    states[options.script]={state:'off',attributes:{}};
    return {states,services:{script:{sonos_sleep_a:{}}},callService:async(...args)=>{calls.push(args)},calls};
}
function set(hass,record){hass.states[options.state].state='hc1:'+JSON.stringify({v:1,p:player,...record})}
test('missing, invalid and mismatched setup never arms a browser timer or calls a service',async()=>{
    for(const value of [null,'invalid','hc1:{}','hc1:'+JSON.stringify({v:1,p:member,s:'running'}),'hc1:'+JSON.stringify({v:1,p:player,s:'running',e:'invalid'})]){
        const hass=fixture();hass.states[options.state].state=value;
        assert.equal(sleep.status(hass,options).ready,false);
        assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:15},notify:()=>{}}),false);
        assert.deepEqual(hass.calls,[]);
    }
    assert.equal(sleep.status(fixture(),{player}).label,'Setup required');
});
test('five durations and Cancel call only the fixed configured HA script with selected player',async()=>{
    const hass=fixture();
    for(const minutes of [15,30,45,60,90,0]){
        assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes}}),true);
        assert.deepEqual(hass.calls.pop(),['script','sonos_sleep_a',{player,operation:minutes ? 'start' : 'cancel',minutes},{}]);
    }
    assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:10},notify:()=>{}}),false);
    assert.deepEqual(hass.calls,[]);
});
test('remaining display is derived from server UTC state; due never implies browser expiry action',()=>{
    const hass=fixture(),end=1800000900;
    set(hass,{s:'running',e:end,m:15,g:'a'.repeat(64)});
    assert.equal(sleep.status(hass,options,(end-900)*1000).label,'15 min');
    assert.equal(sleep.status(hass,options,(end-61)*1000).label,'2 min');
    const due=sleep.status(hass,options,end*1000);assert.equal(due.label,'Due');assert.equal(due.refreshAt,null);
    assert.deepEqual(hass.calls,[]);assert.equal(due.running,true,'Only HA can consume a job');
    for(const [phase,label] of [['off','Off'],['expired','Expired'],['restart_cancelled','Restarted'],['group_changed','Group changed'],['action_failed','Check HA']]){
        set(hass,{s:phase});assert.equal(sleep.status(hass,options).label,label);
    }
});
test('unavailable/moved group or unsupported pause disables start while Cancel remains scoped and available',async()=>{
    for(const change of ['unavailable','group','pause']){
        const hass=fixture();
        if(change==='unavailable')hass.states[member].state='unavailable';
        if(change==='group')hass.states[member].attributes.group_members=[member];
        if(change==='pause')hass.states[player].attributes.supported_features=0;
        assert.equal(sleep.status(hass,options).playable,false);
        assert.equal(sleep.resolve({hass,config:{_sleep:{...options,minutes:15}}}).disabled,true);
        assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:15},notify:()=>{}}),false);
        assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:0}}),true);
    }
});
test('pending repeated commands deduplicate and errors do not mutate HA helper state',async()=>{
    const hass=fixture(),before=JSON.stringify(hass.states);let complete;
    hass.callService=()=>new Promise(resolve=>complete=resolve);
    const first=sleep.command({hass,actionConfig:{sleep:options,minutes:15}});
    assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:30}}),false);
    complete();assert.equal(await first,true);assert.equal(JSON.stringify(hass.states),before);
    hass.callService=async()=>{throw Error('synthetic denial')};const messages=[];
    assert.equal(await sleep.command({hass,actionConfig:{sleep:options,minutes:15},notify:m=>messages.push(m)}),false);
    assert.match(messages[0],/failed or timed out/);assert.equal(JSON.stringify(hass.states),before);
});
test('two independent helper/script configurations never share state or cancel targets',async()=>{
    const hass=fixture(),other={player:member,state:'input_text.sonos_sleep_b',deadline:'input_datetime.sonos_sleep_deadline_b',script:'script.sonos_sleep_b'};
    hass.states[other.state]={state:'hc1:'+JSON.stringify({v:1,p:member,s:'off'})};
    hass.states[other.deadline]={state:'2027-01-15 12:00:00',attributes:{has_date:true,has_time:true}};hass.states[other.script]={state:'off'};hass.services.script.sonos_sleep_b={};
    await sleep.command({hass,actionConfig:{sleep:other,minutes:0}});
    assert.equal(hass.calls[0][1],'sonos_sleep_b');assert.equal(hass.calls[0][2].player,member);
    assert.equal(sleep.status(hass,{...options,player:member}).ready,false,'Wrong shared helpers are detected');
});
test('Sleep snapshots follow helpers and every group member but ignore unrelated states',()=>{
    const hass=fixture(),config={entity:player,mode:'sonos-sleep',_sleep:options},deps=presentationDependencies(config);
    const before=presentationSnapshot(hass,deps);hass.states['sensor.other']={state:'changed'};
    assert.equal(presentationSnapshot(hass,deps),before);
    hass.states[member].attributes.group_members=[member];assert.notEqual(presentationSnapshot(hass,deps),before);
    hass.states[player].attributes.group_members='invalid';
    assert.doesNotThrow(()=>presentationSnapshot(hass,deps));assert.equal(sleep.status(hass,options).playable,false);
    const menu=sleep.buildMenu({entity:player,sleep_timer:{state:options.state,deadline:options.deadline,script:options.script}});
    assert.deepEqual(menu.buttons.map(b=>b.slot),[7,8,9,10,11,12]);
    assert.equal(menu.inherit_inner,true);assert.equal(menu.idle_timeout,0);
});

test('timer settings cannot override the module selected player',()=>{
    assert.equal(sleep.settings({entity:player,sleep_timer:{...options,player:member}}).player,player);
});
