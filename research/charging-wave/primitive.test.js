const {test}=require('node:test'),assert=require('node:assert/strict');const {enabled}=require('./primitive');
test('wave requires actual fresh active delivery, never cable presence alone',()=>{
 const active={active:true,available:true,powerW:7200};assert.equal(enabled(active),true);
 for(const state of [{active:false},{available:false},{fault:true},{enabled:false},{powerW:0},{powerW:-1},{powerW:null},{powerW:'7200'},{powerW:NaN},{powerW:Infinity}])assert.equal(enabled({...active,...state}),false);
 assert.equal(enabled({connected:true,available:true,powerW:0}),false);
});
