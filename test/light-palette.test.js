const {test}=require('node:test');
const assert=require('node:assert/strict');
const {capabilities,selectedPalette}=require('../src/modules/light/palette-state');
const {resolvePaletteRequest}=require('../src/modules/light/controls');
const entity='light.zone_a';
const fixture=(modes,mode,state='on')=>({states:{[entity]:{state,attributes:{supported_color_modes:modes,color_mode:mode,min_color_temp_kelvin:2200,max_color_temp_kelvin:6500}}}});
const open=(hass,kind='current',view)=>resolvePaletteRequest({entity,_light_palette_request:kind},hass,view);
for(const [modes,mode,expected,other] of [
    [['hs','color_temp'],'color_temp','white','color'],[['xy','color_temp'],'xy','color','white'],
    [['rgb','color_temp'],'rgb','color','white'],[['rgbw'],'rgbw','color',null],
    [['rgbww'],'rgbww','color',null],[['color_temp'],'color_temp','white',null],
    [['brightness'],null,null,null],[['onoff'],null,null,null],[[],null,null,null]
])test(`advertised ${modes} with ${mode}: ${expected}, alternate ${other}`,()=>{
    const hass=fixture(modes,mode);hass.callService=()=>assert.fail('Navigation is UI only');
    assert.equal(selectedPalette(hass,entity),expected);
    const current=open(hass),opposite=open(hass,'opposite');
    assert.equal(current && current._light_palette_view,expected);
    assert.equal(opposite && opposite._light_palette_view,other);
    if(current){assert.equal(current.buttons.length,12);assert.equal(current.persistent_center.name,expected==='white'?'White':'Color');
        assert.equal(current.persistent_center.label,other ? other==='white'?'White':'Color' : '');}
});
test('manual palette selection wins over hardware mode until reopening; zoom uses already selected palette',()=>{
    const hass=fixture(['hs','color_temp'],'color_temp');
    assert.equal(open(hass)._light_palette_view,'white');
    assert.equal(open(hass,'opposite','white')._light_palette_view,'color');
    assert.equal(open(hass,'opposite','color')._light_palette_view,'white');
    assert.equal(open(hass)._light_palette_view,'white');
    const zoom={buttons:[]};assert.equal(resolvePaletteRequest(zoom,hass,'color'),zoom);
});
test('off/null retention is connection/session/entity scoped, rechecks supported modes and never infers RGB',()=>{
    const hass=fixture(['hs','color_temp'],'color_temp'),connection={};hass.connection=connection;
    assert.equal(selectedPalette(hass,entity),'white');
    hass.states[entity]={...hass.states[entity],state:'off',attributes:{...hass.states[entity].attributes,color_mode:null,rgb_color:[255,0,0]}};
    assert.equal(selectedPalette({...hass},entity),'white');
    assert.equal(selectedPalette({...hass,connection:{}},entity),'color');
    hass.states['light.zone_b']=hass.states[entity];assert.equal(selectedPalette(hass,'light.zone_b'),'color');
    hass.states[entity].attributes.supported_color_modes=['hs'];assert.equal(selectedPalette(hass,entity),'color');
    hass.states[entity].attributes.supported_color_modes=['hs','color_temp'];hass.states[entity].state='unavailable';
    assert.equal(selectedPalette(hass,entity),'color');
    hass.states[entity].state='on';hass.states[entity].attributes.color_mode='hs';assert.equal(selectedPalette(hass,entity),'color');
});
test('inconsistent group mode cannot invent unsupported palettes; missing bounds do not fabricate Kelvin',()=>{
    const hass=fixture(['color_temp'],'rgb');assert.equal(open(hass)._light_palette_view,'white');
    assert.equal(open(hass,'opposite'),null);
    delete hass.states[entity].attributes.min_color_temp_kelvin;assert.equal(open(hass),null);
    assert.equal(capabilities(null).colorCapable,false);
});
test('a stale group palette cannot send color commands after capability loss or unavailability',()=>{
    const {applyColor}=require('../src/modules/light/actions');
    const hass=fixture(['hs','color_temp'],'hs'),calls=[];hass.callService=(...a)=>calls.push(a);
    const context={hass,entity,actionConfig:{data:{hs_color:[25,85]}}};
    assert.equal(applyColor(context),true);assert.deepEqual(calls,[['light','turn_on',{hs_color:[25,85]},{entity_id:entity}]]);calls.length=0;
    hass.states[entity].attributes.supported_color_modes=['color_temp'];assert.equal(applyColor(context),false);
    hass.states[entity].attributes.supported_color_modes=['hs'];hass.states[entity].state='unavailable';assert.equal(applyColor(context),false);assert.deepEqual(calls,[]);
});

test('explicit onoff capability suppresses details even when unavailable or changed since launcher compilation',()=>{
    const light=require('../src/modules/light');
    for(const state of ['on','off','unknown','unavailable']) {
        const hass=fixture(['onoff'],'onoff',state);
        assert.equal(light.buildMenu({hass,item:{entity}}),null);
    }
    assert.notEqual(light.buildMenu({hass:fixture([],null,'unavailable'),item:{entity}}),null);
});
