const {test}=require('node:test'),assert=require('node:assert/strict');
const {channels,darken,resolveFill,validateGradient,artworkLayout}=require('../src/core/cube-presentation');
const light=require('../src/modules/light/presentation'),media=require('../src/modules/media/presentation');
const colors={center:'#202224',inner:'hsl(120, 85%, 55%)',outer:'#34383d'};
test('active default center equals resolved inner, edge darker, independent outer',()=>{
 const fill=resolveFill({colors,active:true});assert.equal(fill.type,'radial');assert.equal(fill.center,colors.inner);assert.equal(fill.edge,darken(colors.inner));assert.equal(colors.outer,'#34383d');
 for(const color of ['#abc','#12abef','rgb(12, 34, 56)','hsl(360, 85%, 55%)'])assert.ok(channels(color));
 assert.deepEqual(channels(darken('#ff8000',.2)),[204,102,0]);assert.deepEqual(channels(darken('#ff8000')),[153,77,0]);assert.equal(darken('var(--status)'),null);
});
test('inactive/off/paused/disabled remain solid even with retained accent',()=>{
 for(const value of [{active:false},{active:true,disabled:true},{active:false,gradient:{type:'radial'}}])assert.deepEqual(resolveFill({colors,...value}),{type:'solid',center:colors.center});
});
test('explicit legacy center/background and solid choices take precedence; explicit radial deliberate',()=>{
 for(const value of [{explicitCenter:true},{customBackground:true},{gradient:false},{gradient:'solid'},{gradient:{type:'solid'}}])assert.equal(resolveFill({colors,active:true,...value}).type,'solid');
 assert.deepEqual(resolveFill({colors,active:true,gradient:{type:'radial',edge:'#111111'}}),{type:'radial',center:colors.inner,edge:'#111111'});
 assert.equal(resolveFill({colors,active:true,explicitCenter:true,gradient:{type:'radial'}}).center,colors.center);
});
test('validated options and bounded artwork keep stable text zones',()=>{
 for(const x of [undefined,false,'solid',{type:'radial',darken:0},{type:'radial',edge:'#111111',darken:.4},{type:'solid'}])validateGradient(x);
 for(const x of [true,[],{type:'linear'},{type:'radial',darken:1},{type:'radial',edge:5},{type:'radial',unknown:1}])assert.throws(()=>validateGradient(x));
 assert.deepEqual(artworkLayout({primary:false,secondary:true}),{width:'62%',left:'19%',top:'14%',height:'48%'});
 const a=artworkLayout({scale:100,offsetX:100,offsetY:-100});assert.equal(a.top,'15%');assert.ok(parseFloat(a.width)<=65.1);
});
test('modules provide semantics, not retained-color guesses',()=>{
 const config={},runtime={};assert.equal(light.resolve({config,state:{state:'on',attributes:{}},runtime}).active,true);
 assert.equal(light.resolve({config,state:{state:'off',attributes:{}},runtime}).active,false);
 assert.equal(media.resolve({config,state:{state:'playing',attributes:{}}}).active,true);
 assert.equal(media.resolve({config,state:{state:'paused',attributes:{}}}).active,false);
 assert.notEqual(media.resolve({config,state:{state:'unavailable'}}).active,true);
});

test('modern CSS color fallback handles named/variable status colors without DOM reads',()=>{
 const named={...colors,inner:'var(--status-accent, lime)'};
 assert.equal(resolveFill({colors:named,active:true}).type,'solid');
 assert.equal(resolveFill({colors:named,active:true,colorMix:true}).edge,'color-mix(in srgb, var(--status-accent, lime) 60%, black)');
});

test('decorative logo uses its own fill gradient while inactive physical cubes stay solid',()=>{
 assert.deepEqual(resolveFill({colors,decorative:true,explicitCenter:true,gradient:{type:'radial'}}),{type:'radial',center:colors.center,edge:darken(colors.center)});
 assert.equal(resolveFill({colors,decorative:true,gradient:false}).type,'solid');
 assert.equal(resolveFill({colors,decorative:false,active:false}).type,'solid');
});

test('built-in preset and Radio dimensions use the existing numeric size variable',()=>{
 const {designLength}=require('../src/core/cube-presentation');
 assert.equal(designLength(11),'calc(var(--honeycomb-persistent-size,82px) / 82 * 11)');
 const controls=require('../src/modules/light/controls');
 const menu={entity:'light.zone_a',buttons:[{control:'preset-brightness'}]};
 controls.applyPresetControls(menu,{},'light.zone_a');
 assert.ok(JSON.stringify(menu.buttons[0].styles).includes(designLength(22)));
});
