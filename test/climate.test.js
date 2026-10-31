const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildCubeConfig,validateCubeConfig}=require('../src/core/cube-config');
const {expandModuleMenu}=require('../src/core/module-menu');
const model=require('../src/modules/climate/model');
const actions=require('../src/modules/climate/actions');
const menus=require('../src/modules/climate/menus');
const registry=require('../src/core/ha-capability-registry');
const presentation=require('../src/modules/climate/presentation');
const entity='climate.room_a';
function fixture(extra={}){
 const connection=new EventTarget();connection.connected=true;
 const hass={connection,config:{unit_system:{temperature:'°C'}},entities:{},states:{[entity]:{entity_id:entity,state:'heat',attributes:{supported_features:1|8|16|32|512,temperature_unit:'°C',current_temperature:20.2,temperature:21,min_temp:7,max_temp:35,target_temp_step:.1,hvac_action:'heating',hvac_modes:['off','heat','cool','heat_cool'],fan_modes:['auto','low','high'],fan_mode:'auto',preset_modes:['eco','comfort'],preset_mode:'eco',swing_modes:['off','on'],swing_horizontal_modes:['off','on'],...extra}}},services:{climate:Object.fromEntries(['set_temperature','set_hvac_mode','set_preset_mode','set_fan_mode','set_swing_mode','set_swing_horizontal_mode'].map(x=>[x,{}])),switch:{turn_on:{},turn_off:{}}},calls:[]};
 hass.callService=async(...args)=>{hass.calls.push(args);};return hass;
}
function field(hass,slot=6,item={}){return buildCubeConfig({type:'climate',entity,...item},hass).menu.buttons.find(b=>b.slot===slot);}
function context(hass,item,action=item.tap_action){return {hass,itemConfig:item,actionConfig:action,isCurrent:()=>true,getHass:()=>hass,notify:()=>{}};}
function cleanup(hass){const s=registry.session(hass);if(s)for(const r of s.commands.values())clearTimeout(r.timer);}

