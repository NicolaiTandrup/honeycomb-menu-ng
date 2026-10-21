const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const crypto=require('crypto');
const layout=require('../src/core/layout');
const navigation=require('../src/core/navigation-context');
const {buildCubeConfig,validateCubeConfig}=require('../src/core/cube-config');

test('expanding axial geometry keeps unique cells beyond two rings',()=>{
    for (const count of [5,20,50,200]) {
        const rings=layout.resolveRings(count,[0]);
        assert.ok(layout.ringCapacity(rings.radius)>=count);
        const positions=Array.from({length:count},(_,i)=>layout.buttonPosition(i,{inner:true,outer:true,radius:rings.radius}));
        assert.equal(new Set(positions.map(p=>`${p.x},${p.y}`)).size,count);
        assert.ok(positions.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    }
});
test('ring boundaries and established first-two-ring coordinates stay valid',()=>{
    assert.deepEqual([0,5,6,17,18,35,36,59,60].map(layout.ringForSlot),[1,1,2,2,3,3,4,4,5]);
    assert.deepEqual(layout.buttonPosition(0,{inner:true,outer:true,radius:4}),{x:3,y:3.46});
    assert.equal(layout.activeSlotPool(layout.resolveRings(50)).length,60);
});
test('module compilation preserves common appearance and action overrides',()=>{
    const item={module:'media',entity:'media_player.player_a',name:'Player A',show_name:true,
        colors:{inner_border:'#123456'},border:{outer_width:0},tap_action:{action:'none'}};
    const compiled=buildCubeConfig(item,{states:{}},0,3);
    assert.equal(compiled.mode,'media');assert.equal(compiled.face_mode,'cell');
    assert.equal(compiled.colors.inner_border,'#123456');assert.equal(compiled.border.outer_width,0);
    assert.deepEqual(compiled.tap_action,{action:'none'});assert.equal(compiled.menu.buttons.length,4);
    assert.equal(item.slot,undefined);assert.equal(item.menu,undefined);
});
test('standalone adapters and Hub use the same generic descriptor',()=>{
    const item={module:'generic',entity:'sensor.value_a',name:'Value A',label:'24',styles:{name:[{'font-size':'12px'}]}};
    assert.deepEqual(buildCubeConfig({...item,module:undefined,type:'generic'},null,0,0),buildCubeConfig(item,null,0,0));
    const compiled=buildCubeConfig(item,null,0,0);
    assert.equal(compiled.mode,'generic');assert.equal(compiled.label,'24');assert.equal(compiled.styles.name[0]['font-size'],'12px');
});
test('dynamic conditions belong only to Hub items; classic CSS and configs stay valid',()=>{
    for (const config of [{visibility:[]},{items:[{slot_mode:'priority'}]},{menu:{buttons:[{visibility:[{condition:'state'}]}]}}])
        assert.throws(()=>validateCubeConfig(config),/only on Hub items/);
    assert.doesNotThrow(()=>validateCubeConfig({items:[{visibility:[],slot_mode:'priority'}]}, {hubItems:true}));
    assert.doesNotThrow(()=>validateCubeConfig({styles:{card:[{visibility:'hidden'}]}}));
    assert.doesNotThrow(()=>validateCubeConfig({items:Array.from({length:50},()=>({module:'generic'}))}));
});
test('captured baseline provenance and PNG checksums are reproducible',()=>{
    const manifest=require('./visual-baseline/v1.5.1/manifest.json');
    assert.equal(manifest.commit,'c1d9507ee48e65b951f6302c668dadf17043c195');
    for (const [file,digest] of Object.entries(manifest.images))
        assert.equal(crypto.createHash('sha256').update(fs.readFileSync(`test/visual-baseline/v1.5.1/${file}`)).digest('hex'),digest);
});

test('direct siblings replace within their own module; genuine children and unrelated modules push',()=>{
    const sibling=(group,id)=>({_navigation_sibling:{group,id}});
    for (const from of ['radio','join','sleep']) for (const to of ['radio','join','sleep'])
        assert.equal(navigation.areSiblings(sibling('sonos:media_player.player_a',from),sibling('sonos:media_player.player_a',to)),true);
    for (const other of [{},sibling('sonos:media_player.player_b','join'),{_navigation_sibling:{group:'',id:'join'}},{_navigation_sibling:{group:'sonos:media_player.player_a'}}])
        assert.equal(navigation.areSiblings(sibling('sonos:media_player.player_a','radio'),other),false);
});
test('sibling replacement retains module anchor and depth; recursive children still add one level',()=>{
    const context=navigation.createMenuContext({local:true}),base={_persistent_hub_root:true};
    const main={anchor_x:120,anchor_y:240},radio={_navigation_sibling:{group:'sonos:media_player.player_a',id:'radio'}};
    navigation.enterNested(context,base,main);navigation.enterNested(context,main,radio);
    for (const id of ['join','sleep','radio','radio']) {
        const next={_navigation_sibling:{group:'sonos:media_player.player_a',id}};
        navigation.enterNested(context,radio,next);
        assert.deepEqual(context.navigation,{phase:'nested',depth:2});
        assert.deepEqual(navigation.readAnchor(next),{x:120,y:240});
    }
    const child={},deeper={};navigation.enterNested(context,radio,child);navigation.enterNested(context,child,deeper);
    assert.equal(context.navigation.depth,4);navigation.prepareBack(context,child);assert.equal(context.navigation.depth,3);
    navigation.prepareBack(context,radio);assert.equal(context.navigation.depth,2);
    navigation.prepareBack(context,main);assert.deepEqual(context.navigation,{phase:'module',depth:1});
});
