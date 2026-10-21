const {test}=require('node:test');
const assert=require('node:assert/strict');
const k=require('../src/modules/light/kelvin-zoom');
const {buildWhitePaletteButtons,applyPresetControls}=require('../src/modules/light/controls');
const {applyKelvin,zoomKelvin}=require('../src/modules/light/kelvin-actions');
const entity='light.zone_a';
function fixture(min=2200,max=6500){const calls=[];return {states:{[entity]:{state:'on',attributes:{supported_color_modes:['color_temp'],min_color_temp_kelvin:min,max_color_temp_kelvin:max}}},callService:(...args)=>{calls.push(args);return Promise.resolve()},calls};}
function buttons(min=2200,max=6500){return buildWhitePaletteButtons({minKelvin:min,maxKelvin:max});}
for(const [min,max] of [[2000,6535],[2200,6500],[2990,3001],[500,12000]])test(`native ${min}–${max} K: all twelve physical anchors refine linearly without hue wrapping`,()=>{
    const range=k.normalizeRange(min,max),initial=k.initialPalette(range);
    assert.equal(initial[0],min);assert.equal(initial[11],max);
    for(let selected=0;selected<12;selected++){
        let palette=initial,history=[],depth=0;
        for(;;){const previous=[...palette],next=k.refineKelvinPalette(palette,selected,range);if(!next)break;
            history.push(previous);assert.deepEqual(palette,previous);assert.equal(next[selected],palette[selected]);
            assert.equal(new Set(next).size,12);assert.ok(next[0]>=palette[0]&&next[11]<=palette[11]);
            const step=next[1]-next[0];assert.ok(Number.isInteger(step)&&step>=1);
            assert.ok(next.every((v,i)=>v>=min&&v<=max&&(!i||v-next[i-1]===step)));
            palette=next;assert.ok(++depth<20);
        }
        assert.equal(palette[1]-palette[0],1);assert.equal(k.refineKelvinPalette(palette,selected,range),null);
        while(history.length)palette=history.pop();assert.deepEqual(palette,initial);
    }
});
test('small and fixed native ranges keep twelve positions but never invent temperatures or duplicate-producing zoom levels',()=>{
    for(const [min,max] of [[2990,2990],[2990,2991],[2990,3000]]){
        const list=buttons(min,max);assert.equal(list.length,12);assert.deepEqual(list.map(b=>b.slot),Array.from({length:12},(_,i)=>i+7));
        assert.ok(list.every(b=>b.tap_action.data.color_temp_kelvin>=min&&b.tap_action.data.color_temp_kelvin<=max));
        assert.ok(list.every(b=>b.hold_action.action==='none'&&b.name.includes('zoom limit')));
    }
});
test('missing, inverted, nonnumeric or nonpositive Kelvin bounds fail closed; native fractional bounds are rounded inward',()=>{
    for(const pair of [[undefined,6500],[2200,null],[NaN,6500],[6500,2200],[0,6500],[-1,6500],['2200',6500],[2200,Infinity]]){
        assert.equal(k.normalizeRange(...pair),null);assert.deepEqual(buildWhitePaletteButtons({minKelvin:pair[0],maxKelvin:pair[1]}),[]);
    }
    assert.deepEqual(k.normalizeRange(2990.1,3001.9),{min:2991,max:3001,step:1});
    assert.equal(k.normalizeRange(2990.2,2990.8),null);
});
test('solid White descriptors have no visible dot/name/secondary, but preserve exact accessible Kelvin and actions',()=>{
    const list=buttons();
    for(const [i,b] of list.entries()){
        assert.equal(b.show_icon,false);assert.equal(b.show_name,false);assert.equal(b.show_label,false);
        assert.equal(b.icon,undefined);assert.match(b.name,new RegExp(`^${b.tap_action.data.color_temp_kelvin} K;`));
        assert.match(b.styles.card[0].background,/^rgb\(/);assert.equal(b.hold_action.selected,i);
        assert.equal(b.tap_action.action,'honeycomb-light-kelvin-apply');assert.equal(b.hold_action.action,'honeycomb-light-kelvin-zoom');
    }
});
test('Kelvin short tap sends exactly one bounded exact-temperature call; hold sends none',()=>{
    const hass=fixture(),b=buttons()[5];let opened;
    assert.equal(applyKelvin({hass,entity,actionConfig:b.tap_action}),true);
    assert.deepEqual(hass.calls,[['light','turn_on',{color_temp_kelvin:b.tap_action.data.color_temp_kelvin},{entity_id:entity}]]);
    hass.calls.length=0;
    assert.equal(zoomKelvin({hass,entity,actionConfig:b.hold_action,openNested:menu=>opened=menu}),true);
    assert.equal(opened.inherit_inner,true);assert.equal(opened.buttons[5].tap_action.data.color_temp_kelvin,b.tap_action.data.color_temp_kelvin);
    assert.deepEqual(hass.calls,[]);
});
test('stale out-of-range samples, unavailable/missing capability and malformed actions cannot call HA or corrupt zoom',()=>{
    for(const change of ['bounds','unavailable','mode','missing']){
        const hass=fixture(),b=buttons()[0],state=hass.states[entity];
        if(change==='bounds')state.attributes.min_color_temp_kelvin=3000;
        if(change==='unavailable')state.state='unavailable';
        if(change==='mode')state.attributes.supported_color_modes=['hs'];
        if(change==='missing')delete state.attributes.max_color_temp_kelvin;
        assert.equal(applyKelvin({hass,entity,actionConfig:b.tap_action,notify:()=>{}}),false);
        assert.equal(zoomKelvin({hass,entity,actionConfig:b.hold_action,notify:()=>{},openNested:()=>assert.fail('Invalid range')}),false);
        assert.deepEqual(hass.calls,[]);
    }
    const hass=fixture();assert.equal(applyKelvin({hass,entity,actionConfig:{data:{color_temp_kelvin:3000.5}},notify:()=>{}}),false);
    assert.equal(zoomKelvin({hass,entity,actionConfig:{palette:[],selected:0},openNested:()=>assert.fail('Invalid'),notify:()=>{}}),false);
});
test('minimum-step hold is a no-op and a device failure reports clearly without a retry',async()=>{
    const hass=fixture(2990,3001),b=buttons(2990,3001)[0];
    assert.equal(zoomKelvin({hass,entity,actionConfig:{palette:k.initialPalette(k.nativeRange(hass.states[entity])),selected:0},openNested:()=>assert.fail('No new level')}),false);
    const messages=[];hass.callService=()=>Promise.reject(Error('synthetic device failure'));
    assert.equal(applyKelvin({hass,entity,actionConfig:b.tap_action,notify:m=>messages.push(m)}),true);
    await Promise.resolve();assert.equal(messages.length,1);assert.match(messages[0],/could not apply/);
});
test('native White missing bounds is an explanatory no-op, never a guessed range',()=>{
    const old=global.document;
    // Use a stable HA object: controls inspect the same live root as production.
    const hass=fixture();delete hass.states[entity].attributes.min_color_temp_kelvin;
    global.document={querySelector:()=>({hass})};
    try {const menu={entity,buttons:[{control:'light-palette'}]};applyPresetControls(menu,{},entity);
        assert.equal(menu.buttons[0].name,'White unavailable');assert.equal(menu.buttons[0].tap_action.action,'none');
    } finally {global.document=old;}
});
