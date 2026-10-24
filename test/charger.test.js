const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settings,waveOptions}=require('../src/modules/charger/config');
const easee=require('../src/modules/charger/easee');
const model=require('../src/modules/charger/model');
const presentation=require('../src/modules/charger/presentation');
const registry=require('../src/modules/charger/registry');
const actions=require('../src/modules/charger/actions');
const {buildCubeConfig,validateCubeConfig}=require('../src/core/cube-config');
const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');
const wave=require('../src/core/energy-wave');

function fixture(index=1,now=Date.now()) {
    const prefix='charger_'+index,product='SYNTHETIC_'+index,device='device_'+index;
    const entities={status:'sensor.'+prefix+'_status',power:'sensor.'+prefix+'_power',session_energy:'sensor.'+prefix+'_energy',
        enabled:'switch.'+prefix+'_enabled',permanent_lock:'switch.'+prefix+'_permanent_lock',physical_lock:'binary_sensor.'+prefix+'_lock',
        online:'binary_sensor.'+prefix+'_online',current:'sensor.'+prefix+'_current',limit:'sensor.'+prefix+'_limit'};
    const item={type:'charger',name:'Charger '+index,entity:entities.status,provider:'easee',entities,discover:false};
    const hass={states:{},entities:{},services:{switch:{turn_on:{},turn_off:{}}},calls:[],callService:async(...args)=>hass.calls.push(args)};
    const stamp=new Date(now).toISOString();
    const values={status:['Charging'],power:['7.4','kW'],session_energy:['2.5','kWh'],enabled:['on'],permanent_lock:['off'],
        physical_lock:['off',null,'lock'],online:['on'],current:['16','A'],limit:['28','A']};
    for (const [role,id] of Object.entries(entities)) {
        const [state,unit,device_class]=values[role];
        hass.states[id]={entity_id:id,state,attributes:{id:product,...(unit?{unit_of_measurement:unit}:{}),...(device_class?{device_class}: {})},last_updated:stamp};
        hass.entities[id]={entity_id:id,device_id:device,platform:'easee',unique_id:product+'_'+easee.KEYS[role][1]};
    }
    return {hass,item,options:settings(item),entities,now};
}
function set(f,role,state,extra={}) { f.hass.states[f.entities[role]]={...f.hass.states[f.entities[role]],state,...extra}; }
function link(f,rows,stamp=new Date().toISOString()) {
    f.item.association={entity:'sensor.vehicle_links',charger_key:'charger_'+f.options.name.split(' ')[1],max_age:60};f.options=settings(f.item);
    f.hass.states['sensor.vehicle_links']={state:String(rows.length),attributes:{assignments:rows,updated_at:stamp}};
}
const assigned=(charger='charger_1',car='vehicle_a',car_name='Vehicle A')=>({charger,car,car_name,mode:'auto_assigned'});

