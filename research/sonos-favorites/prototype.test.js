const {test}=require('node:test');const assert=require('node:assert/strict');
const {createBrowser}=require('./prototype');
const {recognizedFavorite}=require('../../src/modules/sonos/station');
const map={'FV:2/57':'Station Alpha','FV:2/58':'Station Beta'};
function fixture(){const calls=[];const connection={sendMessagePromise:async request=>{calls.push(request);return request.media_content_type==='favorites'?{children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]}:{children:Object.entries(map).reverse().map(([id,title])=>({title,media_content_id:id,media_content_type:'favorite_item_id',thumbnail:`https://example.org/${id.endsWith('57')?'alpha':'beta'}.jpg`}))}}};return {connection,calls};}
test('official WS shape enriches FV identities and preserves map order',async()=>{
 const f=fixture(),items=await createBrowser()(f.connection,'media_player.player_a',map);
 assert.deepEqual(items.map(x=>x.media_content_id),Object.keys(map));assert.equal(f.calls.length,2);
 assert.deepEqual(f.calls[0],{type:'media_player/browse_media',entity_id:'media_player.player_a',media_content_type:'favorites',media_content_id:''});
 assert.ok(!JSON.stringify(f.calls).includes('play_media'));
 // Compatible with the existing cache schema and programme-channel recognizer.
 const hass={states:{'media_player.player_a':{state:'playing',attributes:{media_content_id:'x-sonosapi-hls:synthetic',media_channel:'Station Alpha · Programme A'}},'sensor.favorites_a':{attributes:{items:map}},'sensor.cache_a':{attributes:{items}}}};
 const config={entity:'media_player.player_a',_sonos:{favorites:'sensor.favorites_a',cache:'sensor.cache_a'}};
 assert.equal(recognizedFavorite(hass,config).id,'FV:2/57');
 hass.states['media_player.player_a'].attributes.media_channel='Unknown';assert.equal(recognizedFavorite(hass,config),null);
});
test('concurrent panels deduplicate; expiry, map changes, player and connections isolate',async()=>{
 let now=0;const browse=createBrowser({now:()=>now,ttl:100});const f=fixture();
 const [a,b]=await Promise.all([browse(f.connection,'media_player.player_a',map),browse(f.connection,'media_player.player_a',map)]);assert.equal(a,b);assert.equal(f.calls.length,2);
 await browse(f.connection,'media_player.player_a',map);assert.equal(f.calls.length,2);
 now=101;await browse(f.connection,'media_player.player_a',map);assert.equal(f.calls.length,4);
 await browse(f.connection,'media_player.player_a',{'FV:2/57':'Renamed'});assert.equal(f.calls.length,6);
 await browse(f.connection,'media_player.player_b',map);assert.equal(f.calls.length,8);
 const second=fixture();await browse(second.connection,'media_player.player_a',map);assert.equal(second.calls.length,2);
});
test('invalid image URLs degrade; duplicate IDs and malformed roots reject',async()=>{
 const f=fixture();f.connection.sendMessagePromise=async r=>r.media_content_type==='favorites'?{children:[{media_content_type:'favorites_folder',media_content_id:'radio'}]}:{children:[{media_content_id:'FV:2/57',media_content_type:'favorite_item_id',thumbnail:'javascript:alert(1)'}]};
 assert.equal((await createBrowser()(f.connection,'media_player.player_a',map))[0].thumbnail,null);
 f.connection.sendMessagePromise=async()=>({children:Array.from({length:9},()=>({}))});await assert.rejects(createBrowser()(f.connection,'media_player.player_a',map),/root/);
});
test('offline errors are not cached and no retry/polling/service call occurs',async()=>{
 const f=fixture(),browse=createBrowser();f.connection.sendMessagePromise=async r=>{f.calls.push(r);throw new Error('offline');};
 await assert.rejects(browse(f.connection,'media_player.player_a',map),/offline/);assert.equal(f.calls.length,1);
 await assert.rejects(browse(f.connection,'media_player.player_a',map),/offline/);assert.equal(f.calls.length,2);
});
test('bounded concurrent contexts fail closed, not unbounded panel browsing',async()=>{
 const c={sendMessagePromise:()=>new Promise(()=>{})};const browse=createBrowser({maxEntries:1});
 browse(c,'media_player.player_a',map);await assert.rejects(browse(c,'media_player.player_b',map),/budget/);
});
