const {test}=require('node:test'),assert=require('node:assert/strict');
const g=require('../src/core/expanded-layout');
const {displayedRect}=require('../src/core/image-sizing');
const bee=require('../src/core/bee');
const layout=require('../src/core/layout');
const viewport={left:16,right:374,top:16,bottom:828};
const two={left:-1,right:.5,top:-1.44235,bottom:.57735};
test('asymmetric complete footprint is placed wholly below upper image at comfortable size',()=>{
 const r=g.place(two,viewport,{left:0,right:390,top:0,bottom:390});assert.equal(r.region.key,'below');assert.equal(r.size,100);assert.ok(g.fits(two,r.size,r,r.region));assert.ok(g.boundsAt(two,r.size,r).top>=402);assert.equal(r.x,195);
});
test('all four image-free regions are considered; tiny strips never win over readable fallback',()=>{
 for(const [image,key]of [[{left:0,right:390,top:420,bottom:844},'above'],[{left:0,right:150,top:0,bottom:844},'right'],[{left:240,right:390,top:0,bottom:844},'left']]){
  const r=g.place(two,viewport,image);assert.equal(r.region.key,key);assert.ok(g.fits(two,r.size,r,r.region));
 }
 const r=g.place({left:-1.5,right:1.5,top:-1.44,bottom:1.44},viewport,{left:0,right:390,top:0,bottom:800});assert.equal(r.region.key,'viewport');assert.equal(r.size,100);
});
test('actual slot footprint reuses shared center/position coordinates, including extended asymmetric rings',()=>{
 const menu={config:{},_computeCenterPosition:()=>layout.sceneCenter(3),buttons:Array(37),_computeButtonPosition:i=>layout.buttonPosition(i,{inner:true,outer:true,radius:3})};menu.buttons[36]={};
 const f=g.footprint(menu),c=menu._computeCenterPosition(),p=menu._computeButtonPosition(36);assert.ok(f.left<=p.x-c.x-.5);assert.ok(f.right>=p.x-c.x+.5);assert.ok(f.bottom>=p.y-c.y+.57735);assert.ok(f.left<=-.5 && f.right>=.5);
});
test('selected anchor wins by actual fit; constrained child uses root then safe fitting',()=>{
 const f={left:-1.5,right:1.5,top:-1.44,bottom:1.44},root={x:195,y:422};
 assert.equal(g.submenu(f,viewport,root,{x:195,y:200},100).reason,'selected');
 const r=g.submenu(f,viewport,root,{x:300,y:100},100);assert.equal(r.reason,'root');assert.deepEqual([r.x,r.y,r.size],[195,422,100]);
 const large={left:-3,right:3,top:-2,bottom:2};const shrink=g.submenu(large,viewport,root,{x:300,y:100},100);assert.equal(shrink.reason,'viewport');assert.ok(shrink.size<100);assert.ok(g.fits(large,shrink.size,shrink,viewport));
});
test('displayed image rectangle excludes contain letterboxes and clips cover outside its image/card box',()=>{
 const box={left:10,top:20,right:410,bottom:420};assert.deepEqual(displayedRect({x:0,y:100,width:400,height:200},box),{left:10,top:120,right:410,bottom:320});
 assert.deepEqual(displayedRect({x:-200,y:0,width:800,height:400},box,{left:0,top:0,right:300,bottom:500}),{left:10,top:20,right:300,bottom:420});assert.equal(displayedRect(null,box),null);
});
test('stable placement survives tiny viewport changes and keeps a useful previous region',()=>{
 const image={left:100,right:290,top:300,bottom:500},first=g.place(two,viewport,image);const next=g.place(two,{...viewport,right:375},image,100,first);assert.equal(next.region.key,first.region.key);assert.ok(g.fits(two,next.size,next,next.region));
});
test('one Bee preset keeps asset, default paint and live build version while contextual action changes',()=>{
 const normal=bee.descriptor(),back=bee.descriptor({}, {collapse:true});assert.deepEqual(normal.colors,back.colors);assert.equal(normal.tap_action.action,'honeycomb-bee-flap');assert.equal(back.tap_action.action,'honeycomb-hub-collapse');assert.equal(back.hold_action.action,'honeycomb-bee-flap');assert.equal(bee.asset,require('../src/brand/bee.generated').HONEYCOMB_BEE_PNG);assert.equal(typeof bee.version.text,'string');assert.ok(bee.REVEAL_MS>=3000);
 const explicit=bee.descriptor({colors:{center:'#123456'},border:{inner_width:7}});assert.equal(explicit.colors.center,'#123456');assert.equal(explicit.colors.fill_gradient,false);assert.equal(explicit.border.inner_width,7);
});
