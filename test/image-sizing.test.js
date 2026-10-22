const {test}=require('node:test'),assert=require('node:assert/strict');
const {imageFrame,numericSize}=require('../src/core/image-sizing');
test('auto and omitted default to 82; every existing finite positive numeric size remains supported',()=>{
 for(const v of ['auto',undefined,82])assert.equal(numericSize(v),82);
 for(const v of [.1,41,60,100,123,1000,'60'])assert.equal(numericSize(v),Number(v));
 for(const v of [0,-1,NaN,Infinity,'responsive',null])assert.throws(()=>numericSize(v));
});
test('aspect-preserved natural image frame produces exact numeric scales',()=>{
 for(const scale of [.5,.75,1,1.5]){
  const f=imageFrame({width:800*scale,height:500*scale,naturalWidth:800,naturalHeight:500});
  assert.equal(f.scale,scale);assert.equal(f.x,0);assert.equal(f.y,0);
 }
});
test('contain letterboxing, cover cropping, object positions and nonuniform safe fallback',()=>{
 const input={width:600,height:600,naturalWidth:800,naturalHeight:400};
 assert.deepEqual(imageFrame({...input,fit:'contain'}),{scale:.75,width:600,height:300,x:0,y:150});
 assert.deepEqual(imageFrame({...input,fit:'cover'}),{scale:1.5,width:1200,height:600,x:-300,y:0});
 assert.equal(imageFrame({...input,fit:'contain',objectPosition:'left top'}).y,0);
 assert.equal(imageFrame({...input,fit:'cover',objectPosition:'100% 50%'}).x,-600);
 assert.equal(imageFrame({...input,fit:'fill'}),null);
 assert.equal(imageFrame({...input,fit:'contain',objectPosition:'right 10px bottom 20px'}),null);
 for(const v of [0,-1,NaN,Infinity])assert.equal(imageFrame({...input,width:v}),null);
});
test('display reference is stable across image resolutions and independent clients',()=>{
 const {effectiveSize,referenceWidth,DEFAULT_REFERENCE_WIDTH}=require('../src/core/image-sizing');
 assert.equal(DEFAULT_REFERENCE_WIDTH,1536);assert.equal(referenceWidth(),1536);
 for(const naturalWidth of [1500,3000,6000])for(const displayedWidth of [1500,750,1125,2250]){
  const frame=imageFrame({width:displayedWidth,height:displayedWidth*2/3,naturalWidth,naturalHeight:naturalWidth*2/3});
  assert.equal(effectiveSize(frame,1500),82*displayedWidth/1500);
 }
 assert.equal(effectiveSize({width:1536}),82);assert.equal(effectiveSize({width:768}),41);assert.equal(effectiveSize(null,1500),82);
 for(const value of [null,'1500',0,-1,NaN,Infinity,'HCJS: return 1500'])assert.throws(()=>referenceWidth(value));
});
