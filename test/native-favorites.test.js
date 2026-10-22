const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createProvider,context,mergeItems} = require('../src/modules/sonos/native-favorites');
const {settings,recognizedFavorite} = require('../src/modules/sonos/station');
const {buildCubeConfig} = require('../src/core/cube-config');
const A='media_player.player_a', B='media_player.player_b';
const F='sensor.favorites_a', C='sensor.cache_a';
const id='FV:2/57', other='FV:2/58';
const drain=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
function clock() {
 let time=0,sequence=0;const jobs=new Map();
 return {now:()=>time,schedule:(fn,ms)=>{const key=++sequence;jobs.set(key,{fn,time:time+ms});return key;},unschedule:key=>jobs.delete(key),
  tick:async ms=>{const end=time+ms;await drain();for(;;){const next=[...jobs].filter(([,v])=>v.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];if(!next)break;time=next[1].time;jobs.delete(next[0]);next[1].fn();await drain();}time=end;await drain();},count:()=>jobs.size};
}
function fixture() {
 const connection=new EventTarget(),calls=[];
 const map={[id]:'Station Alpha',[other]:'Station Beta'};
 const leaves=()=>Object.entries(map).map(([id,title])=>({media_content_id:id,media_content_type:'favorite_item_id',title,thumbnail:'/station-'+(id==='FV:2/57'?'a':'c')+'.svg'}));
 const root={children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]};
 connection.connected=true;
 connection.sendMessagePromise=async request=>{calls.push(request);return request.media_content_type==='favorites'?root:{children:leaves()};};
 const hass={connection,states:{[A]:{state:'playing',attributes:{group_members:[A],media_content_id:'x-sonosapi-hls:synthetic',media_channel:'Station Alpha · Programme'}},
  [B]:{state:'playing',attributes:{group_members:[B]}},[F]:{state:'2',attributes:{items:map}}},entities:{[A]:{platform:'sonos'},[B]:{platform:'sonos'}}};
 const config={entity:A,_sonos:settings({entity:A,favorites_browse:true,favorites_sensor:F,favorites_cache_sensor:C})};
 const c=clock(),provider=createProvider({...c,debounce:5,ttl:1000,timeout:80,negativeTtl:200});
 let changes=0;const observers=[];
 const observe=(h=hass,conf=config)=>{let o; o=provider.observe(()=>{changes++;o.update(h,conf);});o.update(h,conf);observers.push(o);return o;};
 return {hass,config,c,provider,calls,connection,map,root,leaves,observe,changes:()=>changes,dispose:()=>observers.forEach(o=>o.dispose())};
}
test('opt-in only; strict boolean and both Hub/Control configuration carry native settings',()=>{
 assert.throws(()=>settings({favorites_browse:'true'}),/true or false/);
 for(const item of [{type:'sonos'},{module:'sonos'},{type:'media'}]) {
  const conf=buildCubeConfig({...item,entity:A,favorites_browse:true});
  assert.equal(conf._sonos.browse,true);assert.equal(conf.menu.promoted_center._sonos.browse,true);
  assert.equal(conf.menu.buttons[0].tap_action.honeycomb_nested_menu.buttons[0].mode,'sonos-favorite');
 }
 const f=fixture();delete f.config._sonos.browse;assert.equal(context(f.hass,f.config),null);f.observe();assert.equal(f.c.count(),0);f.dispose();
});
test('actual HA read-only folder shape, FV IDs, multiple consumers and safe station contract',async()=>{
 const f=fixture();for(let i=0;i<24;i++)f.observe();await f.c.tick(5);
 assert.deepEqual(f.calls,[{type:'media_player/browse_media',entity_id:A,media_content_type:'favorites',media_content_id:''},
  {type:'media_player/browse_media',entity_id:A,media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]);
 const {items}=f.provider.peek(f.hass,f.config);assert.deepEqual(items.map(v=>v.media_content_id),[id,other]);assert.ok(Object.isFrozen(items));
 // The strict existing recognizer consumes this exact schema. No invented URI.
 const h={states:{...f.hass.states,[C]:{state:'2',attributes:{items}}}};
 const cfg={...f.config,_sonos:{...f.config._sonos,browse:false}};
 assert.equal(recognizedFavorite(h,cfg).id,id);assert.equal(items[0].uri,undefined);
 assert.equal(f.changes(),24);f.dispose();assert.equal(f.c.count(),0);
});
test('TTL is one shared refresh; reorders reuse metadata, rename/deletion creates a fresh context',async()=>{
 const f=fixture(),o=f.observe();await f.c.tick(5);assert.equal(f.calls.length,2);
 f.hass.states[F].attributes.items={[other]:'Station Beta',[id]:'Station Alpha'};o.update(f.hass,f.config);await f.c.tick(5);assert.equal(f.calls.length,2);
 await f.c.tick(1000);assert.equal(f.calls.length,4);
 f.hass.states[F].attributes.items={[id]:'Station Renamed'};o.update(f.hass,f.config);assert.equal(f.provider.peek(f.hass,f.config).items.length,0);
 await f.c.tick(5);assert.equal(f.calls.length,6);f.dispose();
});
test('configured cache wins, missing fields are supplemented; duplicates stay ambiguous',()=>{
 const extra=[{media_content_id:id,media_content_type:'favorite_item_id',title:'Browse title',thumbnail:'/new.svg'}],map={[id]:'Station Alpha'};
 const primary=[{media_content_id:id,title:'Configured title',thumbnail:'/explicit.svg',uri:'synthetic:exact'}];
 assert.deepEqual(mergeItems(primary,extra,map),[{...primary[0],media_content_type:'favorite_item_id'}]);
 assert.equal(mergeItems([{media_content_id:id,thumbnail:'javascript:unsafe'}],extra,map)[0].thumbnail,'/new.svg');
 assert.deepEqual(mergeItems([primary[0],primary[0]],extra,map),[primary[0],primary[0]]);
});
test('a complete valid cache needs no browse; empty/unavailable cache may supplement',async()=>{
 const f=fixture();f.hass.states[C]={state:'2',attributes:{items:f.leaves()}};assert.equal(context(f.hass,f.config),null);
 f.observe();await f.c.tick(5);assert.equal(f.calls.length,0);
 f.hass.states[C].state='unavailable';const o=f.observe();await f.c.tick(5);assert.equal(f.calls.length,2);o.dispose();f.dispose();
});
test('no sensor, unavailable player, non-Sonos registry platform, invalid/huge maps and unknown groups never browse',async()=>{
 const mutations=[h=>delete h.states[F],h=>h.states[F].state='unavailable',h=>h.states[F].attributes.items={},
  h=>h.states[F].attributes.items={legacy_id:'Station Alpha'},h=>h.states[F].attributes.items=Object.fromEntries(Array.from({length:513},(_,i)=>['FV:2/'+i,'Station'])),
  h=>h.states[A].state='unavailable',h=>h.entities[A].platform='other',h=>delete h.states[A].attributes.group_members,
  h=>h.states[A].attributes.group_members=[B,A],h=>h.connection.connected=false];
 for(const mutate of mutations){const f=fixture();mutate(f.hass);f.observe();await f.c.tick(100);assert.equal(f.calls.length,0);f.dispose();}
});
test('verified follower targets coordinator; group switch cancels and rejects a late old result',async()=>{
 const f=fixture();f.hass.states[A].attributes.group_members=[B,A];f.hass.states[B].attributes.group_members=[B,A];
 let answer;f.connection.sendMessagePromise=request=>{f.calls.push(request);return new Promise(resolve=>answer=resolve);};
 const o=f.observe();await f.c.tick(5);assert.equal(f.calls[0].entity_id,B);
 f.hass.states[A].attributes.group_members=[A];f.hass.states[B].attributes.group_members=[B];o.update(f.hass,f.config);
 answer(f.root);await drain();assert.equal(f.provider.peek(f.hass,f.config).items.length,0);
 f.connection.sendMessagePromise=async request=>{f.calls.push(request);return request.media_content_type==='favorites'?f.root:{children:f.leaves()};};
 await f.c.tick(5);assert.equal(f.calls[1].entity_id,A);assert.equal(f.provider.peek(f.hass,f.config).items.length,2);f.dispose();
});
test('connection replacement and reconnect invalidate cache; late pre-restart replies are ignored',async()=>{
 const f=fixture(),o=f.observe();await f.c.tick(5);assert.equal(f.calls.length,2);
 f.connection.connected=false;f.connection.dispatchEvent(new Event('disconnected'));await drain();assert.equal(f.provider.peek(f.hass,f.config).status,'offline');
 await f.c.tick(2000);assert.equal(f.calls.length,2);
 f.connection.connected=true;f.connection.dispatchEvent(new Event('ready'));await f.c.tick(5);assert.equal(f.calls.length,4);
 const replacement=new EventTarget();replacement.connected=true;replacement.sendMessagePromise=f.connection.sendMessagePromise;f.hass.connection=replacement;
 o.update(f.hass,f.config);assert.equal(f.provider.peek(f.hass,f.config).items.length,0);await f.c.tick(5);assert.equal(f.calls.length,6);f.dispose();
});
test('disposal before debounce or during a pending request cancels ownership without ghost notifications',async()=>{
 const f=fixture(),o=f.observe();o.dispose();await f.c.tick(100);assert.equal(f.calls.length,0);
 let answer;f.connection.sendMessagePromise=()=>new Promise(resolve=>answer=resolve);const later=f.observe();await f.c.tick(5);later.dispose();
 answer(f.root);await f.c.tick(100);assert.equal(f.changes(),0);assert.equal(f.c.count(),0);f.dispose();
});
test('permission/schema/duplicate/oversize failures use bounded negative cache and disclose no private errors',async()=>{
 for(const failure of ['permission','schema','duplicate','large','folders']) {
  const f=fixture();f.connection.sendMessagePromise=async request=>{f.calls.push(request);
   if(failure==='permission')throw new Error('private token/URL must never escape');
   if(failure==='schema')return {children:'invalid'};
   if(failure==='folders')return {children:Array(9).fill(f.root.children[0])};
   return request.media_content_type==='favorites'?f.root:{children:failure==='large'?Array(513).fill(f.leaves()[0]):[f.leaves()[0],f.leaves()[0]]};};
  const o=f.observe();await f.c.tick(5);assert.equal(f.provider.peek(f.hass,f.config).status,'unavailable');const count=f.calls.length;
  for(let i=0;i<100;i++)o.update(f.hass,f.config);await f.c.tick(190);assert.equal(f.calls.length,count);
  assert.equal(f.provider.peek(f.hass,f.config).items.length,0);f.dispose();
 }
});
test('unsafe/missing artwork is sanitized, unknown IDs ignored and no arbitrary stream mapping is created',async()=>{
 const f=fixture();f.connection.sendMessagePromise=async request=>request.media_content_type==='favorites'?f.root:{children:[
  {...f.leaves()[0],thumbnail:'javascript:unsafe',uri:'x-rincon-mp3radio:untrusted'},
  {...f.leaves()[1],thumbnail:'//untrusted.invalid/image'},
  {media_content_id:'FV:unknown',media_content_type:'favorite_item_id',thumbnail:'/unknown.svg'}]};
 f.observe();await f.c.tick(5);const items=f.provider.peek(f.hass,f.config).items;assert.equal(items.length,2);assert.ok(items.every(v=>v.thumbnail===null));assert.ok(items.every(v=>v.uri===undefined));f.dispose();
});
test('timeout cannot accumulate more than two unresolved actual WS requests; reconnect restores the budget',async()=>{
 const f=fixture();f.connection.sendMessagePromise=request=>{f.calls.push(request);return new Promise(()=>{});};
 const o=f.observe();await f.c.tick(80);assert.equal(f.provider.peek(f.hass,f.config).status,'unavailable');
 for(let i=0;i<5;i++){await f.c.tick(201);o.update(f.hass,f.config);await f.c.tick(80);}
 assert.equal(f.calls.length,2);
 f.connection.dispatchEvent(new Event('disconnected'));f.connection.dispatchEvent(new Event('ready'));await f.c.tick(5);assert.equal(f.calls.length,3);f.dispose();
});
test('context budget caps active player/map combinations and per-connection isolation',async()=>{
 const f=fixture();const observers=[];
 for(let i=0;i<40;i++){
  const player='media_player.room_'+i;f.hass.states[player]={state:'idle',attributes:{group_members:[player]}};
  observers.push(f.observe(f.hass,{entity:player,_sonos:{...f.config._sonos,player}}));
 }
 await f.c.tick(5);assert.equal(f.calls.length,64); // 32 contexts, root + folder each.
 f.dispose();
 const another=fixture();another.observe();await another.c.tick(5);assert.equal(another.calls.length,2);another.dispose();
});
test('late response after HA restart never populates the new connection generation',async()=>{
 const f=fixture();let reply;
 f.connection.sendMessagePromise=request=>{f.calls.push(request);return new Promise(resolve=>reply=resolve);};
 f.observe();await f.c.tick(5);const stale=reply;
 f.connection.dispatchEvent(new Event('disconnected'));await drain();
 f.connection.sendMessagePromise=async request=>{f.calls.push(request);return request.media_content_type==='favorites'?f.root:{children:f.leaves().map(v=>({...v,thumbnail:'/fresh.svg'}))};};
 f.connection.dispatchEvent(new Event('ready'));await f.c.tick(5);
 stale({children:[]});await drain();assert.equal(f.provider.peek(f.hass,f.config).items[0].thumbnail,'/fresh.svg');assert.equal(f.calls.length,3);f.dispose();
});
test('presentation dependency includes Radio selected player, leader and native platform changes',()=>{
 const {presentationDependencies,presentationSnapshot}=require('../src/core/presentation-dependencies');const f=fixture();
 f.hass.states[A].attributes.group_members=[B,A];f.hass.states[B].attributes.group_members=[B,A];
 const deps=presentationDependencies({entity:F,mode:'sonos-favorite',_sonos:f.config._sonos}),before=presentationSnapshot(f.hass,deps);
 f.hass.states[B].attributes.media_channel='Changed';assert.notEqual(presentationSnapshot(f.hass,deps),before);
 const after=presentationSnapshot(f.hass,deps);f.hass.entities[A].platform='other';assert.notEqual(presentationSnapshot(f.hass,deps),after);
});
test('configured persistent entity override never browses the original item player',()=>{
 const f=fixture();const overridden={...f.config,entity:B};assert.equal(context(f.hass,overridden).coordinator,B);
 assert.equal(context(f.hass,{...f.config,mode:'sonos-favorite',entity:F}).coordinator,A);
});