test('Charger public Hub/Control/aggregate API compiles fixed slots with inert navigation',()=>{
    const f=fixture();
    for(const item of [f.item,{...f.item,type:'custom:honeycomb-persistent-control',module:'charger'}]){
        validateCubeConfig(item);const cube=buildCubeConfig(item,f.hass,0,1);
        assert.equal(cube.mode,'charger');assert.equal(cube.face_mode,'cell');assert.equal(cube.tap_action.action,'honeycomb-open-nested');
        assert.deepEqual(cube.menu.buttons.map(b=>[b.slot,b._charger_field]),[[1,'enabled'],[2,'permanent_lock'],[3,'session_energy'],[4,'vehicle'],[5,'current'],[6,'details']]);
        assert.equal(cube.menu.promoted_center._charger.entity,f.entities.status);assert.equal(cube.menu.idle_timeout,8000);
    }
    const aggregate=buildCubeConfig({type:'charging-hub',slot:0,chargers:[f.item]},f.hass);
    assert.equal(aggregate.mode,'charger-summary');assert.equal(aggregate.tap_action.action,'none');assert.equal(aggregate.menu,null);
    assert.equal(f.hass.calls.length,0);
});
test('schema rejects hypothetical roles, wrong writable domains, conflicting anchors and unsafe wave modes',()=>{
    for (const item of [{...fixture().item,provider:'invented'},{type:'charger'},
        {...fixture().item,entities:{enabled:'binary_sensor.lock'}},{...fixture().item,entities:{status:'sensor.other'}},
        {...fixture().item,association:{entity:'sensor.links',charger_key:'a',max_age:0}},
        {...fixture().item,entities:{fiction:'sensor.fake'}},{type:'charging-hub',chargers:[{type:'charging-hub',chargers:[]}]}]) assert.throws(()=>settings(item));
    for(const value of [null,[],1,{speed_mode:'fixed',max_power_w:1},{speed_mode:'power',cycle_ms:1200}])assert.throws(()=>waveOptions(value));
    assert.equal(waveOptions({cycle_ms:1200}).speed_mode,'fixed');
    assert.equal(waveOptions({speed_mode:'power',max_power_w:7400}).max_power_w,7400);
});
test('Easee normalization is exact across case, spaces, underscores, native numeric codes and transitional states',()=>{
    for(const [input,output] of [['Car disconnected','disconnected'],['Ready to charge','ready_to_charge'],['AWAITING_START','awaiting_start'],['Charging','charging'],[108,'paused_due_to_equalizer']])assert.equal(easee.normalize(input),output);
    for(const status of ['awaiting_start','completed','ready_to_charge','awaiting_authorization','awaiting_scheduled_start'])assert.equal(easee.connection(status),true);
    assert.equal(easee.connection('disconnected'),false);assert.equal(easee.connection('possibly charging'),null);
});
test('exact red > yellow > green > blue status rules and strict positive-power pulse gate',()=>{
    const f=fixture(),get=()=>model.state(f.hass,f.options);
    assert.equal(get().color,model.COLORS.connected);assert.equal(get().active,true);
    set(f,'power','0');assert.equal(get().active,false);
    set(f,'enabled','off');assert.equal(get().color,model.COLORS.disabled);
    set(f,'status','Error');assert.equal(get().color,model.COLORS.fault);
    set(f,'status','Car disconnected');set(f,'online','off');assert.equal(get().color,model.COLORS.fault);assert.equal(get().connected,null);
    set(f,'online','on');set(f,'enabled','on');assert.equal(get().color,model.COLORS.disconnected);assert.equal(get().vehicle,'No car');
    set(f,'status','Awaiting start');assert.equal(get().color,model.COLORS.connected);assert.equal(get().vehicle,'Car connected');assert.equal(get().active,false);
    for(const status of ['Paused','Suspended','Completed','offline','unavailable','unknown']){set(f,'status',status);set(f,'power','7.4');assert.equal(get().active,false,status);}
});
test('verified numeric values preserve W/kW and Wh/kWh; unavailable/stale/missing/future power never becomes zero',()=>{
    const f=fixture();assert.equal(model.state(f.hass,f.options).power.value,7400);
    const p=f.hass.states[f.entities.power];p.state='7400';p.attributes.unit_of_measurement='W';assert.equal(model.state(f.hass,f.options).power.value,7400);
    set(f,'session_energy','2500',{attributes:{unit_of_measurement:'Wh'}});assert.equal(model.state(f.hass,f.options).energy.value,2.5);
    set(f,'current','16000',{attributes:{unit_of_measurement:'mA'}});assert.equal(model.state(f.hass,f.options).current.value,16);
    for(const state of ['unavailable','unknown','','-1','NaN']){p.state=state;assert.equal(model.state(f.hass,f.options).power,null);}
    p.state='1';for(const last_updated of [undefined,new Date(Date.now()-301000).toISOString(),new Date(Date.now()+60000).toISOString()]){p.last_updated=last_updated;assert.equal(model.state(f.hass,f.options).power,null);}
    p.last_reported=new Date().toISOString();assert.equal(model.state(f.hass,f.options).power.value,1);
    p.attributes.unit_of_measurement='A';assert.equal(model.state(f.hass,f.options).power,null);
});
test('physical lock is HA LOCK-class inverted binary state and never proves cable connection or writability',()=>{
    const f=fixture();assert.equal(model.state(f.hass,f.options).locked,true);
    set(f,'physical_lock','on');assert.equal(model.state(f.hass,f.options).locked,false);
    set(f,'status','Car disconnected');assert.equal(model.state(f.hass,f.options).connected,false);
    delete f.options.entities.permanent_lock;assert.equal(model.writable(f.hass,model.state(f.hass,f.options),'permanent_lock'),false);
    set(f,'physical_lock','off',{attributes:{}});assert.equal(model.state(f.hass,f.options).locked,null);
});
test('optional vehicle feed is current, fresh, explicit and unambiguous; disconnect clears immediately',()=>{
    const f=fixture();link(f,[assigned()]);assert.equal(model.state(f.hass,f.options).vehicle,'Vehicle A');
    link(f,[assigned('charger_1','vehicle_b','Vehicle B')]);assert.equal(model.state(f.hass,f.options).vehicle,'Vehicle B');
    for(const rows of [[assigned(),assigned()],[assigned(),assigned('charger_2')],[{...assigned(),mode:'pending_match'}],[{...assigned(),car:undefined,lastAssignedCar:'vehicle_a'}],[]]){
        link(f,rows);assert.equal(model.state(f.hass,f.options).vehicle,'Car connected');
    }
    link(f,[assigned()],new Date(Date.now()-61000).toISOString());assert.equal(model.state(f.hass,f.options).vehicle,'Car connected');
    link(f,[assigned()],new Date(Date.now()+60000).toISOString());assert.equal(model.state(f.hass,f.options).vehicle,'Car connected');
    link(f,[assigned()]);set(f,'status','Car disconnected');assert.equal(model.state(f.hass,f.options).vehicle,'No car');
    set(f,'status','unknown');assert.notEqual(model.state(f.hass,f.options).vehicle,'No car');
    delete f.hass.states['sensor.vehicle_links'];set(f,'status','Charging');assert.equal(model.state(f.hass,f.options).vehicle,'Car connected');
});
test('explicit physical connection contradictions suppress pulse and never assert a particular car',()=>{
    const f=fixture();f.options.entities.connected='binary_sensor.connection_a';f.hass.states['binary_sensor.connection_a']={state:'off'};
    const value=model.state(f.hass,f.options);assert.equal(value.connected,null);assert.equal(value.active,false);assert.equal(model.writable(f.hass,value,'enabled'),false);
});
test('two chargers aggregate only unique verified measurements, count physical connections and preserve unknown partials',()=>{
    const a=fixture(),b=fixture(2);Object.assign(a.hass.states,b.hass.states);Object.assign(a.hass.entities,b.hass.entities);
    const options=settings({type:'charging-hub',chargers:[a.item,b.item,a.item]});
    let value=model.aggregate(a.hass,options);assert.equal(value.values.length,2);assert.equal(value.watts,14800);assert.equal(value.connected,2);assert.equal(value.complete,true);
    a.hass.states[b.entities.power].state='unavailable';value=model.aggregate(a.hass,options);assert.equal(value.watts,7400);assert.equal(value.complete,false);assert.equal(value.active,true);
    a.hass.states[b.entities.status].state='disconnected';value=model.aggregate(a.hass,options);assert.equal(value.connected,1);
    const empty=model.aggregate(a.hass,settings({type:'charging-hub',chargers:[]}));assert.equal(empty.watts,0);assert.equal(empty.complete,true);
    const one=fixture();delete one.hass.states[one.entities.power];const partial=presentation.resolve({hass:one.hass,config:buildCubeConfig({type:'charging-hub',chargers:[one.item]},one.hass)});assert.equal(partial.name,'— kW');
});
test('Easee discovery uses exact platform/device/unique keys; ambiguous and foreign capabilities fail closed',()=>{
    const f=fixture();const item={type:'charger',provider:'easee',entity:f.entities.status,name:'Charger 1'},options=settings(item);
    let mapped=easee.mapEntities(f.hass,options,registry.entries(f.hass));assert.equal(mapped.entities.enabled,f.entities.enabled);assert.equal(mapped.entities.permanent_lock,f.entities.permanent_lock);
    const duplicate={...f.hass.entities[f.entities.enabled],entity_id:'switch.duplicate'};
    mapped=easee.mapEntities(f.hass,options,[...registry.entries(f.hass),duplicate]);assert.equal(mapped.entities.enabled,undefined);assert.ok(mapped.issues.includes('ambiguous-enabled'));
    f.hass.entities[f.entities.enabled].device_id='foreign';const value=model.state(f.hass,f.options);assert.equal(value.entities.enabled,undefined);assert.equal(model.writable(f.hass,value,'enabled'),false);
    delete f.hass.entities[f.entities.enabled];f.hass.states[f.entities.enabled].attributes.id='OTHER';assert.equal(model.state(f.hass,f.options).entities.enabled,undefined);
});
test('generic explicit mapping works without registry access and does not discover by entity name',()=>{
    const f=fixture();f.item.provider='generic';f.options=settings(f.item);f.hass.entities={};assert.equal(model.state(f.hass,f.options).active,true);
    set(f,'status','3');const unknown=model.state(f.hass,f.options);
    assert.equal(unknown.active,false);assert.equal(unknown.connected,null);assert.equal(model.writable(f.hass,unknown,'enabled'),false);
    f.options.entities={status:f.entities.status};assert.deepEqual(model.state(f.hass,f.options).entities,{status:f.entities.status});
});
test('multi-entity dependencies ignore unrelated HA events and include associated feed, registry and switch services',()=>{
    const f=fixture();link(f,[assigned()]);const config=buildCubeConfig(f.item,f.hass),deps=presentationDependencies(config),before=presentationSnapshot(f.hass,deps);
    f.hass.states['sensor.unrelated']={state:'3'};assert.equal(presentationSnapshot(f.hass,deps),before);
    set(f,'power','5');assert.notEqual(presentationSnapshot(f.hass,deps),before);
    const after=presentationSnapshot(f.hass,deps);f.hass.states['sensor.vehicle_links'].attributes.assignments=[];assert.notEqual(presentationSnapshot(f.hass,deps),after);
});
test('all wave health is derived, speed/color settings are reused, and missing power cannot be forced active',()=>{
    const f=fixture(),config=buildCubeConfig({...f.item,energy_wave:{speed_mode:'power',max_power_w:7400,color:'#123456'}},f.hass);
    let view=presentation.resolve({hass:f.hass,config});assert.equal(view.name,'Car connected');assert.equal(view.secondary,'Charger 1');assert.equal(view.iconBadge,'7.4 kW');assert.equal(view.tertiary,null);
    assert.equal(wave.enabled(view.energyWave),true);assert.equal(view.energyWave.max_power_w,7400);assert.equal(view.energyWave.color,'#123456');
    set(f,'online','off');view=presentation.resolve({hass:f.hass,config});assert.equal(wave.enabled(view.energyWave),false);
    assert.equal(view.colors.inner,model.COLORS.fault);
});
test('only intentional verified switches execute once; commands wait for HA confirmation and isolate charger targets',async()=>{
    const f=fixture(),config=buildCubeConfig(f.item,f.hass).menu.buttons[0],notifications=[];
    const context={hass:f.hass,itemConfig:config,actionConfig:config.tap_action,notify:m=>notifications.push(m)};
    assert.equal(await actions.command(context),true);assert.deepEqual(f.hass.calls,[['switch','turn_off',{}, {entity_id:f.entities.enabled}]]);
    let value=model.state(f.hass,f.options);assert.equal(actions.recordFor(f.hass,value,'enabled').phase,'pending');
    assert.equal(await actions.command(context),false);assert.equal(f.hass.calls.length,1);
    set(f,'enabled','off');assert.equal(actions.recordFor(f.hass,value,'enabled'),null);
    set(f,'online','off');assert.equal(await actions.command(context),false);assert.equal(f.hass.calls.length,1);
    set(f,'online','on');context.isCurrent=()=>false;assert.equal(await actions.command(context),false);
});
test('swallowed integration errors, request rejection and wrong action-role cannot claim success or retry',async()=>{
    const f=fixture(),config=buildCubeConfig(f.item,f.hass).menu.buttons[1],context={hass:f.hass,itemConfig:config,actionConfig:config.tap_action,notify:()=>{}};
    await actions.command(context);const value=model.state(f.hass,f.options);
    assert.equal(actions.recordFor(f.hass,value,'permanent_lock',Date.now()+actions.ACK_MS+1).phase,'unconfirmed');assert.equal(f.hass.calls.length,1);
    f.hass.callService=async()=>{throw Error('private rejected message');};
    assert.equal(await actions.command(context),false);assert.equal(actions.recordFor(f.hass,value,'permanent_lock').phase,'failed');
    assert.equal(await actions.command({...context,actionConfig:{role:'enabled'}}),false);
});
test('registry reads deduplicate across faces and denial falls back; last-dispose and late responses are safe',async()=>{
    const f=fixture();let count=0,finish;f.hass.callWS=()=>{count++;return new Promise(r=>{finish=r;});};f.options.discover=true;
    const a=registry.observe(()=>{}),b=registry.observe(()=>{}),config={_charger:f.options};a.update(f.hass,config);b.update(f.hass,config);await Promise.resolve();assert.equal(count,1);
    a.dispose();b.dispose();finish([]);await new Promise(r=>setImmediate(r));assert.equal(registry.session(f.hass).listeners.size,0);
    f.hass.callWS=async()=>{throw Error('forbidden');};const c=registry.observe(()=>{});c.update(f.hass,config);await new Promise(r=>setImmediate(r));
    assert.equal(model.state(f.hass,f.options).entities.enabled,f.entities.enabled);c.dispose();
});
test('shared registry events survive first-face disposal and reconnect never resurrects pre-disconnect power',async()=>{
    const f=fixture(),connection=new EventTarget();connection.connected=true;f.hass.connection=connection;let reads=0;
    f.hass.callWS=async()=>{reads++;return Object.values(f.hass.entities);};f.options.discover=true;
    const a=registry.observe(()=>{}),b=registry.observe(()=>{});a.update(f.hass,{_charger:f.options});b.update(f.hass,{_charger:f.options});
    await new Promise(r=>setImmediate(r));assert.equal(reads,1);a.dispose();
    connection.connected=false;connection.dispatchEvent(new Event('disconnected'));assert.equal(model.state(f.hass,f.options).active,false);
    connection.connected=true;connection.dispatchEvent(new Event('ready'));await new Promise(r=>setImmediate(r));assert.equal(reads,2);
    registry.session(f.hass).measurementFloor=f.now+1;assert.equal(model.state(f.hass,f.options).active,false);
    set(f,'power','7.4',{last_updated:new Date(f.now+2).toISOString()});assert.equal(model.state(f.hass,f.options).active,true);
    b.dispose();assert.equal(registry.session(f.hass).listeners.size,0);assert.equal(registry.session(f.hass).detach,null);
});
test('read-only fields retain their physical meaning when optional capabilities are absent',()=>{
    const f=fixture();delete f.item.entities.session_energy;delete f.item.entities.current;delete f.item.entities.limit;delete f.item.entities.permanent_lock;
    const fields=buildCubeConfig(f.item,f.hass).menu.buttons.map(config=>presentation.resolve({config,hass:f.hass}));
    assert.equal(fields[1].secondary,'Locked');assert.equal(fields[1].tertiary,'Read-only');assert.equal(fields[1].disabled,true);
    assert.equal(fields[2].secondary,'Not mapped');assert.equal(fields[3].secondary,'Car connected');assert.equal(fields[4].secondary,'Not available');
});
test('same-device wrong-role switches and physical lock masquerading as presence are rejected',()=>{
    const f=fixture();assert.throws(()=>settings({...f.item,entities:{...f.item.entities,permanent_lock:f.entities.enabled}}));
    f.hass.entities[f.entities.permanent_lock].unique_id='SYNTHETIC_1_is_enabled';
    const value=model.state(f.hass,f.options);assert.equal(value.entities.permanent_lock,undefined);assert.equal(model.writable(f.hass,value,'permanent_lock'),false);
    f.options.entities.connected=f.entities.physical_lock;assert.equal(model.state(f.hass,f.options).entities.connected,undefined);
});
test('read-only and writable detail faces depend on relevant capabilities instead of every power update',()=>{
    const f=fixture(),fields=buildCubeConfig(f.item,f.hass).menu.buttons;
    const before=fields.map(c=>model.snapshot(f.hass,c));set(f,'power','5.2');
    const after=fields.map(c=>model.snapshot(f.hass,c));
    assert.deepEqual(after.map((v,i)=>v!==before[i]),[false,false,false,false,false,true]);
});

