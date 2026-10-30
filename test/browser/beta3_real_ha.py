"""beta.3 owner-reported regression classes; no live HA/device acceptance.
Browser plugin absent: repository Playwright, synthetic HA-shaped attributes.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Cubes,Handler,CheckResult
from beta5 import FLOORPLAN
from climate import SEED

class Beta3(Cubes):
 def cell(self,slot=0):return self.page.locator('honeycomb-menu-ng .center-item' if slot==0 else f'honeycomb-menu-ng [data-honeycomb-slot="{slot-1}"]')
 def setup_floor(self,policy='bee',wide_host=False):
  self.page.evaluate("pushState('light.zone_b','on',{brightness:190,rgb_color:[70,150,240],supported_color_modes:['hs']})")
  config={'size':'auto','auto_reference_width':1200,'logo':False,'collapsible':{'expanded_center':policy,'primary_slot':1,'mobile':True,'expanded_size':100,'idle_timeout':30000},'items':[{'type':'light','entity':'light.zone_a','slot':0},{'type':'light','entity':'light.zone_b','slot':2}]}
  self.page.evaluate(FLOORPLAN,config);self.page.wait_for_function('hub._hubMenu?.isConnected')
  self.page.evaluate("()=>{floor.style.width=Math.min(innerWidth-30,900)+'px';imageHost.style.height=Math.min(innerWidth-30,900)*.625+'px';window.reference=addOverlay({type:'custom:honeycomb-persistent-control',module:'light',entity:'light.zone_a',size:'auto',auto_reference_width:1200},'75%','65%');}")
  if wide_host:self.page.evaluate("hub.style.width='82px';floor.style.transform='translate(0px,0px)'")
  self.page.wait_for_timeout(150);self.settle()
 def measure(self):return self.page.evaluate("()=>({size:hub.size,menu:hub._hubMenu.sizes.item,anchor:hub.getBoundingClientRect().toJSON(),center:hub._hubMenu.shadowRoot.querySelector('.center-item').getBoundingClientRect().toJSON(),reference:reference.getBoundingClientRect().toJSON()})")
 def assert_collapsed(self):
  value=self.measure();self.assertAlmostEqual(value['center']['width'],value['reference']['width'],delta=.12)
  for axis,dimension in [('x','width'),('y','height')]:self.assertAlmostEqual(value['center'][axis]+value['center'][dimension]/2,value['anchor'][axis]+value['anchor'][dimension]/2,delta=.5)
  self.assertEqual(self.page.locator('honeycomb-menu-ng :is(honeycomb-menu-ng-item,honeycomb-persistent-control)').count(),1);self.assertFalse(self.page.locator('honeycomb-menu-ng').evaluate("e=>e.matches(':popover-open')"));return value
 def test_owner_1200_reference_both_policies_before_expand_after_Back(self):
  for policy in ['primary','bee']:
   self.setup_floor(policy,True);before=self.assert_collapsed();self.capture('collapsed-'+policy)
   self.hold_input(self.cell().locator('.interaction-surface'));self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('expanded-'+policy)
   if self.viewport['width']<500:self.assertGreaterEqual(self.cell().bounding_box()['width'],80)
   self.page.wait_for_timeout(550);self.page.locator('.hub-collapse').click();self.settle();after=self.assert_collapsed();self.assertAlmostEqual(after['center']['width'],before['center']['width'],delta=.12);self.capture('collapsed-again-'+policy)
   for axis in ['x','y']:self.assertAlmostEqual(after['center'][axis],before['center'][axis],delta=.15)
   self.page.evaluate('hub.remove();reference.remove();floor.remove();calls.length=0')
 def test_resize_while_expanded_then_rotation_and_timeout_restore_current_auto_size(self):
  self.page.clock.install();self.setup_floor();self.hold_input(self.cell().locator('.interaction-surface'));self.settle()
  for width,height in ([(568,320),(320,568),(390,844)] if self.viewport['width']<500 else [(1200,900),(1100,900)]):
   self.page.set_viewport_size({'width':width,'height':height});self.page.evaluate("floor.style.width=Math.min(innerWidth-30,900)+'px';imageHost.style.height=Math.min(innerWidth-30,900)*.625+'px'");self.page.wait_for_timeout(150);self.settle()
   if width<=600:
    self.assertGreaterEqual(self.cell().bounding_box()['width'],44)
    for cell in self.page.locator('honeycomb-menu-ng :is(honeycomb-menu-ng-item,honeycomb-persistent-control)').all():
     box=cell.bounding_box();self.assertGreaterEqual(box['x'],-1);self.assertGreaterEqual(box['y'],-1);self.assertLessEqual(box['x']+box['width'],width+1);self.assertLessEqual(box['y']+box['height'],height+1)
  self.page.clock.run_for(30100);self.settle();self.assert_collapsed();self.capture('collapsed-after-timeout');self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_preview_multiple_hubs_and_removed_overlay_cleanup(self):
  self.setup_floor();self.page.evaluate("window.other=addOverlay({...hub.config,items:[{type:'light',entity:'light.zone_b',slot:0}]},'25%','50%')");self.settle()
  self.page.evaluate('hub.preview=true');self.hold_input(self.page.locator('honeycomb-menu-ng').first.locator('.center-item .interaction-surface'));self.settle();self.assertFalse(self.page.evaluate('!!hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0)
  self.page.evaluate('hub.preview=false;hub._expandHub()');self.settle();self.assertFalse(self.page.evaluate('!!other._hubExpanded'));self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng[popover]').count(),0)
 def test_climate_shared_neutral_pixel_reference_and_explicit_overrides(self):
  self.page.evaluate(SEED);self.hub({'logo':False,'items':[{'type':'climate','entity':'climate.room_a','slot':0}]});self.activate(self.cell().locator('.interaction-surface'));self.settle()
  expected=self.page.evaluate("()=>{const el=document.createElement('honeycomb-menu-ng-item');el.config={mode:'generic',_submenu:true,icon:'mdi:circle',border:{inner_width:0},interactive:false};el.size=82;el.hass=hass;el.style.cssText='position:absolute;left:30px;top:600px';document.body.append(el);window.neutralReference=el;return el._model.colors.center}")
  self.assertEqual(expected,'rgba(52, 66, 78, 0.94)')
  for slot in range(1,7):self.assertEqual(self.cell(slot).locator('.hex-fill').get_attribute('fill'),expected);self.assertEqual(self.cell(slot).evaluate('e=>e._model.inner'),0);self.assertEqual(self.cell(slot).locator('.hex-outer').get_attribute('fill'),'#34383d')
  # Compare a paint-only interior point, away from icon/text, after alpha compositing.
  from PIL import Image
  import io
  shot=Image.open(io.BytesIO(self.page.screenshot())).convert('RGB')
  def pixel(locator):
   box=locator.bounding_box();return shot.getpixel((round(box['x']+box['width']*.15),round(box['y']+box['height']*.5)))
  self.assertEqual(pixel(self.cell(1)),pixel(self.page.locator('body > honeycomb-menu-ng-item')))
  self.assertEqual(self.cell().locator('.hex-inner').get_attribute('fill'),'#ef8c2f');self.capture('climate-shared-neutral')
  self.page.evaluate("()=>{const menu=hub._hubMenu;const config=JSON.parse(JSON.stringify(menu.config));config.buttons[0][0].colors={center:'#123456'};config.buttons[0][0].border={inner_width:4};menu.replaceConfig(config)}");self.settle();self.assertEqual(self.cell(1).locator('.hex-fill').get_attribute('fill'),'#123456');self.assertEqual(self.cell(1).evaluate('e=>e._model.inner'),4)
 def test_room_P4_four_percent_joined_and_unjoined_no_source_metadata_substitution(self):
  self.sonos_open();self.page.evaluate("pushState('media_player.player_b','playing',{friendly_name:'Room B',media_channel:'P4',media_title:'DR P4 — synthetic programme',media_content_id:'x-sonosapi-radio:synthetic',volume_level:.04,group_members:['media_player.player_b']});pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,group_members:['media_player.player_a'],volume_level:.89,media_channel:'Other station'})")
  self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.settle()
  room=self.cell(7);self.assertEqual(room.locator('.secondary').inner_text(),'Playing · 4%');self.assertTrue(room.locator('.tertiary').inner_text().startswith('P4'));self.assertNotIn('89%',room.inner_text());self.assertTrue(room.locator('.secondary').evaluate('e=>e.scrollWidth<=e.clientWidth+1'));self.capture('sonos-P4-unjoined')
  self.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,group_members:['media_player.player_a','media_player.player_b']});pushState('media_player.player_b','playing',{...hass.states['media_player.player_b'].attributes,group_members:['media_player.player_a','media_player.player_b']})");self.settle();self.assertTrue(room.locator('.primary').inner_text().startswith('✓ '));self.assertEqual(room.locator('.secondary').inner_text(),'Playing · 4%');self.capture('sonos-P4-joined')
  self.page.evaluate("pushState('media_player.player_b','unavailable',{...hass.states['media_player.player_b'].attributes})");self.settle();self.assertEqual(room.locator('.secondary').inner_text(),'Unavailable');self.assertEqual(room.locator('.tertiary').count(),0)

 def test_supplied_complete_picture_elements_card_and_normal_Hub_comparison(self):
  card=json.loads((Path(__file__).parent/'fixtures/beta3-picture-elements.json').read_text())
  self.page.route(card['image'],lambda route:route.fulfill(path=str(self.floorplan),content_type='image/png'))
  self.page.evaluate("pushState('light.zone_b','on',{brightness:190,supported_color_modes:['brightness']})")
  self.page.evaluate('''async card=>{
   const el=document.createElement('hui-picture-elements-card');window.floor=el;el.style.cssText='display:block;width:'+Math.min(innerWidth-32,900)+'px;margin:40px 16px';
   el.attachShadow({mode:'open'}).innerHTML='<style>#root{position:relative}.element{position:absolute;transform:translate(-50%,-50%)}ha-card{overflow:hidden;height:100%;box-sizing:border-box}</style><ha-card><div id="root"><hui-image></hui-image></div></ha-card>';
   const root=el.shadowRoot.querySelector('#root'),host=root.firstElementChild;host.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block}.container{height:100%}img{display:block;height:100%;width:100%;object-fit:cover}</style><div class="container"><img id="image"></div>';
   view.append(el);const image=host.shadowRoot.querySelector('img');image.src=card.image;await image.decode();
   for(const [i,config]of [card.elements[0],{...card.elements[0],collapsible:false,style:{left:'75%',top:'65%'}}].entries()){
    const cube=document.createElement('honeycomb-persistent-hub');cube.classList.add('element');Object.assign(cube.style,config.style);cube.setConfig(config);root.append(cube);if(i===0)window.hub=cube;else window.normal=cube;
   }
  }''',card)
  self.page.wait_for_function('hub._hubMenu?.isConnected && normal._hubMenu?.isConnected');self.page.wait_for_timeout(150);self.settle()
  read="()=>({primary:hub._hubMenu.shadowRoot.querySelector('.center-item').getBoundingClientRect().toJSON(),normal:normal._hubMenu.shadowRoot.querySelector('.center-item').getBoundingClientRect().toJSON(),numeric:hub.size})"
  before=self.page.evaluate(read);self.assertAlmostEqual(before['primary']['width'],before['normal']['width'],delta=.12);self.assertAlmostEqual(before['primary']['width'],before['numeric'],delta=.12);self.capture('supplied-card-collapsed')
  self.hold_input(self.page.locator('honeycomb-menu-ng').first.locator('.center-item .interaction-surface'));self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.capture('supplied-card-expanded')
  self.page.wait_for_timeout(550);self.page.locator('.hub-collapse').click();self.settle();after=self.page.evaluate(read)
  for key in ['x','y','width','height']:self.assertAlmostEqual(after['primary'][key],before['primary'][key],delta=.15)
  self.assertAlmostEqual(after['primary']['width'],after['normal']['width'],delta=.12);self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('supplied-card-collapsed-again')

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');p.add_argument('--floorplan',type=Path,required=True);a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=a.bundle.resolve();server.button=a.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as pw:
   Beta3.browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Beta3.url=f'http://127.0.0.1:{server.server_port}';Beta3.evidence=a.evidence_dir;Beta3.floorplan=a.floorplan.resolve()
   for width,height in [(1100,900),(390,844)]:
    Beta3.viewport={'width':width,'height':height};names=[n for n in Beta3.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Beta3(n) for n in names));success=r.wasSuccessful() and success
   Beta3.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
