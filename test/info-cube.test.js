const {test}=require('node:test');
const assert=require('node:assert/strict');
const info=require('../src/core/info-cube');
const measure=(text,font)=>Array.from(text).length*parseFloat(font.split(' ')[1])*.62;
test('Info validates three distinct modes and actionable errors',()=>{
    for(const config of [{text:'A'},{mode:'stack',blocks:['A',{text:'B',weight:700}]},{mode:'positioned',blocks:[{text:'C',x:50,y:50,z:2}]}])assert.equal(info.validate(config),config);
    for(const config of [{text:'A',mode:'html'},{text:42},{text:'A',timeout:3},{mode:'stack',blocks:[{text:'B',x:3}]},{mode:'positioned',blocks:[{text:'B',x:-1,y:50}]},{text:'A',font_size:8},{text:'A',colors:{center:'url(unsafe)'}},{text:{entity:'sensor.a',time_zone:'bad'}}])assert.throws(()=>info.validate(config),/Info Cube/);
});
test('geometry includes literal 0 through 7 with left offset, never silently 0–6',()=>{
    const f=info.footprint();assert.deepEqual(f.slots,[0,1,2,3,4,5,6,7]);assert.equal(f.x,-41);assert.equal(f.width,328);
    for(const size of [41,60,82,123]){const p=info.footprint(size);assert.equal(p.width,size*4);assert.equal(p.x,-size/2);}
});
test('Danish, long words, blank lines and extreme payload paginate within every sloped band',()=>{
    const config={text:'Æblegrød Ørsted ål\n'+('Megetlangtordudenmellemrum'.repeat(8)+' ').repeat(70)};
    for(const width of [164,246,328,410]){
        const result=info.layoutText(config,null,width,measure);assert.ok(result.pages.length>1);
        for(const page of result.pages)for(const line of page){
            const b=info.band(width,result.height,line.top,line.bottom,17);
            const left=line.align==='center'?line.x-line.width/2:line.align==='right'?line.x-line.width:line.x;
            assert.ok(left>=b.left-.01);assert.ok(left+line.width<=b.right+.01);assert.ok(line.size>=12);assert.ok(line.bottom<result.height-18);
        }
    }
});
test('positioned text clamps to safe bands and sorts z, with explicit bounded truncation',()=>{
    const r=info.layoutText({mode:'positioned',blocks:[{text:'A',x:0,y:25,z:5},{text:'B',x:100,y:50,z:-5},{text:'Long '.repeat(150),x:50,y:85,align:'center'}]},null,328,measure);
    assert.ok(r.warnings.some(w=>w.includes('clamped')));assert.ok(r.warnings.some(w=>w.includes('truncated')));
    assert.deepEqual(r.pages[0].map(l=>l.z),r.pages[0].map(l=>l.z).sort((a,b)=>a-b));
});
test('safe bindings preserve plain text and formats DST/timezones without HTML or execution',()=>{
    const hass={states:{'sensor.value':{state:'42',attributes:{unit_of_measurement:'kWh'}},'sensor.time':{state:'2026-10-25T01:30:00Z'}}};
    assert.equal(info.value({entity:'sensor.value',prefix:'Energy ',suffix:' kWh'},hass),'Energy 42 kWh');
    assert.equal(info.value({entity:'sensor.value',attribute:'unit_of_measurement'},hass),'kWh');
    assert.equal(info.value({entity:'sensor.missing',fallback:'Waiting'},hass),'Waiting');
    hass.states['sensor.value'].state='unavailable';assert.equal(info.value({entity:'sensor.value'},hass),'Unavailable');
    assert.match(info.value({entity:'sensor.time',format:'datetime',time_zone:'Europe/Copenhagen'},hass),/02:30/);
    const text='<img src=x onerror=alert(1)> ${doNotExecute()} [[[ return 42; ]]]';
    assert.equal(info.resolve({text},hass).blocks[0].text,text);
});
test('bounds and dependency set protect performance and caching',()=>{
    assert.throws(()=>info.validate({mode:'stack',blocks:Array(129).fill('A')}),/128/);
    const c={mode:'stack',title:{entity:'sensor.a'},blocks:[{text:{entity:'sensor.a'}},{text:{entity:'sensor.b'}}]};
    assert.deepEqual(info.dependencies(c),['sensor.a','sensor.b']);
    const r=info.layoutText({text:'A'.repeat(50000)},null,164,measure);assert.ok(r.warnings.length);assert.ok(r.pages.length<=64);
});
test('shell is shared neutral cell with noninteractive content and explicit colors only',()=>{
    const shell=info.shell({colors:{inner_border:'#abcdef'}});assert.equal(shell.interactive,false);assert.equal(shell.colors.inner_border,'#abcdef');assert.equal(shell.colors.outer_border,'#34383d');assert.equal(shell.face_mode,'cell');
});

test('empty and stale values remain explicit, never invented live data',()=>{
    assert.equal(info.resolve({text:''},null).blocks.at(-1).text,'No information available');
    const hass={states:{'sensor.a':{state:'3',last_updated:'2020-01-01T00:00:00Z'}}};
    assert.equal(info.value({entity:'sensor.a',max_age:30,stale_text:'Waiting for update'},hass),'Waiting for update');
});
