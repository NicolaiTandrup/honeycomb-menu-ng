const {test}=require('node:test');
const assert=require('node:assert/strict');
const info=require('../src/core/info-cube');
const measure=(text,font)=>Array.from(text).length*parseFloat(font.split(' ')[1])*.62;
test('Info validates three distinct modes and actionable errors',()=>{
    for(const config of [{text:'A'},{mode:'stack',blocks:['A',{text:'B',weight:700}]},{mode:'positioned',blocks:[{text:'C',x:50,y:50,z:2}]}])assert.equal(info.validate(config),config);
    for(const config of [{text:'A',mode:'html'},{text:42},{text:'A',timeout:3},{mode:'stack',blocks:[{text:'B',x:3}]},{mode:'positioned',blocks:[{text:'B',x:-1,y:50}]},{text:'A',font_size:8},{text:'A',colors:{center:'url(unsafe)'}},{text:{entity:'sensor.a',time_zone:'bad'}}])assert.throws(()=>info.validate(config),/Info Cube/);
});
test('centered regular hex stays inside all six actual inner-notch half-planes',()=>{
    const f=info.footprint();assert.equal(f.x,0);assert.equal(f.y,0);assert.equal(f.notches.length,6);
    assert.ok(Math.abs(f.width-163.14428)<.00001);assert.ok(Math.abs(f.height-188.3827)<.00001);
    for(const size of [24,41,60,82,123]){
        const p=info.footprint(size);assert.ok(Math.abs(p.width/f.width-size/82)<1e-9);
        const vertices=[[0,-p.height/2],[p.width/2,-p.height/4],[p.width/2,p.height/4],[0,p.height/2],[-p.width/2,p.height/4],[-p.width/2,-p.height/4]];
        for(let i=0;i<6;i++){
            const a=p.notches[i],b=p.notches[(i+1)%6],nx=b.y-a.y,ny=a.x-b.x,limit=nx*a.x+ny*a.y;
            for(const [x,y] of vertices)assert.ok(nx*x+ny*y<=limit+1e-7);
        }
    }
});
test('source-facing connector inherits source inner color, not Info border, and stays in border gutter',()=>{
    const g={width:164,height:164*1.1547,left:0,top:0};
    for(let slot=0;slot<=18;slot++){
        const angle=(slot||1)*Math.PI/3,source={slot,x:82+Math.cos(angle)*200,y:g.height/2+Math.sin(angle)*200,inner:'#12ab34'};
        const c=info.connector({colors:{inner_border:'#ff00ff'}},source,g);
        assert.equal(c.color,'#12ab34');assert.equal(c.slot,slot);
        for(const [x,y] of [[c.x1,c.y1],[c.x2,c.y2]]){assert.ok(x>=0&&x<=g.width&&y>=0&&y<=g.height);}
        assert.equal(info.connector({connector:{color:'#f08020'}},source,g).color,'#f08020');
        assert.equal(info.connector({connector:false},source,g),null);
    }
    assert.equal(info.connector({},null,g),null);
    for(const config of [{text:'A',scale:1.1},{text:'A',connector:{foo:1}},{text:'A',connector:{color:'url(x)'}}])assert.throws(()=>info.validate(config));
});
test('static and dynamic footer uses the same wrapping, binding and dependency contract',()=>{
    const c={title:{entity:'sensor.title'},text:'Static paragraph',footer:{entity:'sensor.a',attribute:'unit',prefix:'Unit: ',suffix:'.'}};
    assert.deepEqual(info.dependencies(c),['sensor.title','sensor.a']);
    const r=info.layoutText(c,{states:{'sensor.title':{state:'Overview'},'sensor.a':{state:'1',attributes:{unit:'kWh'}}}},164,measure);
    assert.match(r.text,/Unit: kWh\./);assert.ok(r.pages.flat().some(l=>l.text.includes('kWh')));
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

test('whitespace-only and empty positioned payloads show one finite fallback instead of blank pages',()=>{
    for(const c of [{text:' \n'.repeat(1000)},{mode:'stack',blocks:[]},{mode:'positioned',blocks:[]}]){
        const r=info.layoutText(c,null,328,measure);
        assert.equal(r.pages.length,1);assert.equal(r.text,'No information available');
        assert.ok(r.pages[0].length>0);assert.ok(r.pages[0].every(line=>Number.isFinite(line.x)&&Number.isFinite(line.y)));
    }
});

test('small notch-bounded panels report a title that cannot fit without generating empty pages',()=>{
    const r=info.layoutText({title:'Information',text:'State: on'},null,info.footprint(41).width,measure);
    assert.ok(r.pages.length<5);assert.ok(r.pages[0].length);assert.ok(r.warnings.includes('Text cannot fit at this size'));
});

test('fixed fonts and long Danish payloads remain bounded at normal and compact notch sizes',()=>{
    for(const font_size of [12,20,32])for(const width of [81.57214,138.67264,163.14428]){
        const r=info.layoutText({font_size,text:'Æblegrød Ørsted ål '.repeat(50)},null,width,measure);
        assert.ok(r.pages.length<=64);
        for(const line of r.pages.flat()){
            assert.equal(line.size,font_size);const b=info.band(width,r.height,line.top,line.bottom,17);
            assert.ok(line.x>=b.left-.01&&line.x+line.width<=b.right+.01);
        }
    }
});

test('Info source paints independently resolve missing layers without mutating a snapshot',()=>{
    const paint=require('../src/core/info-paint'),snap={center:{type:'radialGradient',attributes:{cx:'25%'},stops:[{color:'red',offset:'0%'}],opacity:.4}};
    const c={text:'A',colors:{center:'source',inner_border:'source',outer_border:'#123456'}};info.validate(c);
    const r=paint.resolve(c,snap);assert.equal(r.center,snap.center);assert.equal(r.inner_border.color,'#34424e');assert.equal(r.outer_border,undefined);assert.equal(info.shell(c).colors.center,'rgba(52, 66, 78, 0.94)');
    assert.deepEqual(paint.capture(null),{});assert.throws(()=>info.validate({text:'A',colors:{center:'url(https://example.org/x)'}}));
});

test('all three source fields independently combine with explicit overrides',()=>{
    const paint=require('../src/core/info-paint'),keys=['center','inner_border','outer_border'];
    const snap=Object.fromEntries(keys.map((k,i)=>[k,{type:'solid',color:'rgba(1,2,3,.4)',opacity:.5}]));
    for(let mask=0;mask<8;mask++){
        const colors=Object.fromEntries(keys.map((k,i)=>[k,mask&(1<<i)?'source':'#123456']));
        const result=paint.resolve({colors},snap);
        keys.forEach((k,i)=>assert.equal(result[k],mask&(1<<i)?snap[k]:undefined));
    }
});
