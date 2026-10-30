"""beta.2: real touch/hold, phone-safe Hub, Climate paint and live Sonos Join.
Browser plugin not available; installed Chromium, synthetic Home Assistant only.
"""
import argparse,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Cubes,Handler,CheckResult
from climate import SEED
from beta5 import FLOORPLAN

class Beta2(Cubes):
 def assert_visible_unique_cells(self,count):
  self.settle();self.assertEqual(self.controls().count(),count)
  for cell in self.controls().all():self.assertTrue(cell.is_visible())
 def cell(self,slot=0):return self.page.locator('honeycomb-menu-ng .center-item' if slot==0 else f'honeycomb-menu-ng [data-honeycomb-slot="{slot-1}"]')
 def config(self,**options):
  self.page.evaluate("pushState('light.zone_b','on',{brightness:180,rgb_color:[70,150,240],supported_color_modes:['hs']})")
  return {'logo':False,'size':41,'collapsible':options or True,'items':[{'type':'light','entity':'light.zone_a','slot':0},{'type':'light','entity':'light.zone_b','slot':2}]}
 def expand(self):self.hold_input(self.cell().locator('.interaction-surface'));self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'))
 def test_short_tap_hold_back_and_live_primary(self):
  self.hub(self.config());self.assert_visible_unique_cells(1);self.capture('hub-collapsed')
  self.activate(self.cell().locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.length'),1)
  self.expand();self.assertEqual(self.page.evaluate('calls.length'),1);self.assert_visible_unique_cells(2);self.capture('hub-expanded')
  if self.viewport['width']<500:
   self.assertTrue(self.page.locator('honeycomb-menu-ng').evaluate("e=>e.matches(':popover-open')"));self.assertGreater(self.cell().bounding_box()['width'],80)
  self.page.locator('.hub-collapse').click();self.settle();self.assert_visible_unique_cells(1);self.assertFalse(self.page.evaluate('hub._hubExpanded'))
  self.assertAlmostEqual(self.cell().bounding_box()['width'],41,delta=.2)
  self.page.evaluate("pushState('light.zone_a','off',{brightness:0})");self.settle();self.assertEqual(self.cell().locator('.secondary').inner_text(),'OFF')
 def test_bee_allocation_nested_back_timeout_and_cleanup(self):
  self.hub(self.config(expanded_center='bee',primary_slot=1,idle_timeout=2200));self.expand();self.assert_visible_unique_cells(3)
  self.hold_input(self.cell(1).locator('.interaction-surface'));self.settle();self.assertGreater(self.page.evaluate('hub._menuContext.stack.length'),0)
  self.back();self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assert_visible_unique_cells(3)
  self.page.wait_for_timeout(2400);self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assert_visible_unique_cells(1)
  self.expand();self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
 def test_floorplan_clipping_resize_rotation_and_backdrop(self):
  self.page.evaluate(FLOORPLAN,{**self.config(),'size':'auto','auto_reference_width':640});self.page.wait_for_function('hub._hubMenu?.isConnected')
  self.page.evaluate("floor.style.width='240px';floor.style.overflow='hidden';floor.style.transform='scale(.9)';imageHost.style.height='120px'");self.settle();self.expand()
  if self.viewport['width']<500:
   for width,height in [(320,568),(568,320),(390,844)]:
    self.page.set_viewport_size({'width':width,'height':height});self.page.wait_for_timeout(130);self.settle()
    for cell in self.controls().all():
     box=cell.bounding_box();self.assertGreaterEqual(box['x'],-1);self.assertGreaterEqual(box['y'],-1);self.assertLessEqual(box['x']+box['width'],width+1);self.assertLessEqual(box['y']+box['height'],height+1);self.assertGreaterEqual(box['width'],44)
   self.page.wait_for_timeout(600);self.page.mouse.click(5,5);self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'))
  else:self.back();self.settle()
  self.assert_visible_unique_cells(1)
 def test_configuration_conflicts_are_explicit(self):
  self.assertIn('conflict',self.page.evaluate('''config=>{try{makeHub(config);return ''}catch(e){return e.message}}''',self.config(expanded_center='bee',primary_slot=2)))
 def test_climate_neutral_functions_center_and_overrides(self):
  self.page.evaluate(SEED);self.hub({'logo':False,'items':[{'type':'climate','entity':'climate.room_a','slot':0}]});self.activate(self.cell().locator('.interaction-surface'));self.settle()
  for slot in range(1,7):
   self.assertEqual(self.cell(slot).locator('.hex-fill').get_attribute('fill'),'#202224');self.assertEqual(self.cell(slot).evaluate('e=>e._model.inner'),0)
  self.assertEqual(self.cell().locator('.hex-inner').get_attribute('fill'),'#ef8c2f');self.capture('climate-after')
  self.activate(self.cell(6).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)[3].entity_id'),'climate.room_a')
 def test_sonos_join_own_volume_live_content_and_source_gradient(self):
  self.sonos_open();self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.settle()
  self.assertEqual(self.cell(7).locator('.secondary').inner_text(),'20%');self.assertIn('Joined',self.cell(7).locator('.interaction-surface').get_attribute('aria-label'))
  self.page.evaluate("pushState('media_player.player_b','paused',{volume_level:.13,group_members:['media_player.player_a','media_player.player_b'],media_title:'Synthetic track'})");self.settle()
  self.assertEqual(self.cell(7).locator('.secondary').inner_text(),'13%');self.assertIn('Synthetic track',self.cell(7).locator('.interaction-surface').get_attribute('aria-label'))
  source=self.cell().evaluate('e=>e._model.colors');self.assertEqual(self.cell(7).evaluate('e=>e._model.colors'),source)
  self.capture('sonos-after');self.activate(self.cell(7).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)[0]'),'script')

 def test_multiple_hubs_keyboard_preview_and_reconfiguration(self):
  config=self.config();self.hub(config)
  self.page.evaluate("config=>{window.hubA=hub;makeHub({...config,collapsible:{expanded_center:'bee',primary_slot:1}});window.hubB=hub;window.hub=hubA}",config);self.settle()
  self.page.evaluate('hubA._expandHub()');self.settle();self.assertTrue(self.page.evaluate('hubA._hubExpanded'));self.assertFalse(self.page.evaluate('!!hubB._hubExpanded'))
  self.page.evaluate('hubA._collapseHub();hubB.remove()');self.settle()
  surface=self.cell().locator('.interaction-surface');surface.focus();surface.press('Shift+Enter');self.settle();self.assertTrue(self.page.evaluate('hubA._hubExpanded'))
  self.page.evaluate('hubA.setConfig({...hubA.config,collapsible:false})');self.settle();self.assertFalse(self.page.evaluate('hubA._hubExpanded'));self.assertEqual(self.page.locator('[popover]').count(),0);self.assert_visible_unique_cells(2)
  self.page.evaluate('hubA.preview=true');self.hold_input(surface);self.settle();self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_join_artwork_gradient_alpha_border_and_live_source_changes(self):
  self.station_hub({'colors':{'center':'#245678','inner_border':'rgba(120,80,200,.6)','outer_border':'#abcdef','fill_gradient':{'type':'radial','edge':'rgba(0,0,0,.4)'}},'border':{'inner_width':5,'outer_width':4}})
  self.hold_input(self.cell().locator('.interaction-surface'));self.settle();self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.settle()
  source=self.cell();room=self.cell(7)
  self.assertEqual(room.locator('.station-artwork').get_attribute('src'),source.locator('.station-artwork').get_attribute('src'))
  self.assertEqual(room.evaluate('e=>e._model.fill'),source.evaluate('e=>e._model.fill'));self.assertEqual(room.evaluate('e=>[e._model.inner,e._model.outer]'),source.evaluate('e=>[e._model.inner,e._model.outer]'))
  self.capture('sonos-artwork-after')
  self.page.evaluate("stationUpdate('playing',{media_content_id:'favorite_c'});pushState('media_player.player_b','idle',{volume_level:.07,group_members:['media_player.player_a','media_player.player_b']})");self.settle()
  self.page.wait_for_function("hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-slot=\"6\"]')._model.artwork?.url==='/station-c.svg'")
  self.assertEqual(room.locator('.secondary').inner_text(),'7%')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--bundle',type=Path,required=True);parser.add_argument('--button-card',type=Path,required=True);parser.add_argument('--evidence-dir',type=Path,required=True);parser.add_argument('--test-filter');args=parser.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as pw:
   Beta2.browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Beta2.url=f'http://127.0.0.1:{server.server_port}';Beta2.evidence=args.evidence_dir
   for width,height in [(1100,900),(390,844)]:
    Beta2.viewport={'width':width,'height':height};names=[n for n in Beta2.__dict__ if n.startswith('test_') and (not args.test_filter or args.test_filter in n)];result=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Beta2(n) for n in names));success=result.wasSuccessful() and success
   Beta2.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
