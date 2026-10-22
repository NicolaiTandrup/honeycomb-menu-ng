"""Charger production UI, synthetic HA only. Browser plugin not available.
Flow: overview -> hold named charger -> exact promoted detail -> deliberate
verified switch tap -> HA confirmation -> Back; no service on navigation.
"""
import argparse, json, os, shutil, threading, unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
import yaml
from playwright.sync_api import sync_playwright
from run import Handler, Cubes, CheckResult
from beta5 import FLOORPLAN

def charger(index=1):
    key=f'charger_{index}'
    return {'type':'charger','name':f'Charger {index}','provider':'easee','entity':f'sensor.{key}_status','slot':index,
            'entities':{'power':f'sensor.{key}_power','enabled':f'switch.{key}_enabled','online':f'binary_sensor.{key}_online',
                        'session_energy':f'sensor.{key}_energy','permanent_lock':f'switch.{key}_permanent_lock',
                        'physical_lock':f'binary_sensor.{key}_lock','current':f'sensor.{key}_current','limit':f'sensor.{key}_limit'}}

SEED='''()=>{
 window.registryRequests=[];
 hass.services={...hass.services,switch:{turn_on:{},turn_off:{}}};hass.entities={...hass.entities};
 const roles={status:['sensor','Charging',null,'status'],power:['sensor','7.4','kW','power'],energy:['sensor','2.5','kWh','session_energy'],
 enabled:['switch','on',null,'is_enabled'],permanent_lock:['switch','off',null,'cable_locked_permanently'],
 lock:['binary_sensor','off',null,'cable_locked'],online:['binary_sensor','on',null,'online'],current:['sensor','16','A','current'],limit:['sensor','28','A','output_limit']};
 for(let i=1;i<=(window.testChargerCount||2);i++)for(const [role,[domain,state,unit,suffix]]of Object.entries(roles)){
  const id=domain+'.charger_'+i+'_'+role;
  hass.states[id]={entity_id:id,state,last_updated:new Date().toISOString(),attributes:{id:'SYNTHETIC_'+i,...(unit?{unit_of_measurement:unit}:{}),...(role==='lock'?{device_class:'lock'}:{})}};
  hass.entities[id]={entity_id:id,platform:'easee',device_id:'device_'+i,unique_id:'SYNTHETIC_'+i+'_'+suffix};
 }
 hass.callWS=async request=>{if(request.type==='config/entity_registry/list'){registryRequests.push(request);return Object.values(hass.entities)}return hass.connection.sendMessagePromise(request)};
 window.chargerSet=(id,state,attributes)=>{
  const old=hass.states[id]||{entity_id:id};hass.states[id]={...old,state,attributes:{...old.attributes,...attributes},last_updated:new Date().toISOString()};
  for(const client of providedClients)if(client.isConnected)client.hass=hass;
 };
}'''

