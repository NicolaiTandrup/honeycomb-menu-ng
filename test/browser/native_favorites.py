"""Opt-in production Browse Media integration; synthetic HA/real Chromium.
Browser plugin not available. No actual Home Assistant or station network access.
"""
import argparse,threading,os,shutil,unittest,re,yaml,json
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,Cubes,CheckResult

class NativeFavorites(Cubes):
 def setUp(self):
  super().setUp()
  self.install_native()
 def install_native(self):
  self.page.evaluate('''()=>{
   window.browseCalls=[];window.browseMode='ok';window.browsePending=[];window.nativeThumb='/station-a.svg';
   window.installConnection=()=>{
    const connection=new EventTarget();connection.connected=true;
    connection.sendMessagePromise=async request=>{
     browseCalls.push(request);
     if(browseMode==='reject')throw new Error('Synthetic permission failure');
     if(browseMode==='hold')return new Promise(resolve=>browsePending.push(resolve));
     return request.media_content_type==='favorites'?{children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]}:
      {children:[{media_content_type:'favorite_item_id',media_content_id:'FV:2/57',title:'Station Alpha',thumbnail:nativeThumb},
       {media_content_type:'favorite_item_id',media_content_id:'FV:2/58',title:'Station Beta',thumbnail:'/station-c.svg'}]};
    };hass.connection=connection;return connection;
   };installConnection();
   hass.entities={'media_player.player_a':{platform:'sonos'},'media_player.player_b':{platform:'sonos'}};
   pushStates([
    ['sensor.favorites','2',{items:{'FV:2/57':'Station Alpha','FV:2/58':'Station Beta'}}],
    ['sensor.favorites_cache','0',{items:[]}],
    ['media_player.player_a','playing',{volume_level:.42,group_members:['media_player.player_a'],media_content_id:'x-sonosapi-hls:synthetic-stream-a',media_channel:'Station Alpha · Programme text'}],
    ['media_player.player_b','playing',{volume_level:.2,group_members:['media_player.player_b'],media_content_id:'x-rincon-mp3radio:synthetic-stream-b',media_channel:'Station Beta'}]
   ]);
  }''')
 def item(self,**extra):
  return {'type':'sonos','entity':'media_player.player_a','favorites_sensor':'sensor.favorites',**extra}
 def start(self,**extra):self.hub({'logo':False,'items':[self.item(**extra)]})
 def center(self):return self.page.locator('honeycomb-menu-ng .center-item')
 def image(self):return self.center().locator('.station-artwork')
 def wait_image(self,url='/station-a.svg'):
  self.page.wait_for_function('(url)=>hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork?.url===url',arg=url)
  self.assertTrue(self.image().is_visible())
 def open_main(self):self.hold_input(self.center().locator('.interaction-surface'));self.settle()
 def test_minimal_media_item_uses_native_sensor_default(self):
  self.page.evaluate("hass.states['sensor.sonos_favorites']=hass.states['sensor.favorites']")
  self.hub({'logo':False,'items':[{'type':'media','entity':'media_player.player_a'}]});self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  self.open_main();self.wait_image();self.capture('native-only-minimal-media')
 def test_documented_complete_hub_and_control_examples(self):
  root=Path(__file__).resolve().parents[2]
  self.page.evaluate("hass.states['sensor.favorites_a']=hass.states['sensor.favorites']")
  self.hub(yaml.safe_load((root/'examples/sonos-native-favorites.yaml').read_text()));self.wait_image()
  self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
  blocks=re.findall(r'```yaml\s*\n(.*?)```',(root/'docs/SONOS_NATIVE_FAVORITES.md').read_text(),re.S)
  self.page.evaluate('config=>makeControl(config)',yaml.safe_load(blocks[1]))
  self.page.wait_for_function("control._model.artwork?.url==='/station-a.svg'")
  self.assertTrue(self.page.locator('honeycomb-persistent-control .station-artwork').is_visible());self.capture('native-favorites-documented-control')
 def test_native_no_templates_both_surfaces_radio_actions_and_live_pause(self):
  self.page.evaluate("browseMode='hold'");self.start();self.page.wait_for_function('browseCalls.length===1');self.assertEqual(self.image().count(),0);self.capture('native-favorites-before')
  self.page.evaluate("browseMode='ok';browsePending.shift()({children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]})")
  self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),2);self.capture('native-favorites-launcher')
  self.open_main();self.wait_image();self.assertEqual(self.center().evaluate('el=>el._model.fill.center'),self.center().evaluate('el=>el._model.colors.inner'));self.capture('native-favorites-promoted')
  self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
  first=self.sonos_slot(7);self.assertTrue(first.locator('.station-artwork').is_visible());self.assertEqual(first.locator('.station-artwork').get_attribute('src'),'/station-a.svg')
  self.assertEqual(self.page.evaluate('browseCalls.length'),2);self.capture('native-favorites-radio')
  self.activate(first.locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','play_media',{'media_content_id':'FV:2/57','media_content_type':'favorite_item_id'},{'entity_id':'media_player.player_a'}])
  self.page.evaluate("pushState('media_player.player_a','paused',{volume_level:.42,group_members:['media_player.player_a'],media_content_id:'x-sonosapi-hls:synthetic-stream-a',media_channel:'Station Alpha · Programme text'})")
  self.wait_image();self.assertEqual(self.center().evaluate('el=>el._model.fill'),{'type':'solid','center':'#202224'});self.capture('native-favorites-paused')
 def test_legacy_sentinel_cache_is_ignored_and_removed_options_fail(self):
  self.page.evaluate("""()=>{
   const sentinel={state:'2',attributes:{items:[{media_content_id:'FV:2/57',media_content_type:'favorite_item_id',title:'Station Alpha',thumbnail:'/station-c.svg'}]}};
   hass.states['sensor.sonos_favorites_cache']=sentinel;hass.states['sensor.favorites_cache']=sentinel;
  }""")
  self.start();self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  self.open_main();self.wait_image();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
  self.assertEqual(self.sonos_slot(7).locator('.station-artwork').get_attribute('src'),'/station-a.svg');self.capture('native-only-sentinel-ignored')
  self.page.evaluate("hass.states['sensor.sonos_favorites_cache'].attributes.items[0].thumbnail='/station-full-bleed.svg';pushState('sensor.unrelated','1')")
  self.assertEqual(self.sonos_slot(7).locator('.station-artwork').get_attribute('src'),'/station-a.svg');self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  errors=self.page.evaluate("""()=>[ {favorites_cache_sensor:'sensor.sonos_favorites_cache'}, {favorites_browse:false} ].map(option=>{
   const control=document.createElement('honeycomb-persistent-control');try{control.setConfig({module:'sonos',entity:'media_player.player_a',...option});return 'accepted'}catch(error){return error.message}
  })""")
  self.assertTrue(all('Remove' in error or 'removed' in error for error in errors))
 def test_browse_failure_never_falls_back_to_cache_and_missing_map_never_browses(self):
  self.page.evaluate("hass.states['sensor.sonos_favorites_cache']={state:'2',attributes:{items:[{media_content_id:'FV:2/57',title:'Station Alpha',media_content_type:'favorite_item_id',thumbnail:'/station-c.svg'}]}};browseMode='reject'")
  self.start();self.page.wait_for_function('browseCalls.length===1');self.page.wait_for_timeout(200);self.assertEqual(self.image().count(),0)
  self.open_main();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle();self.assertEqual(self.sonos_slot(7).evaluate('el=>el._model.icon'),'mdi:radio')
  self.assertEqual(self.sonos_slot(7).evaluate('el=>el._model.name'),'Station Alpha')
  self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove();browseMode="ok";delete hass.states["sensor.favorites"]');self.start();self.page.wait_for_timeout(200);self.assertEqual(self.page.evaluate('browseCalls.length'),1);self.assertEqual(self.image().count(),0)
 def test_group_switch_pending_disposal_and_late_reply_do_not_reopen(self):
  self.page.evaluate("browseMode='hold'");self.start();self.page.wait_for_function('browseCalls.length===1');self.open_main()
  self.page.evaluate("pushState('media_player.player_a','playing',{volume_level:.42,group_members:['media_player.player_b','media_player.player_a']});pushState('media_player.player_b','playing',{volume_level:.2,group_members:['media_player.player_b','media_player.player_a'],media_content_id:'x-rincon-mp3radio:synthetic-b',media_channel:'Station Beta'})")
  self.page.wait_for_function('browseCalls.length===2');self.assertEqual(self.page.evaluate('browseCalls[1].entity_id'),'media_player.player_b')
  self.page.evaluate("browseMode='ok';browsePending[0]({children:[]});browsePending[1]({children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]})")
  self.wait_image('/station-c.svg');self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1)
  self.back();self.wait_image('/station-c.svg');self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
  self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()');self.page.wait_for_timeout(200);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
 def test_reconnect_reload_ttl_and_shared_multi_card_dedup(self):
  self.page.clock.install();self.start();self.page.clock.run_for(150);self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  self.page.evaluate("window.second=document.createElement('honeycomb-persistent-control');second.setConfig({module:'sonos',entity:'media_player.player_a',favorites_sensor:'sensor.favorites'});document.body.append(second)")
  self.page.clock.run_for(150);self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  self.page.evaluate("hass.connection.connected=false;hass.connection.dispatchEvent(new Event('disconnected'))");self.page.clock.run_for(150);self.assertEqual(self.image().count(),0)
  self.page.evaluate("hass.connection.connected=true;hass.connection.dispatchEvent(new Event('ready'))");self.page.clock.run_for(200);self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),4)
  self.page.evaluate("nativeThumb='/station-c.svg'");self.page.clock.run_for(300200);self.wait_image('/station-c.svg');self.assertEqual(self.page.evaluate('browseCalls.length'),6)
  # Reload owns no browser storage: a new connection must fetch again.
  self.page.reload();self.page.wait_for_function('window.ready');self.assertEqual(self.page.evaluate('hass.states["sensor.favorites_cache"].attributes.items'),[])
  self.install_native();self.start();self.page.clock.run_for(200);self.wait_image();self.assertEqual(self.page.evaluate('browseCalls.length'),2)
 def test_map_reorder_rename_ambiguity_live_station_switch_no_uri_guess(self):
  self.start();self.wait_image()
  self.page.evaluate("pushState('sensor.favorites','2',{items:{'FV:2/58':'Station Beta','FV:2/57':'Station Alpha'}})");self.page.wait_for_timeout(200);self.assertEqual(self.page.evaluate('browseCalls.length'),2)
  self.page.evaluate("pushState('media_player.player_a','playing',{volume_level:.42,group_members:['media_player.player_a'],media_content_id:'x-rincon-mp3radio:synthetic-b',media_channel:'Station Beta'})");self.wait_image('/station-c.svg')
  self.page.evaluate("pushState('media_player.player_a','playing',{group_members:['media_player.player_a'],media_content_id:'x-sonosapi-hls:unknown-stream',media_channel:'Unconfigured Station',media_title:'Station Alpha'})");self.assertEqual(self.image().count(),0)
  self.page.evaluate("pushState('sensor.favorites','2',{items:{'FV:2/57':'Station Alpha','FV:2/58':'Station Alpha'}});pushState('media_player.player_a','playing',{group_members:['media_player.player_a'],media_content_id:'x-sonosapi-hls:synthetic-a',media_channel:'Station Alpha'})")
  self.page.wait_for_timeout(250);self.assertEqual(self.image().count(),0);self.capture('native-favorites-ambiguous-fallback')
 def test_timeout_idle_close_and_late_response_never_create_ghost_menu(self):
  self.page.clock.install();self.page.evaluate("browseMode='hold'");self.start();self.page.clock.run_for(200)
  self.open_main();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.page.clock.run_for(9000)
  self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.image().count(),0)
  self.page.evaluate("browsePending[0]({children:[{media_content_type:'favorites_folder',media_content_id:'object.item.audioItem.audioBroadcast'}]})")
  self.page.clock.run_for(500);self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),1);self.assertEqual(self.page.evaluate('browseCalls.length'),1)
 def test_max_library_unrelated_state_updates_do_no_render_or_browse_work(self):
  self.page.evaluate("hass.states['sensor.favorites'].attributes.items={...hass.states['sensor.favorites'].attributes.items,...Object.fromEntries(Array.from({length:510},(_,i)=>['FV:2/'+(100+i),'Station '+i]))}")
  self.start();self.wait_image()
  metrics=self.page.evaluate('''async()=>{
   const proto=Object.getPrototypeOf(customElements.get('honeycomb-menu-ng-item').prototype),render=proto.render;
   let renders=0;proto.render=function(){renders++;return render.call(this)};
   try{const start=performance.now();for(let i=0;i<1000;i++)pushState('sensor.unrelated',String(i));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    return {renders,requests:browseCalls.length,elapsedMs:performance.now()-start};
   }finally{proto.render=render}
  }''')
  self.assertEqual(metrics['renders'],0);self.assertEqual(metrics['requests'],2);self.assertLess(metrics['elapsedMs'],2000)
  if self.evidence:(self.evidence/f'{self.viewport["width"]}-native-favorites-performance.json').write_text(json.dumps(metrics,indent=2))
 def test_broken_thumbnail_recovers_icon_on_both_surfaces_and_radio(self):
  # A served non-image body triggers img.onerror without an HTTP console error.
  self.page.evaluate("nativeThumb='/button-card.js'");self.start();self.page.wait_for_function('browseCalls.length===2');self.page.wait_for_timeout(200);self.assertEqual(self.image().count(),0)
  self.assertEqual(self.center().evaluate('el=>el._model.icon'),'mdi:speaker');self.open_main();self.page.wait_for_timeout(200);self.assertEqual(self.image().count(),0)
  self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle();first=self.sonos_slot(7);self.assertEqual(first.locator('.station-artwork').count(),0);self.assertEqual(first.evaluate('el=>el._model.name'),'Station Alpha');self.assertEqual(first.evaluate('el=>el._model.icon'),'mdi:radio');self.capture('native-favorites-broken-image-fallback')

def main():
 a=argparse.ArgumentParser();a.add_argument('--bundle',type=Path,required=True);a.add_argument('--button-card',type=Path,required=True);a.add_argument('--evidence-dir',type=Path,required=True);args=a.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   NativeFavorites.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);NativeFavorites.url=f'http://127.0.0.1:{server.server_port}';NativeFavorites.evidence=args.evidence_dir
   names=[n for n in NativeFavorites.__dict__ if n.startswith('test_')]
   for w,h in [(1100,900),(390,844)]:
    NativeFavorites.viewport={'width':w,'height':h};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(NativeFavorites(n) for n in names));success=r.wasSuccessful() and success
   NativeFavorites.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
