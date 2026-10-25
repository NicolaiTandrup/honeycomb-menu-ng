const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('../src/modules/light/presentation');
const config={entity:'light.zone_a',_hub_item_id:'items[0]',show_brightness:'when_on'};
const state=(status,attributes={})=>({entity_id:config.entity,state:status,attributes});
const face=(status,extra={},attributes={})=>resolve({config:{...config,...extra},state:state(status,attributes),runtime:{}});

test('OFF Hub launcher uses configured short name, then friendly name, then readable entity',()=>{
    assert.equal(face('off',{name:'A'},{friendly_name:'Long device name'}).name,'A');
    assert.equal(face('off',{}, {friendly_name:'Light A'}).name,'Light A');
    assert.equal(face('off',{name:'  '},{friendly_name:'  '}).name,'zone a');
    assert.equal(face('off',{name:'A'}).secondary,'OFF');
    assert.equal(face('off',{show_brightness:'never'}).secondary,'OFF');
});
test('existing name evaluation supports templates and safe empty/error fallback',()=>{
    const ctx={config:{...config,name:'[[[ return variables.short; ]]]'},state:state('off',{friendly_name:'Light A'})};
    assert.equal(resolve({...ctx,evaluate:()=> 'B'}).name,'B');
    assert.equal(resolve({...ctx,evaluate:()=> undefined}).name,'Light A');
});
test('ON presentation is identical to non-Hub Light, with unchanged colors and brightness',()=>{
    for(const extra of [{name:'A'}, {show_name:true,name:'A'}, {show_brightness:'never'}, {colors:{center:'#123456',inner_border:'#abcdef'}}]) {
        const on=state('on',{brightness:128,rgb_color:[40,80,120]});
        assert.deepEqual(resolve({config:{...config,...extra},state:on,runtime:{}}),
            resolve({config:{...config,...extra,_hub_item_id:undefined},state:on,runtime:{}}));
    }
});
test('OFF naming preserves remembered color ring and explicit colors',()=>{
    const runtime={};
    resolve({config,state:state('on',{rgb_color:[40,80,120]}),runtime});
    const off=resolve({config:{...config,name:'A'},state:state('off'),runtime});
    assert.deepEqual(off.colors,{center:'#202224',inner:'rgb(40, 80, 120)',outer:'#34383d'});
    assert.equal(face('off',{colors:{inner_border:'#abcdef'}}).colors.inner,'#abcdef');
});
test('unavailable, unknown and missing states never claim OFF',()=>{
    for(const value of [state('unknown'),state('unavailable'),null]) {
        const result=resolve({config:{...config,name:'A'},state:value,runtime:{}});
        assert.equal(result.secondary,'Unavailable');assert.equal(result.name,undefined);
    }
});
test('standalone Light and promoted Back centers retain existing OFF presentation',()=>{
    assert.equal(face('off',{_hub_item_id:undefined}).secondary,'Off');
    for(const tap_action of ['honeycomb-back',{action:'honeycomb-back'}]) {
        const result=face('off',{name:'A',tap_action});
        assert.equal(result.name,undefined);assert.equal(result.secondary,'Off');
    }
});