test('Hub and Control share Climate menu, 82px pipeline and approved slots; opening performs no service',()=>{
 const h=fixture(),hub=buildCubeConfig({type:'climate',entity},h),control=buildCubeConfig({module:'climate',entity},h);
 assert.deepEqual(hub,control);assert.equal(hub.mode,'climate');assert.deepEqual(hub.menu.buttons.map(b=>b.slot),[1,2,3,4,5,6]);assert.equal(hub.menu.buttons[1].tap_action.view,'hvac');assert.equal(hub.menu.promoted_center.entity,entity);assert.equal(hub.menu.idle_timeout,8000);assert.equal(h.calls.length,0);
});
for(const [unit,step,target,min,max]of [['°C',.5,21,7,35],['°C',.1,20.2,16,30],['°C',1,20,7,35],['°F',1,70,45,95]])test('native unit and exact step '+unit+step,async()=>{
 const h=fixture({temperature_unit:unit,target_temp_step:step,temperature:target,min_temp:min,max_temp:max});const f=field(h,1);await actions.command(context(h,f));assert.equal(h.calls.length,1);assert.equal(h.calls[0][1],'set_temperature');assert.deepEqual(h.calls[0][3],{entity_id:entity});assert.ok(Math.abs(h.calls[0][2].temperature-(target+1))<1e-6);cleanup(h);
});
test('HA frontend fallback step is .5 C / 1 F; invalid units/bounds/features/services are read-only',()=>{
 for(const unit of ['°C','°F']){const h=fixture({temperature_unit:unit,target_temp_step:undefined});assert.equal(model.state(h,model.settings({entity})).step,unit==='°C'?.5:1);}
 for(const change of [{temperature_unit:'K'},{target_temp_step:0},{target_temp_step:null},{min_temp:null},{max_temp:undefined},{temperature:null},{supported_features:0}]){
  const h=fixture(change);assert.equal(model.state(h,model.settings({entity})).writable,false);
 }
 const h=fixture();delete h.services.climate.set_temperature;assert.equal(model.state(h,model.settings({entity})).writable,false);
});
test('min/max and range crossings do not emit writes; unknown values are not zero',async()=>{
 const h=fixture({temperature:35});await actions.command(context(h,field(h)));assert.equal(h.calls.length,0);
 const v=model.state(fixture({temperature:7}),model.settings({entity}));assert.equal(model.adjustment(v,-1),null);assert.equal(model.numeric(null),null);assert.equal(model.numeric('20bad'),null);
});
test('dual targets require explicit selection; only selected bound changes and both exact bounds are sent',async()=>{
 const h=fixture({supported_features:2,temperature:null,target_temp_low:18,target_temp_high:24});h.states[entity].state='heat_cool';
 let opened;const unbound=field(h);await actions.command({...context(h,unbound),openNested:m=>opened=m});assert.equal(h.calls.length,0);assert.equal(opened._climate_frame.view,'targets');
 const options=model.settings({entity}),f=menus.main(options,'low').buttons[5];await actions.command(context(h,f));assert.deepEqual(h.calls[0][2],{target_temp_low:18.1,target_temp_high:24});cleanup(h);
 assert.equal(model.adjustment({...model.state(h,options),low:24},1,'low'),null);
});
test('range choice is scoped to its frame and becomes inert after target capability changes',async()=>{
 const h=fixture();const f=menus.main(model.settings({entity}),'low').buttons[5];await actions.command(context(h,f));assert.equal(h.calls.length,0);
});
for(const kind of ['hvac','preset','fan','swing','horizontal'])test('exact advertised '+kind+' service/choice, removed choice rejected',async()=>{
 const h=fixture(),o=model.settings({entity}),v=model.state(h,o),menu=menus.build(o,v,kind),item=menu.buttons.at(-1);await actions.command(context(h,item));assert.equal(h.calls[0][1],model.CHOICES[kind][2]);assert.equal(h.calls[0][2][model.CHOICES[kind][3]],item._climate_choice);cleanup(h);
 h.calls=[];h.states[entity].attributes[model.CHOICES[kind][0]]=[];await actions.command(context(h,item));assert.equal(h.calls.length,0);
});
test('pending serializes presses; service success awaits HA state; acknowledged state allows next step',async()=>{
 const h=fixture(),f=field(h);await actions.command(context(h,f));await actions.command(context(h,f));assert.equal(h.calls.length,1);let v=model.state(h,f._climate);assert.equal(actions.recordFor(h,v).phase,'pending');h.states[entity].attributes.temperature=21.1;assert.equal(actions.recordFor(h,v),null);await actions.command(context(h,f));assert.equal(h.calls[1][2].temperature,21.2);cleanup(h);
});
test('failed/unconfirmed requests have clear state, no retry and no stale completion navigation',async()=>{
 const h=fixture(),f=field(h);let message;h.callService=async(...args)=>{h.calls.push(args);throw Error('synthetic failure');};await actions.command({...context(h,f),notify:m=>message=m});assert.equal(h.calls.length,1);assert.equal(actions.recordFor(h,model.state(h,f._climate)).phase,'failed');assert.match(message,/no automatic retry/);cleanup(h);
 const second=fixture();await actions.command(context(second,field(second)));const r=actions.recordFor(second,model.state(second,model.settings({entity})),Date.now()+20000);assert.equal(r.phase,'unconfirmed');assert.equal(second.calls.length,1);cleanup(second);
});
test('unavailable/disconnected/readonly and abandoned frames send no services',async()=>{
 for(const change of ['unavailable','disconnected','readonly','abandoned']){
  const h=fixture(),f=field(h);if(change==='unavailable')h.states[entity].state='unavailable';if(change==='disconnected')h.connection.connected=false;if(change==='readonly')f.interactive=false;
  await actions.command({...context(h,f),isCurrent:()=>change!=='abandoned'});assert.equal(h.calls.length,0);
 }
});
test('native Defrost wins without registry writes; explicit switch overrides and removes duplicate preset',()=>{
 const h=fixture({preset_modes:['normal','defrost','camp']}),o=model.settings({entity});let v=model.state(h,o);assert.equal(v.defrost.reason,'native_preset');assert.equal(v.defrost.entity,null);
 h.states['switch.defrost_a']={state:'off',attributes:{}};v=model.state(h,model.settings({entity,defrost_entity:'switch.defrost_a'}));assert.equal(v.defrost.entity,'switch.defrost_a');assert.deepEqual(v.choices.preset.values,['normal','camp']);assert.equal(v.defrost.writable,true);
});
test('explicit cross-device switch targets only that switch and never both preset and switch',async()=>{
 const h=fixture({preset_modes:['normal','defrost']});h.states['switch.defrost_a']={state:'off',attributes:{}};const options=model.settings({entity,defrost_entity:'switch.defrost_a'});const f=menus.build(options,model.state(h,options),'categories').buttons.find(b=>b._climate_role==='defrost');await actions.command(context(h,f));assert.deepEqual(h.calls,[['switch','turn_on',{}, {entity_id:'switch.defrost_a'}]]);cleanup(h);
});
test('read-only registry discovery is deduplicated and requires exact semantics/device/platform/config entry',async()=>{
 const h=fixture(),rows=[{entity_id:entity,device_id:'device_a',platform:'synthetic',config_entry_id:'entry_a'},{entity_id:'switch.defrost_a',device_id:'device_a',platform:'synthetic',config_entry_id:'entry_a',translation_key:'defrost'},{entity_id:'switch.named_defrost',device_id:'device_a',platform:'synthetic',config_entry_id:'entry_a',original_name:'Defrost'},{entity_id:'switch.other_vehicle',device_id:'device_b',platform:'synthetic',config_entry_id:'entry_a',translation_key:'defrost'}];let reads=0;h.callWS=async()=>{reads++;return rows;};h.states['switch.defrost_a']={state:'off',attributes:{}};
 const a=registry.observe(()=>{}),b=registry.observe(()=>{}),config={_climate:model.settings({entity})};a.update(h,config);b.update(h,config);await new Promise(r=>setTimeout(r,0));assert.equal(reads,1);assert.equal(model.state(h,config._climate).defrost.entity,'switch.defrost_a');assert.equal(h.calls.length,0);
 registry.session(h).entries.push({...rows[1],entity_id:'switch.duplicate'});registry.session(h).version++;assert.equal(model.state(h,config._climate).defrost.reason,'ambiguous');a.dispose();b.dispose();assert.equal(registry.session(h).listeners.size,0);assert.equal(registry.session(h).detach,null);
});
test('registry denial/missing metadata never falls back to friendly-name guessing; late discovery after disposal ignored',async()=>{
 const h=fixture();h.callWS=async()=>{throw Error('denied');};const observer=registry.observe(()=>{});observer.update(h,{_climate:model.settings({entity})});await new Promise(r=>setTimeout(r,0));assert.equal(model.state(h,model.settings({entity})).defrost.entity,null);observer.dispose();
 const other=fixture();let finish,notices=0;other.callWS=()=>new Promise(r=>finish=r);const ob=registry.observe(()=>notices++);ob.update(other,{_climate:model.settings({entity})});await new Promise(r=>setTimeout(r,0));ob.dispose();finish([]);await new Promise(r=>setTimeout(r,0));assert.equal(notices,0);
});
test('presentation preserves live temps/active status, skips unrelated snapshots, and shows unavailable truthfully',()=>{
 const h=fixture(),c=buildCubeConfig({type:'climate',entity},h);let p=presentation.resolve({hass:h,config:c});assert.equal(p.name,'20.2°C');assert.equal(p.secondary,'Set 21°C');assert.equal(p.active,true);
 const snap=model.snapshot(h,c);h.states['sensor.unrelated']={state:'1'};assert.equal(model.snapshot(h,c),snap);h.states[entity].attributes.current_temperature=20.3;assert.notEqual(model.snapshot(h,c),snap);
 h.states[entity].state='unavailable';p=presentation.resolve({hass:h,config:c});assert.equal(p.name,'Unavailable');assert.equal(p.active,false);
});
test('generic nested module expansion binds child entity, leaves ordinary menus untouched, and rejects invalid identity',()=>{
 const h=fixture();const menu=expandModuleMenu({module:'climate',entity,name:'Room A'},h);assert.equal(menu.entity,entity);assert.equal(menu.promoted_center._climate.entity,entity);assert.equal(menu.nested_expand,true);assert.equal(menu.persistent_center.mode,'climate');assert.equal(menu.persistent_center.tap_action.action,'honeycomb-back');assert.equal(h.calls.length,0);
 const ordinary={entity:'sensor.parent_a',buttons:[]};assert.equal(expandModuleMenu(ordinary,h),ordinary);assert.throws(()=>expandModuleMenu({module:'unknown',entity},h));assert.throws(()=>buildCubeConfig({type:'climate',entity:'sensor.wrong'},h));assert.throws(()=>buildCubeConfig({type:'climate',entity,defrost_entity:'light.wrong'},h));
});

