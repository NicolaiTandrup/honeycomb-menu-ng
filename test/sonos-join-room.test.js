const {test}=require('node:test');
const assert=require('node:assert/strict');
const {roomDetails,resolve}=require('../src/modules/sonos/join-presentation');
const source='media_player.room_a',room='media_player.room_b';
const make=(joined=false)=>({states:{[source]:{state:'playing',attributes:{volume_level:.89,media_channel:'Other station',group_members:joined?[source,room]:[source]}},[room]:{state:'playing',attributes:{friendly_name:'Room B',media_channel:'P4',media_title:'DR P4 — synthetic programme',media_content_id:'x-sonosapi-radio:synthetic',volume_level:.04,group_members:joined?[source,room]:[room]}}}});
const config={entity:room,name:'Room B',_sonos_join:{coordinator:source,script:'',nativeAllowed:true,source:{entity:source,mode:'sonos'}}};
test('HA-shaped room transport belongs to the room; 4 percent is independent of launcher/group volume',()=>{
 for(const joined of [false,true]){
  const hass=make(joined),face=resolve({hass,config});
  assert.equal(face.secondary,'Playing · 4%');assert.equal(face.tertiary,'P4 · DR P4 — synthetic programme');
  assert.equal(face.name.startsWith('✓ '),joined);assert.ok(!face.ariaLabel.includes('Other station'));assert.ok(!face.ariaLabel.includes('89%'));
  assert.equal(face.visualConfig,joined?config._sonos_join.source:null);
 }
});
test('member metadata wins over conflicting coordinator data and follows group/media transitions',()=>{
 const hass=make(true);
 for(const [state,label] of [['playing','Playing'],['paused','Paused'],['idle','Idle']]){
  hass.states[room].state=state;assert.equal(resolve({hass,config}).secondary,label+' · 4%');
 }
 hass.states[room].attributes.group_members=[room];hass.states[source].attributes.group_members=[source];
 hass.states[room].attributes.media_channel='Station B';hass.states[room].attributes.media_title='Track B';hass.states[room].attributes.volume_level=.17;
 const face=resolve({hass,config});assert.equal(face.secondary,'Idle · 17%');assert.equal(face.name,'Room B');assert.match(face.tertiary,/Station B/);
});
test('missing, zero, invalid and unavailable metadata are truthful, with no launcher fallback',()=>{
 const hass=make(true);hass.states[room].attributes={group_members:[source,room],volume_level:0};
 assert.equal(resolve({hass,config}).secondary,'Playing · 0%');assert.equal(resolve({hass,config}).tertiary,null);
 for(const volume of [undefined,null,NaN,Infinity,-.1,1.1,'0.04']){
  hass.states[room].attributes.volume_level=volume;assert.equal(roomDetails(hass,room).volumeText,null);assert.equal(resolve({hass,config}).secondary,'Playing · —');
 }
 for(const state of ['unknown','unavailable']){hass.states[room].state=state;hass.states[room].attributes.media_title='Stale title';assert.equal(resolve({hass,config}).secondary,'Unavailable');assert.equal(resolve({hass,config}).tertiary,null);}
 delete hass.states[room];assert.equal(resolve({hass,config}).secondary,'Unavailable');
});