test('two-row overview keeps connection priority and fixed name; live power uses icon badge',()=>{
 const f=fixture(),config=buildCubeConfig(f.item,f.hass),view=()=>presentation.resolve({hass:f.hass,config});
 assert.equal(view().labelLayout,'two-row');assert.equal(view().secondary,'Charger 1');assert.equal(view().iconBadge,'7.4 kW');
 link(f,[assigned()]);config._charger=f.options;assert.equal(view().name,'Vehicle A');
 set(f,'enabled','off');assert.equal(view().name,'Disabled');assert.equal(view().iconBadge,undefined);
 set(f,'status','Error');assert.equal(view().name,'Fault');set(f,'online','off');assert.equal(view().name,'Offline');
 set(f,'online','on');set(f,'enabled','on');set(f,'status','Car disconnected');assert.equal(view().name,'No car');
 set(f,'status','unknown');assert.equal(view().name,'Status unknown');assert.equal(view().secondary,'Charger 1');
});
test('detail defaults are neutral, root status retained and explicit overrides remain renderer-owned',()=>{
    const f=fixture(),compiled=buildCubeConfig(f.item,f.hass),root=presentation.resolve({hass:f.hass,config:compiled});
    assert.equal(root.colors.inner,model.COLORS.connected);
    for(const config of compiled.menu.buttons){
        const view=presentation.resolve({hass:f.hass,config:{...config,colors:{inner_border:'#123456'}}});
        assert.equal(view.colors.inner,'#555b63');assert.equal(view.forceColors,undefined);
    }
});