test('HA acknowledgement wins over a late rejected transport response without false failure or retry',async()=>{
 const h=fixture(),f=field(h);let reject,notices=[];h.callService=(...args)=>{h.calls.push(args);return new Promise((_,fail)=>reject=fail);};
 const pending=actions.command({...context(h,f),notify:m=>notices.push(m)});h.states[entity].attributes.temperature=21.1;assert.equal(actions.recordFor(h,model.state(h,f._climate)),null);
 reject(Error('late transport rejection'));assert.equal(await pending,true);assert.deepEqual(notices,[]);assert.equal(h.calls.length,1);assert.equal(registry.session(h).commands.size,0);cleanup(h);
});
test('missing temperature cannot acknowledge a pending zero-degree target; real zero can',async()=>{
 const h=fixture({temperature:-.1,min_temp:-10,max_temp:20}),f=field(h);await actions.command(context(h,f));assert.deepEqual(h.calls[0][2],{temperature:0});h.states[entity].attributes.temperature=null;assert.equal(actions.recordFor(h,model.state(h,f._climate)).phase,'pending');h.states[entity].attributes.temperature=0;assert.equal(actions.recordFor(h,model.state(h,f._climate)),null);cleanup(h);
});

test('nested child presentation reuses compiled overrides without inheriting the parent or a recursive menu',()=>{
 const h=fixture(),menu=expandModuleMenu({module:'climate',entity,icon:'mdi:fan',colors:{inner_border:'#e040fb'},border:{inner_width:4}},h);
 for(const face of [menu.promoted_center,menu.persistent_center]){assert.equal(face.icon,'mdi:fan');assert.equal(face.colors.inner_border,'#e040fb');assert.equal(face.border.inner_width,4);assert.equal(face.entity,entity);assert.equal(face.menu,undefined);assert.equal(face.hold_action.view,'targets');}
 assert.equal(menu.persistent_center.tap_action.action,'honeycomb-back');assert.equal(h.calls.length,0);
});
for(const unit of ['°C','°F'])for(const step of [.1,.5,1])test('absolute delta labels, representability and exact service '+unit+step,async()=>{
 for(const [slot,delta] of [[1,1],[4,-1],[6,.1],[5,-.1]]){
  const h=fixture({temperature_unit:unit,target_temp_step:step,temperature:20,min_temp:0,max_temp:100}),f=field(h,slot);
  const p=presentation.resolve({hass:h,config:f});assert.equal(p.name,(delta>0?'+':'−')+Math.abs(delta).toFixed(1)+unit);
  const expressible=step===.1 || Math.abs(delta)===1;assert.equal(p.disabled,!expressible);
  await actions.command(context(h,f));assert.equal(h.calls.length,expressible?1:0);
  if(expressible)assert.deepEqual(h.calls[0][2],{temperature:20+delta});cleanup(h);
 }
});
test('absolute delta rejects off-grid target instead of rounding into a different action',()=>{
 const v=model.state(fixture({target_temp_step:.5,temperature:20.1}),model.settings({entity}));assert.equal(model.adjustment(v,1),null);
});
