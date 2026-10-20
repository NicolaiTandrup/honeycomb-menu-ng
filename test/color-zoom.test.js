const {test}=require('node:test');
const assert=require('node:assert/strict');
const {INITIAL,refinePalette}=require('../src/modules/light/color-zoom');
const {buildColorPaletteButtons,buildWhitePaletteButtons}=require('../src/modules/light/controls');
const {zoomColor}=require('../src/modules/light/actions');
const at=index=>(index+12)%12;
for(const slot of [7,8,10,18])test(`zoom preserves physical slot ${slot}, exact selected HS and both adjacent anchors`,()=>{
    const index=slot-7,before=JSON.stringify(INITIAL),result=refinePalette(INITIAL,index);
    assert.deepEqual(result[index],INITIAL[index]);
    assert.deepEqual(result[at(index+5)],INITIAL[at(index+1)]);
    assert.deepEqual(result[at(index-6)],INITIAL[at(index-1)]);
    assert.equal(JSON.stringify(INITIAL),before);
    assert.deepEqual(buildColorPaletteButtons(result).map(b=>b.slot),Array.from({length:12},(_,i)=>i+7));
});
test('orange slot 8 example uses five clockwise and six counterclockwise steps',()=>{
    const result=refinePalette(INITIAL,1).map(color=>color[0]);
    const expected=[125/6,25,30,35,40,45,50,0,25/6,25/3,12.5,50/3];
    for(let i=0;i<12;i++)assert.ok(Math.abs(result[i]-expected[i])<1e-10);
});
test('hue seam, exact 360 endpoints, unequal saturation and half-circle ties are deterministic',()=>{
    const palette=INITIAL.map(c=>[...c]);palette[0]=[360,75];palette[1]=[10,25];palette[11]=[350,100];
    const result=refinePalette(palette,0);
    assert.deepEqual(result[0],[360,75]);assert.deepEqual(result[5],[10,25]);assert.deepEqual(result[6],[350,100]);
    assert.ok(Math.abs(result[1][0]-2)<1e-10);assert.equal(result[1][1],65);
    assert.ok(result[11][0]>350 && result[11][0]<360);assert.ok(result.every(c=>c[1]>=25 && c[1]<=100));
    palette[1]=[180,75];assert.equal(refinePalette(palette,0)[1][0],36);
});
test('recursive snapshots restore exactly and remain independent across deep zooms',()=>{
    let palette=INITIAL;const history=[];
    for(let depth=0;depth<30;depth++){
        history.push(palette);const index=depth%12;const next=refinePalette(palette,index);
        assert.deepEqual(next[index],palette[index]);assert.ok(next.every(color=>color.every(Number.isFinite)));palette=next;
    }
    while(history.length)palette=history.pop();assert.deepEqual(palette,INITIAL);
});
test('invalid palette data and selected indices are rejected',()=>{
    for(const [palette,index] of [[[],0],[INITIAL,-1],[INITIAL,12],[INITIAL,1.5],[INITIAL.map(()=>[NaN,85]),0],[INITIAL.map(()=>[0,-1]),0],[INITIAL.map(()=>[361,85]),0]])
        assert.throws(()=>refinePalette(palette,index));
});
test('long press opens a nested palette without any HA calls; tap IDs and Kelvin remain unchanged',()=>{
    const buttons=buildColorPaletteButtons(),hass={states:{'light.zone_a':{state:'on',attributes:{supported_color_modes:['hs']}}},callService:()=>assert.fail('Zoom never sends HA calls')};
    let submenu;
    assert.equal(zoomColor({hass,entity:'light.zone_a',actionConfig:buttons[1].hold_action,openNested:config=>submenu=config}),true);
    assert.equal(submenu.entity,'light.zone_a');assert.equal(submenu.inherit_inner,true);
    assert.deepEqual(submenu.buttons[1].tap_action,{action:'perform-action',perform_action:'light.turn_on',data:{hs_color:[25,85]}});
    assert.equal(submenu.buttons[1].hold_action.action,'honeycomb-light-color-zoom');
    assert.ok(buildWhitePaletteButtons({minKelvin:2200,maxKelvin:6500}).every(b=>!b.hold_action));
    hass.states['light.zone_a'].state='unavailable';assert.equal(zoomColor({hass,entity:'light.zone_a',actionConfig:buttons[0].hold_action,openNested:()=>assert.fail('Unavailable')}),false);
});
