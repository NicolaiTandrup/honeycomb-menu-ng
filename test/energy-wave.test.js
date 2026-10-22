const {test}=require('node:test'),assert=require('node:assert/strict');
const wave=require('../src/core/energy-wave');
const {buildCubeConfig,validateCubeConfig}=require('../src/core/cube-config');
const {presentationDependencies}=require('../src/core/presentation-dependencies');
test('wave only accepts explicit normalized healthy active positive finite power',()=>{
 const yes={active:true,available:true,fault:false,power_w:100};assert.equal(wave.enabled(yes),true);
 for(const partial of [{active:false},{available:false},{fault:true},{fault:undefined},{power_w:0},{power_w:-5},{power_w:NaN},{power_w:Infinity},{power_w:'100'},{enabled:false}])assert.equal(wave.enabled({...yes,...partial}),false);
 assert.equal(wave.enabled(null),false);
});
test('one shared normalized capability passes descriptor validation; templates update without static-entity assumptions',()=>{
 const value={active:true,available:true,fault:false,power_w:100};
 assert.deepEqual(buildCubeConfig({module:'generic',energy_wave:value},{states:{}}).energy_wave,value);
 for(const v of [false,value,{...value,active:'HCJS: return entity.attributes.active === true;'}])assert.doesNotThrow(()=>validateCubeConfig({energy_wave:v}));
 for(const v of [true,{},[],{...value,power_w:'100'},{...value,unknown:1}])assert.throws(()=>validateCubeConfig({energy_wave:v}));
 assert.equal(presentationDependencies({energy_wave:{...value,power_w:'HCJS: return Number(states["sensor.power_a"].state);'}}).wildcard,true);
});
test('power speed is continuous monotone and bounded, independently configured',()=>{
 let previous=Infinity;
 for(const power_w of [Number.MIN_VALUE,1,1000,7000,11000,19400,100000]){
  const t=wave.timing({speed_mode:'power',power_w,max_power_w:19400});
  assert.ok(t.cycleMs<=previous && t.cycleMs>=900 && t.cycleMs<=2200);previous=t.cycleMs;
 }
 assert.equal(wave.timing({speed_mode:'power',power_w:19400,max_power_w:19400}).cycleMs,900);
 assert.equal(wave.timing({speed_mode:'power',power_w:11000,max_power_w:11000}).cycleMs,900);
 assert.ok(wave.timing({speed_mode:'power',power_w:11000,max_power_w:19400}).cycleMs>900);
 assert.equal(wave.timing({speed_mode:'fixed',power_w:1000,cycle_ms:1400}).cycleMs,1400);
 assert.equal(wave.timing({power_w:1000}).cycleMs,3000);
});
test('speed schema validates static values and dynamic invalid settings fail closed',()=>{
 const base={active:true,available:true,fault:false,power_w:1000,speed_mode:'power',max_power_w:19400};
 for(const edit of [{max_power_w:0},{max_power_w:-1},{max_power_w:Infinity},{cycle_ms:1400},{min_cycle_ms:499},{max_cycle_ms:10001},{min_cycle_ms:2500,max_cycle_ms:2000},{speed_mode:'fast'},{max_power_w:undefined}]){
  assert.throws(()=>wave.validate({...base,...edit}));assert.equal(wave.timing({...base,...edit}),null);
 }
 for(const edit of [{max_power_w:'HCJS: return Number(entity.state);'},{min_cycle_ms:'[[[ return 900; ]]]'}])assert.doesNotThrow(()=>wave.validate({...base,...edit}));
 for(const power_w of [0,-1,NaN,Infinity,'1000'])assert.equal(wave.timing({...base,power_w}),null);
 for(const max_power_w of [null,'19400','900;animation:x',NaN])assert.equal(wave.timing({...base,max_power_w}),null);
 assert.throws(()=>wave.validate({...base,speed_mode:'fixed'}));
 assert.throws(()=>wave.validate({...base,min_cycle_ms:3000}));
});
