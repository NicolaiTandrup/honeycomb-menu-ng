"""Browser plugin absent; local Playwright. Synthetic HA, never real device acceptance.
Flow: room floorplan -> universal expansion/free region -> selected module promotion
or measured fallback -> exact Back/collapse; shared Bee version gestures.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,CheckResult
from beta4_defaults import Beta4
from beta5 import FLOORPLAN
from climate import SEED as CLIMATE
from charger import SEED as CHARGER,charger

class Geometry(Beta4):
 def settle(self):
  super().settle()
  self.page.evaluate("""async()=>{await new Promise(requestAnimationFrame);const menu=window.hub?._menuContext?.honeycomb;if(menu){await menu.updateComplete;await Promise.all(menu.shadowRoot.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))}}""")
 def floor(self,region='above',items=None,policy='primary',extra=None):
  self.page.evaluate(CLIMATE);self.page.evaluate(CHARGER);self.sonos_setup()
  config={'collapsible':{'expanded_center':policy,**({'primary_slot':1} if policy=='bee' else {})},'items':items or [{'type':'light','entity':'light.zone_a','slot':0},{'type':'light','entity':'light.zone_b','slot':2}],**(extra or {})}
  self.page.evaluate(FLOORPLAN,config);self.page.wait_for_function('hub._hubMenu?.isConnected')
  w,h=self.viewport['width'],self.viewport['height']
  if region=='above':rect=[16,72,w-32,min(h*.38,350)]
  elif region=='below':rect=[16,h*.60,w-32,h*.34]
  elif region=='left':rect=[16,72,w*.35,h-100]
  elif region=='right':rect=[w*.65,72,w*.33-16,h-100]
  else:rect=[0,0,w,h]
  self.page.evaluate("([x,y,w,h])=>{floor.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;margin:0`;imageHost.style.height=h+'px';floorImage.style.objectFit='cover';floorImage.style.objectPosition='50% 50%'}",rect);self.page.wait_for_timeout(150);self.settle();return rect
 def state(self):return self.page.evaluate("()=>({root:hub._expandedRoot,anchor:{x:hub._hubMenu._anchorX,y:hub._hubMenu._anchorY},size:hub._hubMenu.sizes.item,image:hub._floorplanImageRect,fit:hub._menuContext.currentConfig._expanded_fit,environment:hub._expansionEnvironment()})")
 def boxes(self):
  self.page.mouse.move(0,0);self.settle()
  return self.controls().evaluate_all('es=>es.map(e=>e.getBoundingClientRect().toJSON())')
 def assert_fit(self,region=None):
  r=region or self.state()['environment']['viewport']
  for b in self.boxes():
   self.assertGreaterEqual(b['x'],r['left']-.2);self.assertGreaterEqual(b['y'],r['top']-.2);self.assertLessEqual(b['x']+b['width'],r['right']+.2);self.assertLessEqual(b['y']+b['height'],r['bottom']+.2)
 def assert_same(self,before,after):
  for key in ['x','y','width','height']:self.assertAlmostEqual(before[key],after[key],delta=.2)
 def reset(self):self.page.evaluate("for(const m of view.querySelectorAll('honeycomb-menu-ng')){if(m._menuContext)ng.disposeContext(m._menuContext)};if(window.hub)hub.remove();if(window.floor)floor.remove();calls.length=0")
 def test_universal_desktop_mobile_expansion_and_image_free_regions(self):
  for location,expected in [('above','below'),('below','above'),('left','right'),('right','left')]:
   self.floor(location);small=self.box();self.capture('collapsed-'+location);self.expand();self.page.wait_for_timeout(550);s=self.state();self.assertTrue(self.page.locator('honeycomb-menu-ng').evaluate("e=>e.matches(':popover-open')"));self.assertGreaterEqual(s['size'],80);self.assert_fit()
   # Thin side regions on phones are rejected rather than shrinking to unusable size.
   if location in ('above','below') or self.viewport['width']>=800:self.assertEqual(s['root']['region']['key'],expected);self.assert_fit(s['root']['region'])
   self.capture('expanded-free-'+location);self.activate(self.cell().locator('.interaction-surface'));self.settle();self.assert_same(small,self.box());self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('restored-'+location);self.reset()
 def test_full_image_fallback_headers_safe_areas_crop_and_resize(self):
  self.floor('full');self.page.evaluate("()=>{const h=document.createElement('app-header');h.id='test-header';h.style.cssText='position:fixed;inset:0 0 auto;height:56px;z-index:20;background:#222';document.body.append(h);hub._hubMenu.style.setProperty('--hub-safe-bottom','20px')}");self.expand();self.page.wait_for_timeout(550);s=self.state();self.assertEqual(s['root']['region']['key'],'viewport');self.assertGreaterEqual(s['environment']['viewport']['top'],72);self.assert_fit();self.capture('fallback-header-safe-area')
  self.page.evaluate("document.querySelector('#test-header').style.height='88px'");self.page.wait_for_timeout(130);self.assertGreaterEqual(self.state()['environment']['viewport']['top'],104);self.assert_fit()
  self.page.evaluate("floor.style.height='240px';imageHost.style.height='240px';floorImage.style.objectFit='contain';floorImage.style.objectPosition='right top'");self.page.wait_for_timeout(130);s=self.state();self.assertLessEqual(s['image']['bottom']-s['image']['top'],240.1);self.assert_fit()
  self.page.evaluate("floor.style.transform='scale(.9)'");self.page.wait_for_timeout(130);self.assertIsNone(self.state()['image']);self.assert_fit();self.capture('unsupported-transform-safe-fallback');self.back();self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'))
 def test_smart_promotion_all_modules_and_exact_parent_Back(self):
  cases=[('Sonos',self.sonos_item(),True),('Light',{'type':'light','entity':'light.zone_a'},True),('Climate',{'type':'climate','entity':'climate.room_a'},False),('Charger',charger(1),True),('Generic',{'type':'generic','entity':'sensor.value_a','icon':'mdi:circle','tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':{'nested_expand':True,'promote_to_center':True,'promoted_center':{'mode':'generic','entity':'sensor.value_a','icon':'mdi:circle'},'buttons':[{'slot':1,'icon':'mdi:circle','tap_action':{'action':'none'}}]}}},False)]
  for name,item,hold in cases:
   item={**item,'slot':3};self.floor('above',items=[{'type':'light','entity':'light.zone_b','slot':0},item]);self.expand();self.page.wait_for_timeout(550);parent=self.boxes();selected=self.cell(3).bounding_box();anchor_before=self.state()['anchor'];self.capture('selected-slot3-'+name)
   if hold:self.hold_input(self.cell(3).locator('.interaction-surface'))
   else:self.activate(self.cell(3).locator('.interaction-surface'))
   self.settle();s=self.state();self.assertGreater(self.page.evaluate('hub._menuContext.stack.length'),0);self.assert_fit();self.assertEqual(self.cell().evaluate('e=>e.config.entity'),item['entity']);self.capture('submenu-'+name+'-'+s['fit']['reason'])
   if s['fit']['reason']=='selected':self.assert_same(selected,self.box())
   elif s['fit']['reason']=='root':self.assertAlmostEqual(s['anchor']['x'],anchor_before['x'],delta=.15);self.assertAlmostEqual(s['anchor']['y'],anchor_before['y'],delta=.15)
   self.back();self.settle();self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assertEqual(len(self.boxes()),len(parent))
   for a,b in zip(parent,self.boxes()):self.assert_same(a,b)
   self.capture('parent-restored-'+name);self.assertEqual(self.page.evaluate('calls.length'),0);self.back();self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.reset()
 def test_radio_larger_rings_nested_Back_and_rotation_keep_parent_sizes(self):
  self.floor('full',items=[{'type':'light','entity':'light.zone_b','slot':0},{**self.sonos_item(),'slot':3}]);small=self.box();self.expand();self.page.wait_for_timeout(550);root=self.boxes();self.hold_input(self.cell(3).locator('.interaction-surface'));self.settle();sonos=self.boxes();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle();self.assert_fit();self.capture('Radio-larger-footprint')
  self.back();self.settle()
  for a,b in zip(sonos,self.boxes()):self.assert_same(a,b)
  self.back();self.settle()
  for a,b in zip(root,self.boxes()):self.assert_same(a,b)
  # Repeat inside the larger child while the actual viewport rotates.
  self.hold_input(self.cell(3).locator('.interaction-surface'));self.settle();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
  self.page.set_viewport_size({'width':self.viewport['height'],'height':self.viewport['width']});self.page.evaluate("floor.style.width=innerWidth+'px';floor.style.height=innerHeight+'px';imageHost.style.height=innerHeight+'px'");self.page.wait_for_timeout(130);self.settle();self.assert_fit();self.back();self.settle();self.assert_fit();self.back();self.settle();self.assert_fit();self.back();self.settle();self.assertAlmostEqual(self.box()['width'],self.page.evaluate('hub.size'),delta=.15);self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_shared_Bee_paint_version_keyboard_hold_and_no_action_leak(self):
  self.page.clock.install();self.hub({'logo':True,'size':100,'items':[{'type':'light','entity':'light.zone_a','slot':1}]});normal=self.cell();standard=normal.evaluate("e=>({asset:e.shadowRoot.querySelector('.bee-icon').src,colors:e._model.colors,fill:e._model.fill,outer:e._model.outer,inner:e._model.inner})");normal.locator('.interaction-surface').press('Enter');self.page.clock.run_for(35);self.assertEqual(normal.locator('.bee-version').get_attribute('aria-label'),'v1.10.0 beta 5');self.capture('standard-Bee-version');self.page.evaluate('hub.remove()')
  self.floor('above',policy='bee');self.expand();self.page.clock.run_for(550);self.assertEqual(self.cell().evaluate("e=>({asset:e.shadowRoot.querySelector('.bee-icon').src,colors:e._model.colors,fill:e._model.fill,outer:e._model.outer,inner:e._model.inner})"),standard);self.cell().locator('.interaction-surface').press('Shift+Enter');self.page.clock.run_for(35);self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.cell().locator('.bee-version').get_attribute('aria-label'),'v1.10.0 beta 5');self.page.clock.run_for(1500);self.assertTrue(self.cell().locator('.bee-version').is_visible());self.capture('expanded-Bee-version');self.page.clock.run_for(1600);self.assertEqual(self.cell().locator('.bee-version').count(),0)
  self.hold_input(self.cell().locator('.interaction-surface'));self.page.clock.run_for(35);self.assertTrue(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.cell().locator('.bee-version').count(),1);self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('expanded-Bee-hold');self.activate(self.cell().locator('.interaction-surface'));self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_sparse_rings_hard_soft_priority_visibility_and_state_stability(self):
  self.page.evaluate("pushState('binary_sensor.gate','on',{})")
  items=[{'type':'light','entity':'light.zone_a','slot':0}]+[{'type':'generic','entity':'sensor.value_a','icon':'mdi:circle','name':'Item '+str(i),'slot':slot,'slot_mode':mode,'tap_action':{'action':'none'},**({'show':'[[[ return states["binary_sensor.gate"]?.state === "on"; ]]]'} if i==4 else {})} for i,(slot,mode) in enumerate([(1,'hard'),(2,'hard'),(2,'priority'),(1,'soft'),(6,'hard'),(21,'hard')],1)]
  self.floor('above',items=items);self.expand();self.page.wait_for_timeout(550);self.assertEqual(self.controls().count(),7);self.assert_fit();before=self.state()['anchor'];self.capture('sparse-rings-hard-soft-priority')
  self.page.evaluate("pushState('sensor.unrelated','changed',{})");self.settle();self.assertEqual(before,self.state()['anchor']);self.page.evaluate("pushState('binary_sensor.gate','off',{})");self.page.wait_for_function("hub._hubMenu.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control').length===6");self.settle();self.assert_fit();self.assertEqual(self.page.evaluate('calls.length'),0);self.back();self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'))
 def test_multiple_hubs_visibility_state_stability_editing_timeout_and_cleanup(self):
  self.page.clock.install();self.floor('above');self.page.evaluate("window.other=addOverlay({collapsible:true,items:[{type:'light',entity:'light.zone_b',slot:0}]},'75%','50%')");self.settle();self.expand();self.page.clock.run_for(550);before=self.state();self.page.evaluate("for(let i=0;i<30;i++)pushState('sensor.unrelated',String(i),{})");self.settle();after=self.state();self.assertEqual(before['anchor'],after['anchor']);self.assertFalse(self.page.evaluate('!!other._hubExpanded'));self.assert_fit();self.page.clock.run_for(30100);self.settle();self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.page.evaluate('hub.preview=true');self.hold_input(self.cell().locator('.interaction-surface'));self.assertFalse(self.page.evaluate('hub._hubExpanded'));self.page.evaluate('hub.preview=false');self.expand();self.page.evaluate('hub.remove();other.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0);self.assertEqual(self.page.evaluate('calls.length'),0);self.assertEqual(self.page.evaluate('obs.reduce((n,o)=>n+o.instance.nodes.size,0)'),0)

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=a.bundle.resolve();server.button=a.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as pw:
   Geometry.browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Geometry.url=f'http://127.0.0.1:{server.server_port}';Geometry.evidence=a.evidence_dir
   for width,height in [(390,844),(430,932),(800,1280),(1280,800),(1440,900),(1920,1080),(650,900)]:
    Geometry.viewport={'width':width,'height':height};names=[n for n in Geometry.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Geometry(n) for n in names));success=r.wasSuccessful() and success
   Geometry.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
