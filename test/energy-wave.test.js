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
