// Validate documentation against production geometry, module and condition contracts.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const layout=require('../../src/core/layout');
const {buildCubeConfig,validateCubeConfig}=require('../../src/core/cube-config');
const {compileVisibility}=require('../../src/core/visibility');
const {allocateHubSlots}=require('../../src/core/hub-allocation');
const input=JSON.parse(fs.readFileSync(process.argv[2]));
const readme=fs.readFileSync('README.md','utf8');
const diagram=readme.split('<!-- layout-diagram:start -->')[1].split('<!-- layout-diagram:end -->')[0];
const cells=[];
for(const [row,line] of diagram.split('\n').filter(l=>l.includes('[')).entries())
    for(const match of line.matchAll(/\[\s*(\d+)\]/g)) cells.push({slot:Number(match[1]),x:match.index,y:row});
assert.deepEqual(cells.map(c=>c.slot).sort((a,b)=>a-b),Array.from({length:19},(_,i)=>i));
const origin=cells.find(c=>c.slot===0);
for(const cell of cells){
    const actual=cell.slot===0?layout.sceneCenter(2):layout.buttonPosition(cell.slot-1,{inner:true,outer:true,radius:2});
    assert.ok(Math.abs((cell.x-origin.x)/8-(actual.x-2))<.01,`diagram slot ${cell.slot} x`);
    assert.ok(Math.abs((cell.y-origin.y)*.865-(actual.y-1.73))<.01,`diagram slot ${cell.slot} y`);
}
for(let ring=1;ring<=8;ring++){
    const start=layout.ringCapacity(ring-1)+1,end=layout.ringCapacity(ring);
    assert.equal(layout.ringForSlot(start-1),ring);assert.equal(layout.ringForSlot(end-1),ring);
    assert.ok(readme.includes(`${start}–${end}`),`README ring ${ring}`);
}
const hass={states:input.states};
let compiled=0;
for(const {source,config} of input.cards){
    if(config.type==='button'){validateCubeConfig(config);continue;}
    const hub=config.type.endsWith('-hub');
    validateCubeConfig(config,{hubItems:hub});
    for(const [index,item] of (hub?config.items:[config]).entries()){
        const launcher=buildCubeConfig(item,hass,index,item.slot||0);
        assert.equal(launcher.face_mode,'cell',source);
        assert.equal(launcher.entity,item.entity,source);
        if(item.visibility) compileVisibility(item.visibility).evaluate(hass);
        if(item.presets){
            for(const [key,value] of Object.entries(item.presets)){
                const keys=key==='color'?['hue_entity','saturation_entity']:['entity'];
                for(const k of keys) if(value[k]) assert.match(value[k],/^(number|input_number)\./);
            }
        }
        compiled++;
    }
}
const dynamic=input.examples['dynamic-hub.yaml'];
const visibility=dynamic.items.map(i=>compileVisibility(i.visibility));
assert.deepEqual(visibility.map(v=>v.evaluate(hass)),[true,true,true,false]);
hass.states['light.zone_b'].attributes.brightness=127;
assert.equal(visibility[2].evaluate(hass),false,'exclusive brightness bound');
hass.states['person.person_a'].state='not_home';
assert.deepEqual(visibility.map(v=>v.evaluate(hass)),[true,false,false,true]);
let allocation=allocateHubSlots(dynamic.items.map((i,index)=>({id:String(index),mode:i.slot_mode,slot:i.slot||0,visible:index<3})));
assert.deepEqual([...allocation.placements],[['0',0],['1',2],['2',1]]);
const sonos=buildCubeConfig(input.examples['sonos.yaml'].items[0],hass).menu;
assert.equal(sonos.buttons[2].tap_action.honeycomb_nested_menu.buttons[0].tap_action.perform_action,'script.player_a_toggle_member');
assert.equal(sonos.buttons[4].tap_action.honeycomb_nested_menu.buttons[0].tap_action.data.media_content_type,'favorite_item_id');
assert.equal(buildCubeConfig(input.examples['onoff-light.yaml'],hass).menu,null);
console.log(`Documentation contracts: verified 19-cell diagram, 8 rings, ${compiled} module descriptors, dynamic bounds/placement and external action wiring`);
