const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settings,expandedAllocation,mobileGeometry}=require('../src/core/collapsible-hub');
const entry=(id,slot,mode='hard',visible=true)=>({id,slot,mode,visible});
test('collapse is opt-in and rejects ambiguous options',()=>{
 assert.equal(settings(undefined),null);assert.equal(settings(false),null);assert.equal(settings(true).idle_timeout,30000);
 for(const value of [null,[],{idle_timeout:0},{expanded_center:'other'},{expanded_center:'bee'},{expanded_size:0},{mobile:'yes'},{unknown:true}])assert.throws(()=>settings(value),/collapsible|Invalid/);
});
test('bee reserves center, rejects hard collisions even hidden, preserves priority/soft allocation',()=>{
 const primary=entry('primary',0),entries=[primary,entry('hard',2),entry('priority',1,'priority'),entry('soft',0,'soft')];
 const result=expandedAllocation(entries,primary,settings({expanded_center:'bee',primary_slot:1}));
 assert.equal(result.placements.get('primary'),1);assert.equal(result.placements.get('hard'),2);assert.equal(result.placements.get('priority'),3);assert.equal(result.placements.get('soft'),4);
 for(const visible of [true,false])assert.throws(()=>expandedAllocation([primary,entry('occupied',1,'hard',visible)],primary,settings({expanded_center:'bee',primary_slot:1})),/conflict/);
 assert.equal(expandedAllocation(entries,primary,settings(true)).placements.get('primary'),0);
});
test('phone geometry fits both orientations without changing configured source size',()=>{
 const menu={sizes:{item:41,containerWidth:205,containerHeight:189.83}};
 for(const [width,height] of [[320,568],[390,844],[568,320]]){
  const result=mobileGeometry(menu,{width,height,offsetLeft:0,offsetTop:0});
  assert.ok(result.size>=44);assert.ok(result.size*5<=width-32);assert.ok(result.size*4.63<=height-32+.01);
 }
 const safe=mobileGeometry(menu,{width:568,height:320,offsetLeft:5,offsetTop:8},100,{left:44,right:44,bottom:21});
 assert.ok(safe.size*5<=568-120);assert.ok(safe.size*4.63<=320-53+.01);
 assert.equal(menu.sizes.item,41);
});
test('small_screen defaults on; legacy alias and conflicts are explicit',()=>{
 assert.equal(settings(true).small_screen,true);
 for(const v of [true,false]){
  assert.equal(settings({small_screen:v}).small_screen,v);assert.equal(settings({mobile:v}).small_screen,v);
  assert.equal(settings({mobile:v,small_screen:v}).small_screen,v);
  assert.throws(()=>settings({mobile:v,small_screen:!v}),/Conflicting/);
 }
 for(const v of [null,0,'true'])assert.throws(()=>settings({small_screen:v}));
});
