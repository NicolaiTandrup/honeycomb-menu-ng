"""Generic HA Climate UI; Browser plugin not available. Synthetic services only.
Flow: Hub/Control -> Climate -> capability choices/range -> HA acknowledgement -> Back.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Cubes,Handler,CheckResult
from beta5 import FLOORPLAN

SEED='''()=>{
 hass.config={unit_system:{temperature:'°C'}};hass.services={...hass.services,climate:Object.fromEntries(['set_temperature','set_hvac_mode','set_preset_mode','set_fan_mode','set_swing_mode','set_swing_horizontal_mode'].map(s=>[s,{}])),switch:{turn_on:{},turn_off:{}}};
 window.climateRegistry=[];window.climateReads=[];
 hass.callWS=async request=>{if(request.type==='config/entity_registry/list'){climateReads.push(request);if(window.registryDenied)throw Error('denied');return climateRegistry;}return hass.connection.sendMessagePromise(request)};
 window.setClimate=(id='climate.room_a',state='heat',attributes={})=>pushState(id,state,{supported_features:1|8|16|32|512,temperature_unit:'°C',current_temperature:20.2,temperature:21,min_temp:7,max_temp:35,target_temp_step:.5,hvac_action:'heating',hvac_modes:['off','heat','cool','heat_cool'],fan_modes:['auto','low','high'],fan_mode:'auto',preset_modes:['eco','comfort'],preset_mode:'eco',swing_modes:['off','on'],swing_mode:'off',swing_horizontal_modes:['off','on'],swing_horizontal_mode:'off',...attributes});
 window.climateUpdate=(id,attributes,state)=>pushState(id,state||hass.states[id].state,{...hass.states[id].attributes,...attributes});
 setClimate();setClimate('climate.room_b','cool',{current_temperature:25,temperature:23,hvac_action:'cooling'});
}'''

class Climate(Cubes):
 def setUp(self):super().setUp();self.page.evaluate(SEED)
 def start(self,extra=None):self.hub({'logo':False,'items':[{'type':'climate','entity':'climate.room_a','name':'Room A',**(extra or {})}]});self.settle()
 def cell(self,slot=0):return self.page.locator('honeycomb-menu-ng .center-item' if slot==0 else f'honeycomb-menu-ng [data-honeycomb-slot="{slot-1}"]')
 def press(self,slot):self.activate(self.cell(slot).locator('.interaction-surface'));self.settle()
 def main(self):self.press(0);self.page.wait_for_function('hub._menuContext.currentConfig._climate_frame?.view==="main"')
 def frame(self):return self.page.evaluate('hub._menuContext.currentConfig._climate_frame')
 def test_main_geometry_light_reference_native_C_and_HA_confirmation(self):
  self.start();self.assertEqual(self.cell().locator('.primary').inner_text(),'20.2°C');self.assertEqual(self.cell().locator('.secondary').inner_text(),'Set 21°C');self.assertEqual(self.page.evaluate('calls.length'),0)
  self.main();self.assertEqual(self.controls().count(),7);self.assertEqual(self.cell(1).locator('.primary').inner_text(),'+1°C');self.assertEqual(self.cell(6).locator('.primary').inner_text(),'+0.5°C')
  self.press(6);self.assertEqual(self.page.evaluate('calls.at(-1)'),['climate','set_temperature',{'temperature':21.5},{'entity_id':'climate.room_a'}]);self.assertEqual(self.cell(6).locator('.secondary').inner_text(),'Awaiting HA');self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.cell(6).locator('.interaction-surface').click(force=True);self.assertEqual(self.page.evaluate('calls.length'),1)
  self.page.evaluate("climateUpdate('climate.room_a',{temperature:21.5})");self.settle();self.assertEqual(self.cell().locator('.secondary').inner_text(),'Set 21.5°C')
  for c in self.controls().all():self.assertAlmostEqual(c.bounding_box()['width'],82,delta=.05)
  self.capture('climate-main-C');self.back();self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
 def test_Fahrenheit_step_bounds_and_min_max_inert(self):
  self.page.evaluate("setClimate('climate.room_a','heat',{temperature_unit:'°F',temperature:94,current_temperature:70,min_temp:45,max_temp:95,target_temp_step:1})");self.start();self.main();self.assertEqual(self.cell(1).locator('.primary').inner_text(),'+2°F');self.assertEqual(self.cell(1).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.press(6)
  self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'temperature':95});self.page.evaluate("climateUpdate('climate.room_a',{temperature:95})");self.settle();self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.capture('climate-F-bounds')
 def test_dual_target_explicit_low_high_then_safe_exact_range_and_Back(self):
  self.page.evaluate("setClimate('climate.room_a','heat_cool',{supported_features:2,temperature:null,target_temp_low:18,target_temp_high:24})");self.start();self.main();self.press(6);self.assertEqual(self.frame()['view'],'targets');self.assertEqual(self.page.evaluate('calls.length'),0);self.press(1);self.assertEqual(self.frame()['bound'],'low');self.press(6)
  self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'target_temp_low':18.5,'target_temp_high':24});self.page.evaluate("climateUpdate('climate.room_a',{target_temp_low:18.5})");self.settle();self.capture('climate-range-low');self.back();self.settle();self.assertEqual(self.frame()['view'],'targets');self.press(2);self.assertEqual(self.frame()['bound'],'high');self.press(5);self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'target_temp_low':18.5,'target_temp_high':23.5})
  self.back();self.back();self.back();self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
 def test_rich_categories_exact_modes_presets_fan_and_both_swing_services(self):
  self.start();self.main();self.press(2);self.assertEqual(self.frame()['view'],'hvac');self.assertEqual(self.page.evaluate('calls.length'),0);self.press(3);self.assertEqual(self.page.evaluate('calls.at(-1)'),['climate','set_hvac_mode',{'hvac_mode':'cool'},{'entity_id':'climate.room_a'}]);self.page.evaluate("climateUpdate('climate.room_a',{hvac_action:'cooling'},'cool')");self.back();self.settle();self.press(3)
  for category,choice,service,field,value in [(2,2,'set_preset_mode','preset_mode','comfort'),(3,3,'set_fan_mode','fan_mode','high'),(4,2,'set_swing_mode','swing_mode','on'),(5,2,'set_swing_horizontal_mode','swing_horizontal_mode','on')]:
   self.press(category);self.press(choice);self.assertEqual(self.page.evaluate('calls.at(-1)'),['climate',service,{field:value},{'entity_id':'climate.room_a'}]);self.page.evaluate('([key,value])=>climateUpdate("climate.room_a",{[key]:value})',[field,value]);self.back();self.settle()
  self.capture('climate-capabilities')
 def test_native_defrost_explicit_switch_and_ambiguous_registry_isolation(self):
  self.page.evaluate("climateUpdate('climate.room_a',{preset_modes:['normal','defrost','camp']})");self.start();self.main();self.press(3);self.assertEqual(self.cell(6).count(),0);self.press(2);self.press(2);self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'preset_mode':'defrost'});self.assertEqual(self.page.evaluate('climateReads.length'),0)
  self.page.evaluate("climateUpdate('climate.room_a',{preset_mode:'defrost'});hub.remove();calls.length=0;pushState('switch.defrost_a','off',{})");self.start({'defrost_entity':'switch.defrost_a'});self.main();self.press(3);self.press(6);self.assertEqual(self.page.evaluate('calls'),[['switch','turn_on',{}, {'entity_id':'switch.defrost_a'}]]);self.capture('climate-explicit-defrost')
 def test_same_device_metadata_discovery_and_denied_registry_fallback(self):
  self.page.evaluate("climateRegistry=[{entity_id:'climate.room_a',device_id:'device_a',platform:'synthetic',config_entry_id:'entry_a'},{entity_id:'switch.defrost_a',device_id:'device_a',platform:'synthetic',config_entry_id:'entry_a',translation_key:'defrost'},{entity_id:'switch.defrost_b',device_id:'device_b',platform:'synthetic',config_entry_id:'entry_b',translation_key:'defrost'}];pushState('switch.defrost_a','off',{});pushState('switch.defrost_b','off',{})")
  self.start();self.page.wait_for_timeout(50);self.main();self.press(3);self.press(6);self.assertEqual(self.page.evaluate('calls.at(-1)[3]'),{'entity_id':'switch.defrost_a'});self.assertEqual(self.page.evaluate('climateReads.length'),1)
  self.page.evaluate("climateRegistry.push({...climateRegistry[1],entity_id:'switch.duplicate'});hass.connection.dispatchEvent(new Event('ready'))");self.page.wait_for_timeout(50);self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true')
  self.page.evaluate("registryDenied=true;hass.connection.dispatchEvent(new Event('ready'))");self.page.wait_for_timeout(50);self.assertEqual(self.page.evaluate('calls.length'),1)
 def test_cross_entity_generic_parent_child_Back_and_no_wrong_service_target(self):
  parent={'type':'generic','entity':'sensor.value_a','name':'Parent A','tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':{'entity':'sensor.value_a','nested_expand':True,'buttons':[{'slot':1,'name':'Climate B','show_name':True,'tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':{'module':'climate','entity':'climate.room_b','name':'Room B'}}}]}}}
  self.hub({'logo':False,'items':[parent]});self.press(0);self.press(1);self.assertEqual(self.frame()['entity'],'climate.room_b');self.assertEqual(self.cell().locator('.primary').inner_text(),'25°C');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),1);self.assertEqual(self.page.evaluate('calls.length'),0);self.press(6);self.assertEqual(self.page.evaluate('calls.at(-1)[3]'),{'entity_id':'climate.room_b'});self.back();self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.currentConfig.entity'),'sensor.value_a');self.back();self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.capture('climate-cross-entity-restored')
 def test_standalone_control_keyboard_and_unavailable_child(self):
  self.page.evaluate("makeControl({module:'climate',entity:'climate.room_a',name:'Room A'})");self.activate(self.page.locator('body > honeycomb-persistent-control .interaction-surface'));self.page.wait_for_selector('honeycomb-menu-ng');button=self.cell(6).locator('.interaction-surface');button.focus();button.press('Enter');self.assertEqual(self.page.evaluate('calls.at(-1)[3]'),{'entity_id':'climate.room_a'});self.page.evaluate("climateUpdate('climate.room_a',{},'unavailable')");self.settle();self.assertEqual(self.cell().locator('.primary').inner_text(),'Unavailable');self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.capture('climate-unavailable')
 def test_choice_removal_and_late_HA_after_Back_never_reopens(self):
  self.start();self.main();self.press(3);self.press(3);self.page.evaluate("climateUpdate('climate.room_a',{fan_modes:['auto']})");self.settle();target=self.cell(3).locator('.interaction-surface');self.assertEqual(target.get_attribute('aria-disabled'),'true');target.click(force=True);self.assertEqual(self.page.evaluate('calls.length'),0);self.back();self.back();self.back();self.page.evaluate("climateUpdate('climate.room_a',{fan_modes:['auto','new_mode']})");self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),1)
 def test_display_only_no_polling_unrelated_updates_idle_and_cleanup(self):
  self.page.clock.install();self.page.evaluate("setClimate('climate.room_a','off',{supported_features:0,temperature:null,hvac_modes:[],hvac_action:'heating'})");self.start();self.assertEqual(self.cell().locator('.hex-fill').get_attribute('fill'),'#202224');self.main();self.assertEqual(self.cell(6).locator('.interaction-surface').get_attribute('aria-disabled'),'true');self.capture('climate-display-only');self.page.evaluate("for(let i=0;i<20;i++)pushState('sensor.unrelated',String(i),{})");self.page.clock.run_for(8200);self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.page.evaluate('calls.length'),0);reads=self.page.evaluate('climateReads.length');self.page.clock.run_for(60000);self.assertEqual(self.page.evaluate('climateReads.length'),reads);self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
 def test_auto_sizing_live_heat_cool_off_and_preview_suppression(self):
  self.page.evaluate(FLOORPLAN,{'size':'auto','auto_reference_width':640,'logo':False,'items':[{'type':'climate','entity':'climate.room_a','name':'Room A'}]});self.page.wait_for_function('hub._hubMenu?.isConnected');self.page.evaluate("floor.style.width='320px';imageHost.style.height='200px'");self.page.wait_for_timeout(120);self.assertAlmostEqual(self.cell().bounding_box()['width'],41,delta=.05);self.page.evaluate("climateUpdate('climate.room_a',{hvac_action:'cooling'},'cool')");self.settle();self.assertEqual(self.cell().locator('.hex-inner').get_attribute('fill'),'#42a5f5');self.page.evaluate('hub.preview=true');self.press(0);self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('climate-auto-preview')

 def test_service_failure_unconfirmed_disconnect_and_late_ack_after_close(self):
  self.page.clock.install();self.start({'persistent':{'menu':{'idle_timeout':30000}}});self.main()
  self.page.evaluate("()=>{window.notices=[];document.querySelector('home-assistant').addEventListener('hass-notification',e=>notices.push(e.detail.message));hass.callService=async(...args)=>{calls.push(args);throw Error('synthetic failure')}}")
  self.press(6);self.assertEqual(self.cell(6).locator('.secondary').inner_text(),'Command failed');self.assertIn('no automatic retry',self.page.evaluate('notices.at(-1)'));self.assertEqual(self.page.evaluate('calls.length'),1);self.capture('climate-command-failed')
  self.page.evaluate('()=>{hass.callService=async(...args)=>{calls.push(args)}}');self.press(6);self.page.clock.run_for(15100);self.settle();self.assertEqual(self.cell(6).locator('.secondary').inner_text(),'Not confirmed');self.assertEqual(self.page.evaluate('calls.length'),2);self.capture('climate-not-confirmed')
  self.page.evaluate("hass.connection.connected=false;hass.connection.dispatchEvent(new Event('disconnected'))");self.settle();self.assertEqual(self.cell().locator('.primary').inner_text(),'Unavailable');self.cell(6).locator('.interaction-surface').click(force=True);self.assertEqual(self.page.evaluate('calls.length'),2)
  self.back();self.page.evaluate("hass.connection.connected=true;hass.connection.dispatchEvent(new Event('ready'));climateUpdate('climate.room_a',{temperature:21.5})");self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.main();self.assertEqual(self.cell().locator('.secondary').inner_text(),'Set 21.5°C');self.assertNotEqual(self.cell(6).locator('.secondary').inner_text(),'Awaiting HA')
 def test_many_climate_cubes_skip_unrelated_renders_and_deduplicate_registry(self):
  self.page.evaluate("for(let i=0;i<40;i++)setClimate('climate.room_'+i)");self.hub({'logo':False,'items':[{'type':'climate','entity':f'climate.room_{i}'} for i in range(40)]});self.settle()
  result=self.page.evaluate("""async()=>{
   const proto=Object.getPrototypeOf(customElements.get('honeycomb-menu-ng-item').prototype),render=proto.render;let renders=0;proto.render=function(){renders++;return render.call(this)};
   try{const start=performance.now();for(let i=0;i<1000;i++)pushState('sensor.unrelated',String(i),{});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const unrelated=renders;climateUpdate('climate.room_0',{current_temperature:20.5});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return {unrelated,related:renders-unrelated,reads:climateReads.length,ms:performance.now()-start};}finally{proto.render=render;}
  }""")
  self.assertEqual(result['unrelated'],0);self.assertEqual(result['related'],1);self.assertEqual(result['reads'],1);self.assertEqual(self.page.evaluate('calls.length'),0)
  if self.evidence:(self.evidence/f'{self.viewport["width"]}-climate-performance.json').write_text(json.dumps(result,indent=2))
 def test_shared_Light_geometry_and_readable_two_row_alignment(self):
  self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','show_name':True,'name':'Light A','label':'Set 21°C','show_label':True},{'type':'climate','entity':'climate.room_a','name':'Room A'}]});self.settle()
  cells=self.controls();self.assertEqual(cells.count(),2)
  shapes=cells.evaluate_all("els=>els.map(e=>({size:e.getBoundingClientRect().width,points:e.shadowRoot.querySelector('.hex-fill').getAttribute('points'),primary:e.shadowRoot.querySelector('.primary').getBoundingClientRect().x+e.shadowRoot.querySelector('.primary').getBoundingClientRect().width/2-e.getBoundingClientRect().x,icon:e.shadowRoot.querySelector('ha-icon').getBoundingClientRect().x+e.shadowRoot.querySelector('ha-icon').getBoundingClientRect().width/2-e.getBoundingClientRect().x}))")
  self.assertEqual(shapes[0]['points'],shapes[1]['points'])
  for shape in shapes:
   self.assertAlmostEqual(shape['size'],82,delta=.05);self.assertAlmostEqual(shape['primary'],41,delta=.1);self.assertAlmostEqual(shape['icon'],41,delta=.1)
  for c in cells.all():self.assertLess(c.locator('ha-icon').bounding_box()['y']+c.locator('ha-icon').bounding_box()['height'],c.locator('.primary').bounding_box()['y']+.5)
  self.capture('climate-Light-shared-reference')

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=a.bundle.resolve();server.button=a.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   Climate.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Climate.url=f'http://127.0.0.1:{server.server_port}';Climate.evidence=a.evidence_dir
   for width,height in [(1100,900),(390,844)]:
    Climate.viewport={'width':width,'height':height};names=[n for n in Climate.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];result=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Climate(n) for n in names));success=result.wasSuccessful() and success
   Climate.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
