"""Browser plugin not available. Flow: minimal picture-elements -> tap/hold ->
center Back/timeout; P4 Join artwork/own volume; exact Climate deltas; keyboard focus.
Synthetic HA services only, never physical Android acceptance.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,CheckResult
from beta3_real_ha import Beta3
from beta5 import FLOORPLAN
from climate import SEED

class Beta4(Beta3):
 def cell(self,slot=0):return self.page.locator('honeycomb-menu-ng').first.locator('.center-item' if slot==0 else f'[data-honeycomb-slot="{slot-1}"]')
 def minimal(self,extra=None):
  self.page.evaluate("pushState('light.zone_b','on',{brightness:190,supported_color_modes:['brightness']})")
  config={'collapsible':True,'items':[{'type':'light','entity':'light.zone_a','slot':0},{'type':'light','entity':'light.zone_b','slot':2}],**(extra or {})}
  self.page.evaluate(FLOORPLAN,config);self.page.wait_for_function('hub._hubMenu?.isConnected')
  self.resize_floor(min(self.viewport['width']-32,1600));return config
 def resize_floor(self,width):
  self.page.evaluate('w=>{floor.style.width=w+"px";imageHost.style.height=w*.625+"px"}',width);self.page.wait_for_timeout(130);self.settle()
 def box(self):return self.cell().bounding_box()
 def expand(self):self.hold_input(self.cell().locator('.interaction-surface'));self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'))
 def test_minimal_defaults_short_press_hold_center_Back_and_timeout(self):
  self.page.clock.install();self.minimal();before=self.box();self.assertEqual(self.page.evaluate('hub.config.size'),'auto');self.assertEqual(self.controls().count(),1);self.assertLessEqual(before['width'],82.1);self.capture('minimal-collapsed')
  self.activate(self.cell().locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.length'),1);self.expand();self.page.clock.run_for(550);self.assertEqual(self.page.locator('.hub-collapse').count(),0);self.assertEqual(self.cell().evaluate('e=>e.config.tap_action.action'),'honeycomb-hub-collapse');self.capture('minimal-expanded-center-Back')
  if self.viewport['width']<=600:self.assertGreater(self.box()['width'],before['width']*2);self.assertTrue(self.page.locator('honeycomb-menu-ng').evaluate("e=>e.matches(':popover-open')"))
  self.activate(self.cell().locator('.interaction-surface'));self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),1)
  for k in ['x','y','width','height']:self.assertAlmostEqual(self.box()[k],before[k],delta=.15)
  self.capture('minimal-restored');self.expand();self.page.clock.run_for(30100);self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),1)
 def test_auto_cap_numeric_override_alias_optout_and_conflicts(self):
  self.minimal();self.resize_floor(2000);self.assertAlmostEqual(self.page.evaluate('hub.size'),82);self.capture('desktop-auto-cap-82')
  self.page.evaluate("()=>{window.plain=addOverlay({items:[{type:'light',entity:'light.zone_a'}]},'25%','50%');window.fixed=addOverlay({collapsible:true,size:110,items:[{type:'light',entity:'light.zone_a',slot:0}]},'75%','50%')}");self.settle();self.assertEqual(self.page.evaluate('plain.config.size'),82);self.assertAlmostEqual(self.page.evaluate('fixed.size'),110)
  self.page.evaluate('plain.remove();fixed.remove()');self.settle()
  for options in [{'small_screen':False},{'mobile':False},{'mobile':True},{'small_screen':True}]:
   self.page.evaluate('o=>hub.setConfig({...hub.config,collapsible:o})',options);self.resize_floor(min(self.viewport['width']-32,900));self.expand();self.page.wait_for_timeout(550)
   self.assertEqual(self.page.locator('honeycomb-menu-ng').first.evaluate("e=>e.matches(':popover-open')"),self.viewport['width']>600 or list(options.values())[0]);self.back();self.settle()
  errors=self.page.evaluate("()=>[()=>hub.setConfig({...hub.config,collapsible:{mobile:true,small_screen:false}}),()=>hub.setConfig({...hub.config,collapsible:true,items:[{type:'light',entity:'light.zone_a',slot:2}]})].map(f=>{try{f();return null}catch(e){return e.message}})");self.assertTrue(all(errors))
 def test_bee_nested_Back_rotation_edit_cleanup_no_clickthrough(self):
  self.minimal({'collapsible':{'expanded_center':'bee','primary_slot':1}});self.expand();self.page.wait_for_timeout(550);self.assertEqual(self.cell(1).evaluate('e=>e.config.entity'),'light.zone_a');self.hold_input(self.cell(1).locator('.interaction-surface'));self.settle();self.assertGreater(self.page.evaluate('hub._menuContext.stack.length'),0);self.page.keyboard.press('Escape');self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
  if self.viewport['width']<=600:
   for w,h in [(320,568),(568,320),(390,844)]:
    self.page.set_viewport_size({'width':w,'height':h});self.resize_floor(w-32)
    for c in self.controls().all():
     b=c.bounding_box();self.assertGreaterEqual(b['x'],-1);self.assertGreaterEqual(b['y'],-1);self.assertLessEqual(b['x']+b['width'],w+1);self.assertLessEqual(b['y']+b['height'],h+1);self.assertGreaterEqual(b['width'],44)
   self.page.mouse.click(4,4);self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0)
  else:self.back();self.settle()
  self.page.evaluate('hub.preview=true');self.hold_input(self.cell().locator('.interaction-surface'));self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0);self.page.evaluate('hub.preview=false');self.expand();self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng[popover]').count(),0)
 def test_Climate_absolute_delta_labels_exact_targets_and_unsupported_precision(self):
  self.page.evaluate(SEED);self.hub({'logo':False,'items':[{'type':'climate','entity':'climate.room_a','slot':0}]});self.activate(self.cell().locator('.interaction-surface'));self.settle()
  for slot,label in [(1,'+1.0°C'),(4,'−1.0°C'),(6,'+0.1°C'),(5,'−0.1°C')]:self.assertEqual(self.cell(slot).locator('.primary').inner_text(),label)
  self.capture('climate-delta-labels');self.activate(self.cell(1).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'temperature':22});self.page.evaluate("climateUpdate('climate.room_a',{temperature:22})");self.settle();self.activate(self.cell(6).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'temperature':22.1})
  self.page.evaluate("climateUpdate('climate.room_a',{temperature:22.1,target_temp_step:.5})");self.settle();self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.assertEqual(self.page.evaluate('calls.length'),2)
 def test_P4_two_rooms_artwork_own_volumes_pause_group_and_station_changes(self):
  self.page.route('**/station-a.svg',lambda route:route.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60"><rect width="80" height="60" fill="white"/><text x="40" y="42" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="bold" fill="#1746a2">P4</text></svg>'))
  self.sonos_open({**self.sonos_item(),'members':[{'entity':'media_player.player_b','name':'Room B'},{'entity':'media_player.player_c','name':'Room C'}]});self.page.evaluate("""pushStates([
   ['sensor.favorites','2',{items:{p4:'P4',other:'Other station'}}],['sensor.favorites_cache','1',{items:[{media_content_id:'p4',title:'P4',thumbnail:'/station-a.svg'},{media_content_id:'other',title:'Other station',thumbnail:'/station-c.svg'}]}],
   ['media_player.player_a','playing',{volume_level:.89,group_members:['media_player.player_a'],media_content_id:'other'}],
   ['media_player.player_b','playing',{friendly_name:'Room B',volume_level:.04,group_members:['media_player.player_b'],media_channel:'P4',media_content_id:'x-sonosapi-radio:synthetic'}],
   ['media_player.player_c','paused',{friendly_name:'Room C',volume_level:.01,group_members:['media_player.player_c'],media_channel:'P4',media_content_id:'x-sonosapi-radio:synthetic'}]])""")
  self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.page.wait_for_function("[...hub._hubMenu.shadowRoot.querySelectorAll('[data-honeycomb-slot]')].filter(e=>Number(e.dataset.honeycombSlot)>=6).every(e=>e._model.artwork)");self.settle()
  for slot,vol,status in [(7,'4%','Playing'),(8,'1%','Paused')]:
   c=self.cell(slot);self.assertEqual(c.locator('.secondary').inner_text(),vol);self.assertEqual(c.locator('.station-artwork').get_attribute('src'),'/station-a.svg');self.assertIn(status,c.locator('.interaction-surface').get_attribute('aria-label'));self.assertEqual(c.locator('.tertiary').count(),0)
  self.capture('Sonos-P4-unjoined-two-volumes')
  self.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,group_members:['media_player.player_a','media_player.player_b','media_player.player_c'],media_content_id:'p4'});for(const id of ['media_player.player_b','media_player.player_c'])pushState(id,hass.states[id].state,{...hass.states[id].attributes,group_members:['media_player.player_a','media_player.player_b','media_player.player_c']})");self.settle();self.assertTrue(self.cell(7).locator('.primary').inner_text().startswith('✓ '));self.assertEqual(self.cell(7).locator('.secondary').inner_text(),'4%');self.capture('Sonos-P4-joined-two-volumes')
  self.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,media_content_id:'other'})");self.settle();self.page.wait_for_function("hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-slot=\"6\"]')._model.artwork?.url==='/station-c.svg'");self.assertEqual(self.cell(7).locator('.secondary').inner_text(),'4%')
  self.page.evaluate("pushState('media_player.player_b','unavailable',{...hass.states['media_player.player_b'].attributes})");self.settle();self.assertEqual(self.cell(7).locator('.station-artwork').count(),0);self.assertEqual(self.cell(7).locator('.secondary').inner_text(),'Unavailable')
 def test_keyboard_hex_focus_pointer_cleanup_and_nested_return(self):
  self.page.evaluate(SEED);self.hub({'logo':False,'items':[{'type':'climate','entity':'climate.room_a','slot':0}]});self.page.keyboard.press('Tab');s=self.cell().locator('.interaction-surface');s.focus();self.assertEqual(s.evaluate('e=>getComputedStyle(e).outlineStyle'),'none');self.assertTrue(self.cell().evaluate("e=>e.hasAttribute('keyboard-focus')"));self.capture('keyboard-hex-focus');s.press('Enter');self.settle();self.page.keyboard.press('Tab');target=self.cell(1).locator('.interaction-surface');target.focus();self.assertTrue(self.cell(1).evaluate("e=>e.hasAttribute('keyboard-focus')"));self.activate(target);self.settle();self.assertFalse(self.cell(1).evaluate("e=>e.hasAttribute('keyboard-focus')"));self.assertEqual(target.evaluate('e=>getComputedStyle(e).outlineStyle'),'none');self.capture('pointer-no-rectangle');self.back();self.settle();self.page.keyboard.press('Tab');self.page.keyboard.press('Shift+Tab');self.cell().locator('.interaction-surface').focus();self.assertTrue(self.cell().evaluate("e=>e.hasAttribute('keyboard-focus')"));self.page.evaluate("document.body.style.background='#f4f5f7';document.body.style.setProperty('--primary-text-color','#14202b')");self.capture('keyboard-hex-focus-light-theme')

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=a.bundle.resolve();server.button=a.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as pw:
   Beta4.browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Beta4.url=f'http://127.0.0.1:{server.server_port}';Beta4.evidence=a.evidence_dir
   for width,height in [(1800,1100),(768,1024),(390,844)]:
    Beta4.viewport={'width':width,'height':height};names=[n for n in Beta4.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Beta4(n) for n in names));success=r.wasSuccessful() and success
   Beta4.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