class Charger(Cubes):
    def setUp(self):
        super().setUp();self.page.evaluate(SEED)
    def overview(self,items=None,extra=None):
        items=items or [charger(1),charger(2)]
        self.hub({'logo':False,'items':[{'type':'charging-hub','slot':0,'name':'Charging Hub','chargers':items},*items,*(extra or [])]})
        # Persistent menus intentionally keep their floorplan anchor. This demo
        # leaves space for the left charger's fixed 82px detail ring on mobile.
        self.page.evaluate("hub.style.left=(innerWidth*.6-41)+'px'")
        self.settle()
    def capture(self,name):
        super().capture(name)
        if self.evidence:
            bounds=self.controls().evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})')
            x=max(0,min(b['x'] for b in bounds)-12);y=max(0,min(b['y'] for b in bounds)-12)
            right=min(self.viewport['width'],max(b['right'] for b in bounds)+12);bottom=min(self.viewport['height'],max(b['bottom'] for b in bounds)+12)
            self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-{name}-focus.png'),clip={'x':x,'y':y,'width':right-x,'height':bottom-y})
    def settle(self):
        self.page.evaluate('''async()=>{await new Promise(r=>requestAnimationFrame(r));for(const menu of view.querySelectorAll('honeycomb-menu-ng')){
          await menu.updateComplete;await Promise.all([...menu.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control')].map(e=>e.updateComplete));
          await Promise.all(menu.shadowRoot.getAnimations({subtree:true}).filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));}}''')
    def cell(self,slot):
        return self.page.locator('honeycomb-menu-ng .center-item' if slot==0 else f'honeycomb-menu-ng [data-honeycomb-slot="{slot-1}"]')
    def state(self,index,role,state,attributes=None):
        domain='switch' if role in ('enabled','permanent_lock') else 'binary_sensor' if role in ('online','lock','connected') else 'sensor'
        self.page.evaluate('([id,s,a])=>chargerSet(id,s,a)',[f'{domain}.charger_{index}_{role}',state,attributes or {}]);self.settle()
    def model(self,slot):return self.cell(slot).evaluate('(e)=>e._model')
    def open_details(self,index=1):
        self.settle()
        target=self.cell(index).locator('.interaction-surface')
        target.click(trial=True)  # Wait for floorplan/entry geometry, without activation.
        self.hold_input(target)
        self.page.wait_for_function('hub._menuContext.stack.length===1');self.settle()
        for cell in self.controls().all():
            box=cell.bounding_box();self.assertGreaterEqual(box['x'],-.1);self.assertLessEqual(box['x']+box['width'],self.viewport['width']+.1)
            self.assertGreaterEqual(box['y'],-.1);self.assertLessEqual(box['y']+box['height'],self.viewport['height']+.1)
    def assert_no_commands(self):self.assertEqual(self.page.evaluate('calls.length'),0)
    def disabled_tap(self,slot):
        target=self.cell(slot).locator('.interaction-surface')
        self.assertEqual(target.get_attribute('aria-disabled'),'true')
        if self.viewport['width']<500:target.tap(force=True)
        else:target.click(force=True)

    def test_overview_state_gallery_and_shared_light_geometry(self):
        self.overview([charger(1)],extra=[{'type':'light','entity':'light.zone_a','name':'Light A','show_name':True,'slot':2}])
        self.assertEqual(self.model(0)['name'],'7.4 kW');self.assertEqual(self.model(0)['secondary'],'1 car')
        self.assertEqual(self.model(1)['name'],'Charger 1');self.assertEqual(self.model(1)['secondary'],'7.4 kW');self.assertEqual(self.model(1)['tertiary'],'Car connected')
        for slot in [0,1,2]:self.assertAlmostEqual(self.cell(slot).bounding_box()['width'],82,delta=.05)
        self.page.wait_for_timeout(80);self.assertTrue(self.cell(1).evaluate('(e)=>e.hasAttribute("energy-wave-running")'))
        self.capture('charger-one-positive-light-reference')
        for title,status,permission,online,color in [('connected-zero','Ready to charge','on','on','#43c95b'),('no-car','Car disconnected','on','on','#42a5f5'),
                    ('disabled','Ready to charge','off','on','#f2c94c'),('fault','Error','on','on','#ef5350'),('unavailable','Charging','on','off','#ef5350')]:
            self.page.evaluate('([s,p,o])=>{chargerSet("sensor.charger_1_status",s);chargerSet("sensor.charger_1_power","0");chargerSet("switch.charger_1_enabled",p);chargerSet("binary_sensor.charger_1_online",o)}',[status,permission,online]);self.settle()
            self.assertEqual(self.model(1)['colors']['inner'],color);self.assertFalse(self.cell(1).evaluate('(e)=>e.hasAttribute("energy-wave-running")'));self.capture('charger-'+title)
        self.assert_no_commands()

    def test_two_charger_identity_promotion_back_and_live_association(self):
        a,b=charger(1),charger(2)
        for item in [a,b]:item['association']={'entity':'sensor.vehicle_links','charger_key':'charger_'+str(item['slot']),'max_age':60}
        self.page.evaluate('''()=>chargerSet('sensor.vehicle_links','2',{updated_at:new Date().toISOString(),assignments:[
          {charger:'charger_1',car:'vehicle_a',car_name:'Vehicle A',mode:'auto_assigned'},{charger:'charger_2',car:'vehicle_b',car_name:'Vehicle B',mode:'auto_assigned'}]})''')
        self.overview([a,b]);self.assertEqual(self.model(0)['name'],'14.8 kW');self.assertEqual(self.model(0)['secondary'],'2 cars');self.capture('charger-two-known-vehicles')
        for index in [1,2,1]:
            self.open_details(index)
            self.assertEqual(self.cell(0).evaluate('(e)=>e.config._charger.entity'),f'sensor.charger_{index}_status')
            roles=self.page.evaluate('hub._hubMenu.buttons.map(b=>[b.slot,b._charger_field])');self.assertEqual(roles,[[1,'enabled'],[2,'permanent_lock'],[3,'session_energy'],[4,'vehicle'],[5,'current'],[6,'details']])
            self.assertEqual(self.model(3)['secondary'],'2.50 kWh');self.assertEqual(self.model(4)['name'],'Vehicle A' if index==1 else 'Vehicle B')
            self.capture(f'charger-{index}-promoted-details')
            self.activate(self.cell(0).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.state(1,'status','Car disconnected');self.assertEqual(self.model(1)['tertiary'],'No car');self.assertEqual(self.model(0)['secondary'],'1 car')
        self.state(1,'status','Charging');self.page.evaluate('''()=>chargerSet('sensor.vehicle_links','2',{updated_at:new Date().toISOString(),assignments:[{charger:'charger_1',car:'vehicle_b',car_name:'Vehicle B',mode:'auto_assigned'},{charger:'charger_2',car:'vehicle_a',car_name:'Vehicle A',mode:'auto_assigned'}]})''');self.settle()
        self.assertEqual(self.model(1)['tertiary'],'Vehicle B');self.assertEqual(self.model(2)['tertiary'],'Vehicle A');self.assert_no_commands()

    def test_deliberate_controls_confirm_state_and_never_cross_target(self):
        self.overview();self.open_details(2);self.assert_no_commands()
        self.hold_input(self.cell(1).locator('.interaction-surface'));self.assert_no_commands()
        self.activate(self.cell(1).locator('.interaction-surface'))
        self.page.wait_for_function('calls.length===1');self.assertEqual(self.page.evaluate('calls[0]'),['switch','turn_off',{}, {'entity_id':'switch.charger_2_enabled'}])
        self.assertTrue(self.model(1)['disabled']);self.assertEqual(self.model(1)['tertiary'],'Awaiting HA')
        self.disabled_tap(1);self.assertEqual(self.page.evaluate('calls.length'),1)
        self.state(2,'enabled','off');self.assertEqual(self.model(1)['secondary'],'OFF');self.assertFalse(self.model(1).get('disabled',False))
        self.activate(self.cell(2).locator('.interaction-surface'));self.page.wait_for_function('calls.length===2')
        self.assertEqual(self.page.evaluate('calls[1]'),['switch','turn_on',{}, {'entity_id':'switch.charger_2_permanent_lock'}]);self.state(2,'permanent_lock','on')
        self.activate(self.cell(0).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===0');self.open_details(1)
        self.assertEqual(self.model(1)['secondary'],'ON');self.assertEqual(self.model(2)['secondary'],'OFF');self.assertEqual(self.page.evaluate('calls.length'),2)

    def test_no_writable_lock_or_foreign_device_never_exposes_command(self):
        a=charger(1);del a['entities']['permanent_lock'];a['discover']=False
        self.overview([a]);self.open_details();self.assertEqual(self.model(2)['secondary'],'Locked');self.assertEqual(self.model(2)['tertiary'],'Read-only');self.assertTrue(self.model(2)['disabled'])
        self.disabled_tap(2);self.assert_no_commands()
        self.page.evaluate('hass.entities["switch.charger_1_enabled"]={...hass.entities["switch.charger_1_enabled"],device_id:"foreign"};chargerSet("switch.charger_1_enabled","on")');self.settle()
        self.assertTrue(self.model(1)['disabled']);self.disabled_tap(1);self.assert_no_commands();self.capture('charger-safe-readonly-foreign-control')

    def test_expiry_missing_association_and_command_failure_remain_honest(self):
        self.page.clock.install();a=charger(1);a['max_age']=10;a['association']={'entity':'sensor.vehicle_links','charger_key':'charger_1','max_age':10}
        self.page.evaluate('''()=>chargerSet('sensor.vehicle_links','1',{updated_at:new Date().toISOString(),assignments:[{charger:'charger_1',car:'vehicle_a',car_name:'Vehicle A',mode:'auto_assigned'}]})''')
        self.overview([a]);self.assertEqual(self.model(1)['tertiary'],'Vehicle A')
        self.page.clock.fast_forward(11000);self.page.clock.run_for(100);self.assertEqual(self.model(1)['tertiary'],'Car connected');self.assertEqual(self.model(1)['secondary'],'Power unknown');self.assertEqual(self.model(0)['name'],'— kW')
        self.open_details();self.page.evaluate('()=>{hass.callService=(...args)=>{calls.push(args);return Promise.reject(new Error("synthetic rejection"))}}')
        self.activate(self.cell(1).locator('.interaction-surface'));self.page.wait_for_function('calls.length===1');self.assertEqual(self.model(1)['tertiary'],'Command failed')
        self.assertFalse(self.model(1).get('disabled',False));self.capture('charger-command-failure')

    def test_updates_do_not_extend_idle_and_registry_completion_cannot_reopen_menu(self):
        self.page.clock.install();self.page.evaluate('()=>{window.registryFinish=null;hass.callWS=request=>request.type==="config/entity_registry/list"?new Promise(r=>registryFinish=r):hass.connection.sendMessagePromise(request)}')
        self.overview([charger(1)]);self.open_details()
        for i in range(9):self.state(1,'power',str(5+i/10));self.page.clock.fast_forward(1000)
        self.page.clock.run_for(500);self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.page.evaluate('if(registryFinish)registryFinish(Object.values(hass.entities))');self.page.clock.run_for(200)
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),1);self.assert_no_commands()

    def test_power_animation_safety_rate_stability_and_unrelated_updates(self):
        a=charger(1);a['energy_wave']={'max_power_w':7400,'color':'#123456'};self.overview([a]);cube=self.cell(1)
        self.page.wait_for_timeout(80);self.assertEqual(self.model(1)['energyWaveColor'],'#123456')
        cube.evaluate('(e)=>{window.waveAnimation=e.shadowRoot.querySelector(".energy-contour").getAnimations()[0];window.cubeRenders=0;const r=e.render;e.render=function(){cubeRenders++;return r.call(this)}}')
        self.state(1,'power','3.7');self.page.wait_for_timeout(400)
        self.assertTrue(cube.evaluate('(e)=>e.shadowRoot.querySelector(".energy-contour").getAnimations()[0]===waveAnimation'))
        self.page.evaluate('window.cubeRenders=0;for(let i=0;i<100;i++)pushState("sensor.unrelated",String(i))');self.page.wait_for_timeout(120);self.assertEqual(self.page.evaluate('cubeRenders'),0)
        self.page.emulate_media(reduced_motion='reduce');self.page.wait_for_timeout(80);self.assertFalse(cube.evaluate('(e)=>e.hasAttribute("energy-wave-running")'))
        self.page.emulate_media(reduced_motion='no-preference');self.page.wait_for_timeout(80)
        self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");self.assertFalse(cube.evaluate('(e)=>e.hasAttribute("energy-wave-running")'))
        self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
        self.state(1,'power','0');self.assertFalse(cube.evaluate('(e)=>e.hasAttribute("energy-wave-running")'));self.page.evaluate('hub.remove()');self.page.wait_for_timeout(100)
        self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0);self.assert_no_commands()

    def test_light_and_sonos_context_survive_charger_navigation(self):
        self.overview([charger(1)],extra=[{'type':'light','entity':'light.zone_a','slot':2},{'type':'sonos','entity':'media_player.player_a','slot':3}]);self.open_details()
        self.activate(self.cell(0).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.hold_input(self.cell(2).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.cell(1).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)'),['light','turn_on',{'brightness_pct':100},{'entity_id':'light.zone_a'}])
        self.activate(self.cell(0).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.hold_input(self.cell(3).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.cell(2).locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','media_play_pause',{}, {'entity_id':'media_player.player_a'}])
        self.assertEqual(self.page.evaluate('calls.filter(c=>c[0]==="switch").length'),0)

    def test_complete_yaml_examples_compile_in_real_browser(self):
        for name in ['charger-easee.yaml','charger-multi.yaml']:
            if self.page.evaluate('!!window.hub'):self.page.evaluate('hub.remove()')
            self.page.evaluate('if(window.floor)floor.remove()')
            document=yaml.safe_load((Path(__file__).resolve().parents[2]/'examples'/name).read_text())
            config=document['views'][0]['cards'][0]['elements'][0]
            self.page.evaluate(FLOORPLAN,config)
            self.page.evaluate('''async([width,image])=>{floor.style.width=width+'px';imageHost.style.height=width*2/3+'px';floorImage.src=image;await floorImage.decode()}''',[min(900,self.viewport['width']),document['views'][0]['cards'][0]['image']])
            self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")');self.settle();self.assertEqual(self.model(0)['name'],'7.4 kW' if name=='charger-easee.yaml' else '14.8 kW')
            self.open_details();self.assertEqual(self.model(3)['secondary'],'2.50 kWh');self.assert_no_commands();self.capture('documented-'+name[:-5])

    def test_zero_many_numeric_auto_and_keyboard_accessibility(self):
        self.hub({'logo':False,'items':[{'type':'charging-hub','slot':0,'chargers':[]}]})
        self.assertEqual(self.model(0)['name'],'0.0 kW');self.assertEqual(self.model(0)['secondary'],'0 cars');self.assert_no_commands()
        self.page.evaluate('hub.remove();window.testChargerCount=26');self.page.evaluate(SEED)
        self.overview([charger(i) for i in range(1,27)]);self.assertEqual(self.controls().count(),27)
        self.assertEqual(self.model(0)['name'],'192.4 kW');self.assertEqual(self.model(0)['secondary'],'26 cars');self.page.wait_for_timeout(100)
        running=self.controls().evaluate_all('(els)=>els.filter(e=>e.hasAttribute("energy-wave-running")).length');self.assertLessEqual(running,24)
        self.page.evaluate('hub.remove()')
        for size,reference,width in [(60,None,900),(82,None,900),('auto',900,450)]:
            config={'type':'custom:honeycomb-persistent-control','module':'charger',**{k:v for k,v in charger().items() if k not in ('type','slot')},'size':size}
            if reference:config['auto_reference_width']=reference
            self.page.evaluate(FLOORPLAN,config);self.page.evaluate('w=>{floor.style.width=w+"px";imageHost.style.height=w*2/3+"px"}',width);self.page.wait_for_timeout(100)
            control=self.page.locator('hui-picture-elements-card honeycomb-persistent-control').last
            self.assertAlmostEqual(control.bounding_box()['width'],41 if size=='auto' else size,delta=.1)
            control.locator('.interaction-surface').press('Enter');self.page.wait_for_function('view.querySelector("honeycomb-menu-ng")')
            self.assert_no_commands();self.page.evaluate('ng.close();hub.remove();floor.remove()');self.page.wait_for_timeout(300)

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Charger.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Charger.url=f'http://127.0.0.1:{server.server_port}';Charger.evidence=args.evidence_dir
            for width,height in [(1100,900),(390,844)]:
                Charger.viewport={'width':width,'height':height};names=[n for n in Charger.__dict__ if n.startswith('test_')]
                r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Charger(n) for n in names));success=r.wasSuccessful() and success
            Charger.browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
