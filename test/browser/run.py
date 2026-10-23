"""Real Chromium, synthetic HA shell. Browser plugin not available.
Baseline mode captures only the unchanged v1.5.1 bundle supplied by git.
"""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import io
from PIL import Image, ImageChops, ImageStat
import os
from pathlib import Path
import shutil
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BUTTON_SHA = '5d6e9c6afca01e8014653fa56bb5d6aa9248d832c34fb944a7f2c36329bc22d1'

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        paths = {'/station-full-bleed.svg': ROOT/'test/browser/assets/station-full-bleed.svg', '/mdi-icons.js': ROOT/'test/browser/assets/mdi-icons.js', '/': ROOT/'test/browser/fixture.html', '/bundle.js': self.server.bundle, '/button-card.js': self.server.button, '/layout.svg': ROOT/'docs/assets/layout-slots.svg', '/station-a.svg': ROOT/'test/browser/assets/station-a.svg', '/station-c.svg': ROOT/'test/browser/assets/station-c.svg'}
        if self.path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        if self.path not in paths:
            self.send_error(404); return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html' if self.path == '/' else 'image/svg+xml' if self.path.endswith('.svg') else 'text/javascript')
        self.end_headers()
        payload=paths[self.path].read_bytes()
        if self.path=='/':
            native=b'favorites_cache_sensor was removed' in self.server.bundle.read_bytes()
            payload=payload.replace(b'window.nativeFavoritesOnly=false;',b'window.nativeFavoritesOnly='+str(native).lower().encode()+b';')
        self.wfile.write(payload)
    def log_message(self, *args): pass

class CheckResult(unittest.TextTestResult):
    def printErrors(self):
        super().printErrors()
        if os.getenv('GITHUB_ACTIONS') == 'true':
            for test, detail in self.errors+self.failures:
                detail=detail.replace('%','%25').replace('\r','%0D').replace('\n','%0A')
                print(f'::error title={test.id()}::{detail}',flush=True)


class Cubes(unittest.TestCase):
    def setUp(self):
        self.page = self.browser.new_page(viewport=self.viewport,has_touch=self.viewport['width']<500)
        self.page.set_default_timeout(7000)
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('console',lambda e:self.errors.append(e.text) if e.type=='error' else None)
        self.page.goto(self.url); self.page.wait_for_function('window.ready')
        self.native_only=self.page.evaluate('window.nativeFavoritesOnly')
        self.page.evaluate("window.ng=window.honeycombNG || {createContext:window.honeycomb_menu_create_context,openInContext:window.honeycomb_menu_in_context,updateBase:window.honeycomb_menu_context_update_base,disposeContext:window.honeycomb_menu_context_dispose,closeInContext:window.honeycomb_menu_context_close,backInContext:window.honeycomb_menu_context_back,close:window.honeycomb_menu_close,back:window.honeycomb_menu_back,templates:window.honeycomb_menu_templates,open:window.honeycomb_menu}")
        self.assertEqual(self.page.title(),'Honeycomb shared cube test')
        self.assertTrue(self.page.locator('h1').is_visible())
    def tearDown(self):
        try:
            self.assertEqual(self.errors,[])
            self.assertEqual(self.page.locator('hui-error-card').count(),0)
        finally: self.page.close()
    def hub(self, config):
        if not self.native_only:
            # Immutable historical bundles still use their original cache source.
            import copy
            config=copy.deepcopy(config)
            def historical(value):
                if isinstance(value,dict):
                    if value.get('type') in ('sonos','media') or value.get('module')=='sonos':value.setdefault('favorites_cache_sensor','sensor.favorites_cache')
                    for child in value.values():historical(child)
                elif isinstance(value,list):
                    for child in value:historical(child)
            historical(config)
        self.page.evaluate('config=>makeHub(config)',config)
        self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")')
    def settle(self):
        self.page.evaluate('''async()=>{await new Promise(r=>requestAnimationFrame(r));for(const menu of view.querySelectorAll(':is(honeycomb-menu-ng,honeycomb-menu)')){await menu.updateComplete;await Promise.all(menu.shadowRoot.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))}}''')
    def capture(self, name):
        self.settle()
        if self.evidence:
            self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-{name}.png'))
    def controls(self):
        return self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) :is(honeycomb-menu-ng-item,honeycomb-menu-item), :is(honeycomb-menu-ng,honeycomb-menu) honeycomb-persistent-control')
    def hold(self, locator):
        box=locator.bounding_box();self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        self.page.mouse.down();self.page.wait_for_timeout(600);self.page.mouse.up()
    def back(self):
        self.page.evaluate('ng.backInContext(hub._menuContext)')
    def issue78_hub(self):
        self.page.evaluate('''()=>{
            pushState('light.zone_b','on',{brightness:200,hs_color:[210,65],rgb_color:[89,172,255],supported_color_modes:['hs','color_temp']});
            for(const [id,value] of Object.entries({
                'number.zone_a_normal_brightness':60,'number.zone_a_standard_kelvin':2700,
                'number.zone_b_normal_brightness':70,'number.zone_b_standard_kelvin':3000,
                'number.zone_b_standard_hue':210,'number.zone_b_standard_saturation':65
            }))pushState(id,String(value));
        }''')
        self.hub({'logo':'auto','items':[
            {'type':'light','entity':'light.zone_a','name':'Zone A','presets':{
                'brightness':{'entity':'number.zone_a_normal_brightness'},'kelvin':{'entity':'number.zone_a_standard_kelvin'}}},
            {'type':'light','entity':'light.zone_b','name':'Zone B','presets':{
                'brightness':{'entity':'number.zone_b_normal_brightness'},'kelvin':{'entity':'number.zone_b_standard_kelvin'},
                'color':{'hue_entity':'number.zone_b_standard_hue','saturation_entity':'number.zone_b_standard_saturation'}}},
            {'type':'media','entity':'media_player.player_a','name':'Media','favorites_sensor':'sensor.favorites'}]})
        self.settle()
    def activate(self, target):
        if self.viewport['width']<500: target.tap()
        else: target.click()
    def hold_input(self, target):
        if self.viewport['width']>=500:
            self.hold(target);return
        box=target.bounding_box()
        session=self.page.context.new_cdp_session(self.page)
        try:
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
            self.page.wait_for_timeout(600)
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        finally: session.detach()
    def assert_visible_unique_cells(self, count):
        self.settle()
        cells=self.controls()
        self.assertEqual(cells.count(),count)
        for cell in cells.all():
            self.assertTrue(cell.is_visible(),cell.get_attribute('data-honeycomb-slot'))
            self.assertEqual(cell.evaluate('(el)=>getComputedStyle(el).visibility'),'visible')
            self.assertEqual(cell.evaluate('(el)=>parseFloat(getComputedStyle(el).width)'),82)
        positions=cells.evaluate_all('(els)=>els.map(el=>{const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y)].join(",")})')
        self.assertEqual(len(set(positions)),count)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
    def test_issue78_hub_launchers_survive_repeated_light_navigation(self):
        self.issue78_hub()
        root_geometry=self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop,el.offsetWidth,el.offsetHeight])')
        self.page.evaluate('''()=>{window.rootMenu=hub._hubMenu;window.rootCubes=[...rootMenu.shadowRoot.querySelectorAll(':is(honeycomb-menu-ng-item,honeycomb-menu-item),honeycomb-persistent-control')]}''')
        for cycle in range(2):
            for slot,entity in [(1,'light.zone_a'),(3,'light.zone_b')]:
                launcher=self.page.locator(f':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="{slot}"] .interaction-surface')
                calls_before=self.page.evaluate('calls.length')
                self.activate(launcher)
                self.assertEqual(self.page.evaluate('calls.length'),calls_before+1)
                self.assertEqual(self.page.evaluate('calls.at(-1)'),['homeassistant','toggle',{}, {'entity_id':entity}])
                self.hold_input(launcher)
                self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
                self.assert_visible_unique_cells(7)
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Color"]'))
                self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===18')
                self.assert_visible_unique_cells(19)
                # Return through the visible center controls, using real touch on mobile.
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===1')
                self.assert_visible_unique_cells(7)
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===0')
                self.assert_visible_unique_cells(4)
                self.assertEqual(self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop,el.offsetWidth,el.offsetHeight])'),root_geometry)
                self.assertTrue(self.page.evaluate('hub._hubMenu===rootMenu && rootCubes.every(el=>el.isConnected && el.style.visibility!=="hidden")'))
        self.capture('issue78-restored-hub')
        # Full close from a nested palette must produce exactly one clean base overlay.
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="1"] .interaction-surface'))
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Color"]'))
        self.page.evaluate('ng.closeInContext(hub._menuContext)')
        self.page.wait_for_function('hub._hubMenu && hub._hubMenu!==rootMenu && hub._menuContext.stack.length===0')
        self.assert_visible_unique_cells(4)
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="3"] .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.assert_visible_unique_cells(7)
    def test_issue78_light_slot_mapping_presets_and_capabilities(self):
        self.issue78_hub()
        for slot,labels,preset in [(1,['100%','60%','Color','2700K','5%','5%'],'kelvin'),(3,['100%','70%','Color','210° · 65%','5%','5%'],'color')]:
            self.hold_input(self.page.locator(f':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="{slot}"] .interaction-surface'))
            self.assert_visible_unique_cells(7)
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item) .interaction-surface').evaluate_all('(els)=>els.map(el=>el.getAttribute("aria-label"))'),labels)
            mapping=self.page.evaluate('hub._hubMenu.buttons.map(b=>({slot:b.slot,action:b.tap_action.action,preset:b.tap_action.preset_type||null}))')
            self.assertEqual([b['slot'] for b in mapping],list(range(1,7)))
            self.assertEqual([b['preset'] for b in mapping],[None,'brightness',None,preset,None,None])
            self.assertEqual(mapping[2]['action'],'honeycomb-open-nested')
            self.capture(f'issue78-light-{preset}')
            target=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="3"] .interaction-surface')
            self.activate(target)
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'turn_on')
            self.hold_input(target)
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'set_value')
            self.back()
        # The existing capability-dependent slot 3 is White for temperature-only
        # lights and a passive Light action for brightness-only lights.
        for modes,label in [(['color_temp'],'White'),(['brightness'],'Light')]:
            self.page.evaluate('modes=>pushState("light.zone_a","on",{brightness:128,min_color_temp_kelvin:2200,max_color_temp_kelvin:6500,supported_color_modes:modes})',modes)
            self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="1"] .interaction-surface'))
            self.assert_visible_unique_cells(7)
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="2"] .interaction-surface').get_attribute('aria-label'),label)
            if label=='White':
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="White"]'))
                self.assert_visible_unique_cells(19)
                self.assertTrue(self.page.evaluate('hub._hubMenu.buttons.slice(6).every(b=>b.tap_action.data.color_temp_kelvin>0)'))
                self.back()
            self.back()
    def test_standalone_launcher_restores_after_close(self):
        self.page.evaluate('makeControl({module:"light",entity:"light.zone_a"})')
        target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
        for cycle in range(2):
            self.hold_input(target)
            self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
            self.assertEqual(self.page.locator('body > honeycomb-persistent-control').evaluate('(el)=>getComputedStyle(el).visibility'),'hidden')
            self.page.evaluate('ng.close()')
            self.page.wait_for_function('!view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
            self.assertTrue(target.is_visible())
    def placements(self, hub='hub'):
        return self.page.evaluate(f'Object.fromEntries({hub}._placements)')
    def hub_item(self, index):
        return self.page.locator(f':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[{index}]"]')
    def test_phase2_priority_center_hidden_hard_and_stable_soft_positions(self):
        self.page.evaluate("pushState('device_tracker.vehicle_a','away')")
        self.hub({'logo':False,'items':[
            {'type':'light','entity':'light.zone_a','slot':0,'slot_mode':'hard'},
            {'type':'generic','name':'Reserved','slot':2,'slot_mode':'hard','visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'disabled'}]},
            {'type':'generic','name':'Vehicle A','slot':1,'slot_mode':'priority','visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'home'}]},
            {'type':'generic','name':'Item A','slot_mode':'soft'},
            {'type':'generic','name':'Item B','slot_mode':'soft'}]})
        self.assertEqual(self.placements(),{'items[0]':0,'items[3]':1,'items[4]':3})
        self.page.evaluate('window.stableCube=hub._hubMenu.shadowRoot.querySelector(\'[data-honeycomb-id="items[4]"]\')')
        stable_box=self.hub_item(4).bounding_box()
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.page.wait_for_function('hub._placements.has("items[2]")')
        self.assertEqual(self.placements(),{'items[0]':0,'items[2]':1,'items[3]':4,'items[4]':3})
        self.assert_visible_unique_cells(4)
        self.assertEqual(self.hub_item(4).bounding_box(),stable_box)
        self.assertTrue(self.page.evaluate('stableCube.isConnected'))
        self.page.evaluate("pushState('device_tracker.vehicle_a','away')")
        self.page.wait_for_function('!hub._placements.has("items[2]")')
        self.assertEqual(self.placements(),{'items[0]':0,'items[3]':4,'items[4]':3})
        self.page.evaluate('hub.setConfig({...hub.config})')
        self.settle()
        actual=self.page.evaluate('''()=>Object.fromEntries([...hub._hubMenu.shadowRoot.querySelectorAll('[data-honeycomb-id]')].filter(el=>el.dataset.honeycombId).map(el=>[el.dataset.honeycombId,el.classList.contains('center-item')?0:Number(el.dataset.honeycombSlot)+1]))''')
        self.assertEqual(actual,self.placements())
        self.assertEqual(self.placements()['items[3]'],4)
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.page.wait_for_function('hub._placements.has("items[2]")')
        self.assertEqual(self.placements()['items[2]'],1)
        self.capture('phase2-priority')
    def test_phase2_defer_visibility_until_light_descendants_close_and_preserve_issue78(self):
        self.issue78_hub()
        self.page.evaluate('''()=>{pushState('device_tracker.vehicle_a','home');hub.setConfig({...hub.config,items:hub.config.items.map((item,i)=>i===0?{...item,visibility:[{condition:'state',entity:'device_tracker.vehicle_a',state:'home'}]}:item)})}''')
        self.settle()
        initial=self.placements(); self.assertEqual(len(initial),3)
        other_boxes=[self.hub_item(i).bounding_box() for i in [1,2]]
        self.hold_input(self.hub_item(0).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        menu_box=self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop])')
        allocations=self.page.evaluate('hub._hubMetrics.allocations')
        self.page.evaluate("pushState('device_tracker.vehicle_a','away');pushState('light.zone_a','on',{brightness:230,rgb_color:[255,128,0],supported_color_modes:['hs','color_temp']})")
        self.settle()
        self.assertEqual(self.placements(),initial)
        self.assertEqual(self.page.evaluate('hub._hubMetrics.allocations'),allocations)
        self.assertEqual(self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop])'),menu_box)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .secondary').inner_text(),'90%')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Color"]'))
        self.assert_visible_unique_cells(19)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.assert_visible_unique_cells(7)
        self.assertEqual(self.placements(),initial)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('!hub._placements.has("items[0]")')
        self.assert_visible_unique_cells(3) # branding + the other Light and Media
        self.assertEqual([self.hub_item(i).bounding_box() for i in [1,2]],other_boxes)
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.page.wait_for_function('hub._placements.has("items[0]")')
        self.assert_visible_unique_cells(4)
        self.hold_input(self.hub_item(0).locator('.interaction-surface'))
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Color"]'))
        self.page.evaluate("window.oldMenu=hub._hubMenu;pushState('device_tracker.vehicle_a','away');ng.closeInContext(hub._menuContext)")
        self.page.wait_for_function('hub._hubMenu && hub._hubMenu!==oldMenu && !hub._placements.has("items[0]")')
        self.assert_visible_unique_cells(3)
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.page.wait_for_function('hub._placements.has("items[0]")')
        self.hold_input(self.hub_item(0).locator('.interaction-surface'))
        self.assert_visible_unique_cells(7)
        self.back();self.assert_visible_unique_cells(4)
        self.capture('phase2-restored-hub')
    def test_phase2_pointer_release_cancel_and_delayed_tap_keep_original_identity(self):
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        config={'logo':False,'items':[
            {'type':'generic','name':'Original','slot_mode':'soft','tap_action':{'action':'perform-action','perform_action':'test.original'},
             'double_tap_action':{'action':'perform-action','perform_action':'test.double'},
             'visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'home'}]},
            {'type':'generic','name':'Replacement','slot':0,'slot_mode':'priority','tap_action':{'action':'perform-action','perform_action':'test.replacement'},
             'visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'away'}]}]}
        self.hub(config)
        target=self.hub_item(0).locator('.interaction-surface');box=target.bounding_box()
        session=self.page.context.new_cdp_session(self.page) if self.viewport['width']<500 else None
        def down():
            if session: session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+41,'y':box['y']+40}]})
            else: self.page.mouse.move(box['x']+41,box['y']+40);self.page.mouse.down()
        def up():
            if session: session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            else: self.page.mouse.up()
        try:
            down();self.page.evaluate("pushState('device_tracker.vehicle_a','away')");self.settle()
            self.assertEqual(self.placements(),{'items[0]':0});self.assertTrue(target.is_visible())
            up();self.page.wait_for_timeout(100)
            self.assertEqual(self.placements(),{'items[0]':0}) # double-tap window still owns the identity
            self.page.wait_for_function('hub._placements.has("items[1]")')
            self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['original'])
            self.assertEqual(self.placements(),{'items[1]':0})
            self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
            self.page.wait_for_function('hub._placements.has("items[0]")')
            down();self.page.evaluate("pushState('device_tracker.vehicle_a','away')")
            if session: session.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
            else:
                target.dispatch_event('pointercancel',{'pointerId':1,'pointerType':'mouse'})
                self.page.mouse.up()
            self.page.wait_for_function('hub._placements.has("items[1]")')
            self.page.wait_for_timeout(350)
            self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['original'])
            self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
            self.page.wait_for_function('hub._placements.has("items[0]")')
            self.activate(self.hub_item(0).locator('.interaction-surface'))
            self.page.evaluate("pushState('device_tracker.vehicle_a','away');window.dispatchEvent(new Event('blur'))")
            self.page.wait_for_function('hub._placements.has("items[1]")')
            self.page.wait_for_timeout(350)
            self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['original'])
            self.hub_item(1).locator('.interaction-surface').press('Enter')
            self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['original','replacement'])
        finally:
            if session: session.detach()
    def test_phase2_multiple_hubs_are_isolated_and_drag_select_uses_frozen_target(self):
        self.page.evaluate("pushStates([['device_tracker.vehicle_a','home'],['device_tracker.vehicle_b','home']])")
        items=[{'type':'generic','name':'Item A','slot':2,'slot_mode':'hard','tap_action':{'action':'perform-action','perform_action':'test.item_a'}},
            {'type':'generic','name':'Item B','slot':3,'slot_mode':'hard','tap_action':{'action':'perform-action','perform_action':'test.item_b'},
             'visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'home'}]}]
        self.hub({'logo':False,'items':items})
        self.page.evaluate('''()=>{window.firstHub=hub;makeHub({logo:false,items:[{type:'generic',name:'Other Hub',slot_mode:'soft',visibility:[{condition:'state',entity:'device_tracker.vehicle_b',state:'home'}]}]});window.secondHub=hub;secondHub.id='second-hub';secondHub.style.top='550px';window.hub=firstHub}''')
        self.page.wait_for_function('secondHub._hubMenu?.shadowRoot.querySelector("#honeycombs")')
        self.settle()
        targets=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[1]"] .interaction-surface');target=targets.first
        box=target.bounding_box();self.page.mouse.move(box['x']+20,box['y']+40);self.page.mouse.down()
        self.page.evaluate("pushStates([['device_tracker.vehicle_a','away'],['device_tracker.vehicle_b','away']])")
        self.page.wait_for_function('secondHub._placements.size===0')
        self.assertTrue(self.page.evaluate('firstHub._placements.has("items[1]")'))
        self.page.mouse.move(box['x']+55,box['y']+40,steps=4);self.page.mouse.up()
        self.page.wait_for_function('!firstHub._placements.has("items[1]")')
        self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['item_b'])
        self.page.evaluate('''()=>{ng.disposeContext(secondHub._menuContext);secondHub.remove()}''')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
    def test_phase2_availability_show_invalid_inputs_and_live_dependency_reconfiguration(self):
        self.page.evaluate("pushStates([['device_tracker.vehicle_a','home'],['binary_sensor.permission_a','off'],['light.zone_a','unavailable']])")
        self.hub({'logo':False,'items':[
            {'type':'light','entity':'light.zone_a','slot':0},
            {'type':'generic','name':'Vehicle A','slot':2,'slot_mode':'priority','show':"[[[ return states['binary_sensor.permission_a'].state === 'on' ]]]",
             'visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'home'}]},
            {'type':'generic','name':'Missing input','slot':3,'visibility':[{'condition':'not','conditions':[{'condition':'state','entity':'device_tracker.missing_a','state':'home'}]}]}]})
        self.assertEqual(self.placements(),{'items[0]':0})
        self.assertEqual(self.hub_item(0).locator('.secondary').inner_text(),'Unavailable')
        self.assertTrue(self.page.evaluate('hub.diagnostics.some(d=>d.code==="visibility-indeterminate")'))
        self.page.evaluate("pushState('binary_sensor.permission_a','on')")
        self.page.wait_for_function('hub._placements.has("items[1]")')
        self.page.evaluate("pushState('device_tracker.vehicle_a','away')")
        self.page.wait_for_function('!hub._placements.has("items[1]")')
        self.page.evaluate('''()=>{pushState('device_tracker.vehicle_b','home');hub.setConfig({...hub.config,items:hub.config.items.map((item,i)=>i===1?{...item,visibility:[{condition:'state',entity:'device_tracker.vehicle_b',state:'home'}]}:item)})}''')
        self.page.wait_for_function('hub._placements.has("items[1]")')
        before=self.page.evaluate('hub._visibilityIndex.metrics.evaluations')
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.settle();self.assertEqual(self.page.evaluate('hub._visibilityIndex.metrics.evaluations'),before)
        for condition in [{'condition':'xor'},{'condition':'state','entity':'device_tracker.vehicle_a'}]:
            message=self.page.evaluate('''condition=>{try {const el=document.createElement('honeycomb-persistent-hub');el.setConfig({items:[{type:'generic',visibility:[condition]}]});return null}catch(e){return e.message}}''',condition)
            self.assertIn('items[0].visibility',message)
    def test_phase2_overflow_keeps_all_dependencies_and_all_hidden_hub_is_valid(self):
        self.page.evaluate('''()=>pushStates(Array.from({length:250},(_,i)=>['binary_sensor.item_'+i,'off']))''')
        self.hub({'logo':False,'size':8,'items':[{'type':'generic','name':f'Item {i}','slot_mode':'soft','visibility':[{'condition':'state','entity':f'binary_sensor.item_{i}','state':'on'}]} for i in range(250)]})
        self.assertEqual(self.controls().count(),0)
        self.assertEqual(self.page.evaluate('hub._hubEntries.length'),250)
        self.page.evaluate("pushState('binary_sensor.item_249','on')")
        self.page.wait_for_function('hub._placements.has("items[249]")')
        self.assertEqual(self.controls().count(),1)
        self.page.evaluate('''()=>pushStates(Array.from({length:250},(_,i)=>['binary_sensor.item_'+i,'on']))''')
        self.page.wait_for_function('hub._placements.size===217')
        self.assertEqual(self.controls().count(),217)
        self.assertEqual(self.page.evaluate('hub.diagnostics.filter(d=>d.code==="overflow").length'),33)
        self.assertEqual(self.page.evaluate('hub._visibilityIndex.conditions.size'),250)
        self.page.evaluate('''()=>pushStates(Array.from({length:250},(_,i)=>['binary_sensor.item_'+i,'off']))''')
        self.page.wait_for_function('hub._placements.size===0')
        self.assertEqual(self.controls().count(),0)
        self.capture('phase2-empty-hub')
    def test_phase2_collision_rules_preclaim_and_invalid_slots_are_diagnosed(self):
        self.hub({'logo':False,'items':[
            {'type':'generic','name':'Reserved','slot':0,'slot_mode':'hard','visibility':[{'condition':'state','entity':'sensor.value_a','state':'0'}]},
            {'type':'generic','name':'Duplicate','slot':0,'slot_mode':'hard'},
            {'type':'generic','name':'Fallback','slot':0,'slot_mode':'priority'},
            {'type':'generic','name':'Preferred','slot':1,'slot_mode':'priority'},
            {'type':'generic','name':'Tie','slot':1,'slot_mode':'priority'},
            {'type':'generic','name':'Invalid','slot':1.5,'slot_mode':'hard'},
            {'type':'generic','name':'Soft','slot_mode':'soft'}]})
        self.assertEqual(self.placements(),{'items[3]':1,'items[2]':2,'items[4]':3,'items[6]':4})
        self.assertEqual(self.page.evaluate('hub.diagnostics.map(d=>d.code).sort()'),['hard-collision','invalid-slot'])
        self.assert_visible_unique_cells(4)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item').count(),0)
    def test_phase2_performance_relevant_unrelated_updates_and_dom_listeners(self):
        rows=[]
        for count in [5,20,50]:
            self.page.evaluate('''count=>pushStates(Array.from({length:count},(_,i)=>['binary_sensor.item_'+i,'on']))''',count)
            self.hub({'logo':False,'size':20,'items':[{'type':'generic','name':f'Item {i}','entity':'sensor.value_a','slot_mode':'soft',
                'visibility':[{'condition':'state','entity':f'binary_sensor.item_{i}','state':'on'}]} for i in range(count)]})
            self.settle()
            self.page.evaluate("pushState('sensor.warmup','1')")
            self.settle()
            session=self.page.context.new_cdp_session(self.page)
            try:
                session.send('HeapProfiler.collectGarbage')
                dom_before=session.send('Memory.getDOMCounters')
                heap_before=session.send('Runtime.getHeapUsage')['usedSize']
                result=self.page.evaluate('''async count=>{
                    const proto=Object.getPrototypeOf((customElements.get('honeycomb-menu-ng-item') || customElements.get('honeycomb-menu-item')).prototype);
                    const render=proto.render;window.itemRenders={};
                    proto.render=function(){const id=this.config && this.config._hub_item_id;if(id)itemRenders[id]=(itemRenders[id]||0)+1;return render.call(this)};
                    const start={evaluations:hub._visibilityIndex.metrics.evaluations,allocations:hub._hubMetrics.allocations};
                    const started=performance.now();
                    for(let i=0;i<1000;i++)pushState('sensor.unrelated',String(i));
                    await new Promise(requestAnimationFrame);
                    return {count,visible:hub._placements.size,unrelated:{elapsedMs:performance.now()-started,
                        evaluations:hub._visibilityIndex.metrics.evaluations-start.evaluations,
                        allocations:hub._hubMetrics.allocations-start.allocations,renders:{...itemRenders}},
                        providerCount:[...providedClients].filter(el=>el.isConnected).length,restoreRender:window.restoreRender=()=>{delete proto.render;proto.render=render}};
                }''',count)
                dom_unrelated=session.send('Memory.getDOMCounters')
                self.assertEqual(result['unrelated']['evaluations'],0)
                self.assertEqual(result['unrelated']['allocations'],0)
                self.assertEqual(result['unrelated']['renders'],{})
                self.assertEqual(result['visible'],count)
                self.assertEqual(result['providerCount'],2) # one Hub and one owning scene, independent of item count
                self.assertEqual(dom_unrelated,dom_before)
                relevant=self.page.evaluate('''async()=>{
                    const before={evaluations:hub._visibilityIndex.metrics.evaluations,allocations:hub._hubMetrics.allocations};
                    const started=performance.now();
                    for(let i=0;i<20;i++){
                        pushState('binary_sensor.item_0',i%2?'on':'off');
                        await new Promise(requestAnimationFrame);
                        await new Promise(requestAnimationFrame);
                    }
                    return {elapsedMs:performance.now()-started,evaluations:hub._visibilityIndex.metrics.evaluations-before.evaluations,
                        allocations:hub._hubMetrics.allocations-before.allocations,renders:{...itemRenders}};
                }''')
                self.assertEqual(relevant['evaluations'],20);self.assertEqual(relevant['allocations'],20)
                self.assertTrue(all(identity=='items[0]' for identity in relevant['renders']),relevant)
                session.send('HeapProfiler.collectGarbage')
                result.pop('restoreRender',None)
                result.update({'relevant':relevant,'domBefore':dom_before,'domAfterUnrelated':dom_unrelated,
                    'domAfterRelevant':session.send('Memory.getDOMCounters'),'heapBefore':heap_before,'heapAfter':session.send('Runtime.getHeapUsage')['usedSize']})
                rows.append(result)
            finally:
                self.page.evaluate('window.restoreRender && window.restoreRender()')
                session.detach()
                self.page.evaluate('''()=>{const scene=hub._menuContext.honeycomb;ng.disposeContext(hub._menuContext);hub.remove();providedClients.delete(hub);providedClients.delete(scene)}''')
        if self.evidence:
            (self.evidence/f'{self.viewport["width"]}-hub-performance.json').write_text(json.dumps({'viewport':self.viewport,'rows':rows,
                'caveat':'Current Chromium fixture; frame-paced relevant times include frame waits. Heap values include browser/framework caches; no historical speedup or leak claim.'},indent=2)+'\n')
    def test_phase2_coalescing_blur_cleanup_and_replacement_menu_deferral(self):
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.hub({'logo':False,'items':[{'type':'generic','name':'Item A','slot_mode':'soft',
            'tap_action':{'action':'perform-action','perform_action':'test.item_a'},
            'visibility':[{'condition':'state','entity':'device_tracker.vehicle_a','state':'home'}],
            'menu':{'nested_expand':False,'animate':False,'buttons':[{'name':'Details','show_name':True,'tap_action':{'action':'none'}}]}}]})
        target=self.hub_item(0).locator('.interaction-surface');box=target.bounding_box()
        allocations=self.page.evaluate('hub._hubMetrics.allocations')
        self.page.mouse.move(box['x']+41,box['y']+40);self.page.mouse.down()
        self.page.evaluate("pushState('device_tracker.vehicle_a','away');pushState('device_tracker.vehicle_a','home')")
        self.page.mouse.up();self.settle()
        self.assertEqual(self.page.evaluate('hub._hubMetrics.allocations'),allocations)
        self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['item_a'])
        self.hold_input(target)
        self.page.wait_for_function('hub._menuContext.stack.length===1 && hub._hubMenu===hub._menuContext.honeycomb')
        self.page.evaluate("pushState('device_tracker.vehicle_a','away')");self.settle()
        self.assertEqual(self.placements(),{'items[0]':0})
        self.assertTrue(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Details"]').is_visible())
        self.back();self.page.wait_for_function('hub._placements.size===0')
        self.assertEqual(self.controls().count(),0)
        self.page.evaluate("pushState('device_tracker.vehicle_a','home')")
        self.page.wait_for_function('hub._placements.size===1')
        target=self.hub_item(0).locator('.interaction-surface');box=target.bounding_box()
        self.page.mouse.move(box['x']+41,box['y']+40);self.page.mouse.down()
        self.page.evaluate("pushState('device_tracker.vehicle_a','away');window.dispatchEvent(new Event('blur'))")
        self.page.wait_for_function('hub._placements.size===0')
        self.page.mouse.up();self.page.wait_for_timeout(550)
        self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['item_a'])
        self.assertEqual(self.page.evaluate('hub._menuContext.pointers.size+hub._menuContext.pendingActions.size'),0)
    def test_shared_default_size_and_rendered_parity(self):
        item={'type':'light','entity':'light.zone_a','show_name':True,'name':'Light A','label':'Status','show_label':True,
              'colors':{'center':'#20262d','inner_border':'#2196f3','outer_border':'#34383d'},'border':{'inner_width':4,'outer_width':2}}
        self.hub({'logo':False,'items':[item]})
        self.page.evaluate('item=>{makeControl({...item,type:"custom:honeycomb-persistent-control",module:"light"});control.id="second";control.style.top="500px"}',item)
        self.settle()
        values=self.page.evaluate('''()=>[hub._hubMenu.shadowRoot.querySelector('.center-item'),control].map(el=>({
            width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
            svg:el.shadowRoot.querySelector('.hex-svg').outerHTML,
            icon:getComputedStyle(el.shadowRoot.querySelector('ha-icon')).width,
            name:getComputedStyle(el.shadowRoot.querySelector('.primary')).fontSize,
            label:getComputedStyle(el.shadowRoot.querySelector('.secondary')).fontSize}))''')
        self.assertEqual(values[0],values[1]);self.assertEqual(values[0]['width'],82)
        self.assertAlmostEqual(values[0]['height'],82*1.1547,delta=.1)
        self.capture('shared-parity')
    def test_generic_media_sonos_have_identical_painted_cells_in_both_adapters(self):
        for module, entity in [('generic','sensor.value_a'),('media','media_player.player_a'),('sonos','media_player.player_a')]:
            self.hub({'logo':False,'items':[{'module':module,'entity':entity,'name':'Item A','show_name':True,'icon':'mdi:plus'}]})
            self.page.evaluate('config=>{makeControl(config);control.style.top="500px"}',{'module':module,'entity':entity,'name':'Item A','show_name':True,'icon':'mdi:plus'})
            self.settle()
            # Compare equal physical cells on the same device-pixel phase;
            # fractional scene origins otherwise add a screenshot edge row.
            self.page.evaluate("""()=>{const menu=hub._hubMenu;const r=menu.shadowRoot.querySelector('.center-item').getBoundingClientRect();menu.style.left=(parseFloat(menu.style.left)+Math.round(r.x)-r.x)+'px';menu.style.top=(parseFloat(menu.style.top)+Math.round(r.y)-r.y)+'px'}""")
            a=Image.open(io.BytesIO(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item').screenshot())).convert('RGB')
            b=Image.open(io.BytesIO(self.page.locator('body > honeycomb-persistent-control').screenshot())).convert('RGB')
            self.assertEqual(a.size,b.size)
            box=(10,10,a.width-10,a.height-10)
            difference=ImageChops.difference(a.crop(box),b.crop(box))
            self.assertLess(max(ImageStat.Stat(difference).mean),1, module+' painted parity')
            self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove();control.remove()')
    def test_canonical_hub_full_cell_colors_and_logo(self):
        self.hub({'logo':'auto','items':[{'type':'light','entity':'light.zone_a'},{'type':'sonos','entity':'media_player.player_a'}]})
        self.settle()
        self.assertEqual(self.controls().count(),3)
        faces=self.page.evaluate('''()=>[...hub._hubMenu.shadowRoot.querySelectorAll(':is(honeycomb-menu-ng-item,honeycomb-menu-item),honeycomb-persistent-control')].map(el=>({
            width:el.getBoundingClientRect().width,points:el.shadowRoot.querySelector('.hex-outer').getAttribute('points'),
            fill:el.shadowRoot.querySelector('.hex-fill').getAttribute('fill'),outer:el.shadowRoot.querySelector('.hex-outer').getAttribute('fill')}))''')
        self.assertTrue(all(f['width']==82 and f['points'].startswith('50,0 ') and f['outer']=='#34383d' for f in faces))
        self.assertIn('rgb(255, 128, 0)',[f['fill'] for f in faces])
        self.assertTrue(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .bee-icon').is_visible())
        self.capture('hub-reference')
    def test_logo_false_allows_functional_center_and_zero_items(self):
        self.hub({'logo':False,'items':[{'type':'generic','entity':'sensor.value_a','name':'Value A','slot':0}]})
        self.assertTrue(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .primary').is_visible())
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .bee-icon').count(),1) # generic default icon, not branding
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.hub({'logo':False,'items':[]})
        self.assertEqual(self.controls().count(),0)
        self.capture('empty-hub')
    def zoom_menu(self):
        return self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)')
    def zoom_palette(self):
        return self.page.evaluate("""()=>view.querySelector(':is(honeycomb-menu-ng,honeycomb-menu)').buttons.filter(b=>b && b.slot>=7).map(b=>b.tap_action.data.hs_color)""")
    def zoom_cell(self, slot):
        return self.page.locator(f':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="{slot-1}"] .interaction-surface')
    def zoom_tap(self, slot):
        target=self.zoom_cell(slot)
        if self.viewport['width']<500:target.tap()
        else:target.click()
    def zoom_open(self, standalone=False):
        if standalone:
            self.page.evaluate("makeControl({module:'light',entity:'light.zone_a'})")
            target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
        else:
            self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
            target=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface')
        self.hold_input(target)
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===6')
        self.zoom_tap(3)
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===18')
        self.settle()
    def test_issue85_zoom_fixed_slots_recursion_and_live_updates(self):
        self.zoom_open();original=self.zoom_palette();self.capture('issue85-original-palette')
        geometry=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot]').evaluate_all('(els)=>els.map(el=>[el.dataset.honeycombSlot,el.offsetLeft,el.offsetTop,el.offsetWidth])')
        for slot in [7,8,10,18]:
            self.hold_input(self.zoom_cell(slot))
            self.page.wait_for_function('hub._menuContext.stack.length===3')
            current=self.zoom_palette();self.assertEqual(current[slot-7],original[slot-7])
            self.assertEqual(self.page.evaluate('calls.length'),0,'Hold must not tap on release')
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot]').evaluate_all('(els)=>els.map(el=>[el.dataset.honeycombSlot,el.offsetLeft,el.offsetTop,el.offsetWidth])'),geometry)
            self.page.evaluate("pushState('light.zone_a','on',{brightness:200,hs_color:[210,85],supported_color_modes:['hs','color_temp']})")
            self.settle();self.assertEqual(self.zoom_palette(),current)
            if slot==8:self.capture('issue85-orange-zoom')
            self.back();self.page.wait_for_function('hub._menuContext.stack.length===2')
            self.assertEqual(self.zoom_palette(),original)
        history=[original]
        for slot in [10,18,7]:
            self.hold_input(self.zoom_cell(slot));self.settle();history.append(self.zoom_palette())
            self.assertEqual(self.page.evaluate('calls.length'),0)
        self.capture('issue85-recursive-zoom')
        for expected in reversed(history[:-1]):
            self.back();self.settle();self.assertEqual(self.zoom_palette(),expected)
        self.zoom_tap(8);self.assertEqual(self.page.evaluate('calls'),[['light','turn_on',{'hs_color':[25,85]},{'entity_id':'light.zone_a'}]])
    def test_issue85_control_keyboard_cancel_full_close_and_reset(self):
        self.zoom_open(True);original=self.zoom_palette()
        target=self.zoom_cell(10);target.press('Shift+Enter');self.settle()
        self.assertEqual(self.zoom_palette()[3],original[3]);self.assertEqual(self.page.evaluate('calls.length'),0)
        self.assertIn('zoom',self.zoom_cell(10).get_attribute('aria-label'))
        self.zoom_cell(10).press('Enter');self.assertEqual(self.page.evaluate('calls.length'),1)
        self.zoom_cell(10).press('Escape');self.page.wait_for_function('!view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
        self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'))
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===6')
        self.zoom_tap(3);self.settle();self.assertEqual(self.zoom_palette(),original)
        target=self.zoom_cell(8)
        target.dispatch_event('pointerdown',{'pointerId':77,'pointerType':'touch','clientX':30,'clientY':30,'button':0})
        target.dispatch_event('pointercancel',{'pointerId':77,'pointerType':'touch'})
        self.page.wait_for_timeout(550);self.assertEqual(self.zoom_palette(),original);self.assertEqual(self.page.evaluate('calls.length'),1)
        self.capture('issue85-control-reset')
    def kelvin_open(self,standalone=False,min_k=2000,max_k=6535):
        self.page.evaluate("([min,max])=>pushState('light.zone_a','on',{brightness:128,supported_color_modes:['color_temp'],min_color_temp_kelvin:min,max_color_temp_kelvin:max,color_temp_kelvin:3000})",[min_k,max_k])
        if standalone:
            self.page.evaluate("makeControl({module:'light',entity:'light.zone_a'})")
            self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'))
        else:
            self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
            self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===6')
        self.zoom_tap(3);self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===18');self.settle()
    def kelvin_palette(self):
        return self.page.evaluate('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(b=>b&&b.slot>=7).map(b=>b.tap_action.data.color_temp_kelvin)')
    def kelvin_snapshot(self):
        return self.page.evaluate('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(b=>b&&b.slot>=7).map(b=>({slot:b.slot,tap:b.tap_action,hold:b.hold_action,name:b.name,styles:b.styles}))')
    def test_issue99_solid_white_swatches_accessible_exact_kelvin_and_keyboard_tap(self):
        self.kelvin_open();values=self.kelvin_palette()
        self.assertEqual((values[0],values[-1]),(2000,6535));self.assertEqual(len(set(values)),12)
        for physical,value in enumerate(values,7):
            cell=self.sonos_slot(physical)
            self.assertEqual(cell.locator('ha-icon,.primary,.secondary').count(),0)
            self.assertIn(f'{value} K;',self.zoom_cell(physical).get_attribute('aria-label'))
            self.assertEqual(cell.bounding_box()['width'],82)
            color=cell.locator('.hex-fill').get_attribute('fill');expected=tuple(int(c) for c in color.removeprefix('rgb(').removesuffix(')').split(','))
            box=cell.bounding_box()
            # The pre-existing mobile envelope clips edge cells; DOM assertions
            # cover all twelve, pixel checks use fully visible cells only.
            if box['x']>=0 and box['x']+box['width']<=self.viewport['width']:
                pixel=Image.open(io.BytesIO(cell.screenshot())).convert('RGB');center=pixel.getpixel((41,pixel.height//2))
                self.assertEqual(center,expected,'Swatch center is temperature fill, never a black dot/text')
        self.capture('beta7-kelvin-solid-accessible')
        for physical in [7,12,18]:
            count=self.page.evaluate('calls.length');self.zoom_tap(physical)
            self.assertEqual(self.page.evaluate('calls.length'),count+1)
            self.assertEqual(self.page.evaluate('calls.at(-1)'),['light','turn_on',{'color_temp_kelvin':values[physical-7]},{'entity_id':'light.zone_a'}])
        self.zoom_cell(9).press('Enter');self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'color_temp_kelvin':values[2]})
        self.zoom_cell(10).press('Space');self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'color_temp_kelvin':values[3]})
        self.assertEqual(self.page.evaluate('calls.length'),5)
    def test_issue99_kelvin_endpoints_recursive_anchor_back_live_state_and_zoom_limit(self):
        self.kelvin_open();original=self.kelvin_snapshot();initial=self.kelvin_palette()
        geometry=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot]').evaluate_all('(els)=>els.map(el=>[el.dataset.honeycombSlot,el.offsetLeft,el.offsetTop,el.offsetWidth])')
        for physical in [7,8,10,18]:
            self.hold_input(self.zoom_cell(physical));self.page.wait_for_function('hub._menuContext.stack.length===3')
            current=self.kelvin_palette();self.assertEqual(current[physical-7],initial[physical-7]);self.assertEqual(len(set(current)),12)
            self.assertEqual(current,sorted(current));self.assertGreaterEqual(current[0],2000);self.assertLessEqual(current[-1],6535)
            self.assertEqual(self.page.evaluate('calls.length'),0)
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot]').evaluate_all('(els)=>els.map(el=>[el.dataset.honeycombSlot,el.offsetLeft,el.offsetTop,el.offsetWidth])'),geometry)
            self.page.evaluate("pushState('light.zone_a','on',{brightness:200,supported_color_modes:['color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6535,color_temp_kelvin:4500})")
            self.settle();self.assertEqual(self.kelvin_palette(),current)
            self.back();self.page.wait_for_function('hub._menuContext.stack.length===2');self.assertEqual(self.kelvin_snapshot(),original)
        history=[self.kelvin_snapshot()]
        for _ in range(16):
            prior=self.kelvin_snapshot();depth=self.page.evaluate('hub._menuContext.stack.length')
            self.hold_input(self.zoom_cell(8));self.settle()
            if self.kelvin_snapshot()==prior:
                self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),depth);break
            history.append(self.kelvin_snapshot())
            self.assertEqual(self.kelvin_palette()[1],initial[1]);self.assertEqual(self.page.evaluate('calls.length'),0)
        else:self.fail('Kelvin zoom must terminate at finite integer precision')
        self.assertEqual(self.kelvin_palette()[1]-self.kelvin_palette()[0],1)
        self.assertIn('zoom limit',self.zoom_cell(8).get_attribute('aria-label'));self.capture('beta7-kelvin-recursive-limit')
        for expected in reversed(history[:-1]):
            self.back();self.settle();self.assertEqual(self.kelvin_snapshot(),expected)
        self.assertEqual(self.kelvin_snapshot(),original)
    def test_issue99_kelvin_control_keyboard_cancel_close_reset_to_current_native_range(self):
        self.kelvin_open(True);original=self.kelvin_snapshot();anchor=self.kelvin_palette()[3]
        self.zoom_cell(10).press('Shift+Enter');self.settle();self.assertEqual(self.kelvin_palette()[3],anchor)
        self.zoom_cell(10).press('Shift+Space');self.settle();self.assertEqual(self.kelvin_palette()[3],anchor)
        self.assertEqual(self.page.evaluate('calls.length'),0)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle();self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle();self.assertEqual(self.kelvin_snapshot(),original)
        self.zoom_cell(8).dispatch_event('pointerdown',{'pointerId':77,'pointerType':'touch','clientX':30,'clientY':30,'button':0})
        self.zoom_cell(8).dispatch_event('pointercancel',{'pointerId':77,'pointerType':'touch'})
        self.page.wait_for_timeout(550);self.assertEqual(self.kelvin_snapshot(),original);self.assertEqual(self.page.evaluate('calls.length'),0)
        self.zoom_cell(8).press('Escape');self.page.wait_for_function('!view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
        self.page.evaluate("pushState('light.zone_a','on',{supported_color_modes:['color_temp'],min_color_temp_kelvin:1800,max_color_temp_kelvin:7200})")
        self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'));self.settle();self.zoom_tap(3);self.settle()
        self.assertEqual((self.kelvin_palette()[0],self.kelvin_palette()[-1]),(1800,7200));self.capture('beta7-kelvin-reset-native-range')
        self.page.evaluate("pushState('light.zone_a','on',{supported_color_modes:['color_temp'],min_color_temp_kelvin:2990,max_color_temp_kelvin:3001})")
        self.zoom_cell(8).press('Escape');self.page.wait_for_function('!view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
        self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'));self.settle();self.zoom_tap(3);self.settle()
        self.assertIn('zoom limit',self.zoom_cell(8).get_attribute('aria-label'))
        self.zoom_cell(8).press('Shift+Enter');self.assertEqual(self.page.evaluate('calls.length'),0)
        self.zoom_cell(8).press('Escape');self.page.wait_for_function('!view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')

    def test_issue99_kelvin_small_fixed_missing_and_invalid_native_ranges(self):
        self.kelvin_open(min_k=2990,max_k=2991)
        self.assertEqual(set(self.kelvin_palette()),{2990,2991});self.assertEqual(len(self.kelvin_palette()),12)
        self.hold_input(self.zoom_cell(8));self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.assertEqual(self.page.evaluate('calls.length'),0);self.assertIn('zoom limit',self.zoom_cell(8).get_attribute('aria-label'))
        self.zoom_tap(18);self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'color_temp_kelvin':2991})
        for min_k,max_k in [(2990,2990),(6500,2200),(None,6500)]:
            self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()');self.page.evaluate('calls=[]')
            self.page.evaluate("([min,max])=>pushState('light.zone_a','on',{supported_color_modes:['color_temp'],min_color_temp_kelvin:min,max_color_temp_kelvin:max})",[min_k,max_k])
            self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]});self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle()
            if min_k==max_k:
                self.zoom_tap(3);self.settle();self.assertEqual(set(self.kelvin_palette()),{2990})
                self.zoom_tap(7);self.assertEqual(self.page.evaluate('calls.at(-1)[2]'),{'color_temp_kelvin':2990})
            else:
                self.assertEqual(self.zoom_cell(3).get_attribute('aria-label'),'White unavailable');self.zoom_tap(3)
                self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1);self.assertEqual(self.page.evaluate('calls.length'),0)
        self.capture('beta7-kelvin-missing-native-range')
    def test_issue99_kelvin_stale_range_and_unavailable_service_isolation(self):
        self.kelvin_open()
        self.page.evaluate("window.kelvinNotices=[];document.querySelector('home-assistant').addEventListener('hass-notification',e=>kelvinNotices.push(e.detail.message));pushState('light.zone_a','on',{supported_color_modes:['color_temp'],min_color_temp_kelvin:2200,max_color_temp_kelvin:4000})")
        self.zoom_tap(18);self.assertEqual(self.page.evaluate('calls.length'),0)
        self.hold_input(self.zoom_cell(18));self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.assertTrue(self.page.evaluate('kelvinNotices.length>=2'))
        self.page.evaluate("pushState('light.zone_a','unavailable',{supported_color_modes:['color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6535})")
        self.zoom_tap(8);self.hold_input(self.zoom_cell(8));self.settle();self.assertEqual(self.page.evaluate('calls.length'),0)
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1');self.capture('beta7-kelvin-stale-range-safe-back')
    def test_light_presets_palette_swatches_and_back_keep_anchor(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','presets':{'brightness':{'entity':'input_number.brightness_a'}}}]})
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        origin=self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]')
        fills=self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item) .hex-fill').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("fill"))')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Color"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===18')
        self.assertEqual(self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]'),origin)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item) .hex-fill').evaluate_all('(nodes)=>nodes.slice(0,6).map(n=>n.getAttribute("fill"))'),fills)
        swatches=self.page.evaluate('''()=>[...hub._hubMenu.shadowRoot.querySelectorAll(':is(honeycomb-menu-ng-item,honeycomb-menu-item)')].slice(-12).map(el=>el.shadowRoot.querySelector('.hex-fill').getAttribute('fill'))''')
        self.assertEqual(len(set(swatches)),12);self.assertTrue(all(c.startswith('hsl(') for c in swatches))
        self.capture('light-palette')
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        preset=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="1"] .interaction-surface')
        preset.click();self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['light','turn_on'])
        self.hold(preset);self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['input_number','set_value'])
    def sonos_setup(self):
        self.page.evaluate('''()=>{
            window.notifications=[];
            document.querySelector('home-assistant').addEventListener('hass-notification',e=>notifications.push(e.detail.message));
            hass.services={script:{toggle_member_a:{}}};
            pushStates([
                ['media_player.player_a','playing',{volume_level:.42,media_title:'A long synthetic track title for alignment',group_members:['media_player.player_a','media_player.player_b']}],
                ['media_player.player_b','idle',{friendly_name:'Room B',volume_level:.2,group_members:['media_player.player_a','media_player.player_b']}],
                ['media_player.player_c','idle',{friendly_name:'Room C with a longer name',volume_level:.2,group_members:['media_player.player_c']}],
                ['script.toggle_member_a','off',{}]
            ]);
        }''')
    def sonos_item(self):
        return {'type':'sonos','entity':'media_player.player_a','favorites_sensor':'sensor.favorites',
            'members':[{'entity':'media_player.player_b','name':'Room B'},{'entity':'media_player.player_c','name':'Room C with a longer name'}],
            'toggle_member_script':'script.toggle_member_a'}
    def sonos_open(self, item=None):
        self.sonos_setup()
        self.hub({'logo':False,'items':[item or self.sonos_item()]})
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.settle()
    def sonos_slot(self, physical):
        # DOM ring indices start at zero; documented/configured slots start at 1.
        return self.page.locator(f':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="{physical-1}"]')
    def sonos_radio_state(self):
        return self.page.evaluate('''()=>({
            outer:[...hub._hubMenu.shadowRoot.querySelectorAll('[data-honeycomb-slot]')].filter(el=>Number(el.dataset.honeycombSlot)>=6).map(el=>({
                index:Number(el.dataset.honeycombSlot),x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight,model:el._model,
                artwork:(()=>{const image=el.shadowRoot.querySelector('.station-artwork');const value=image?image.getAttribute('src'):getComputedStyle(el.shadowRoot.querySelector('.artwork')).backgroundImage;return value.includes('/station-a.svg')?'station-a.svg':value})()})),
            center:hub._hubMenu.shadowRoot.querySelector('.center-item')._model
        })''')
    def sonos_radio_data(self):
        self.page.evaluate('''()=>{
            const items=Object.fromEntries(Array.from({length:12},(_,i)=>['favorite_'+i,'Station '+String(i+1).padStart(2,'0')]));
            const thumbnail='/station-a.svg';
            pushStates([['sensor.favorites','12',{items}],['sensor.favorites_cache','1',{items:[{media_content_id:'favorite_5',thumbnail}]}]]);
        }''')
    def test_issue90_slots_handlers_and_light_alignment(self):
        self.sonos_open()
        self.assert_visible_unique_cells(7)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item) .interaction-surface').evaluate_all('(els)=>els.map(el=>el.getAttribute("aria-label"))'),['Radio','Pause','Join','Sleep','Vol','Vol'])
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .secondary').inner_text(),'42%')
        for physical,service in [(2,'media_play_pause'),(5,'volume_down'),(6,'volume_up')]:
            self.activate(self.sonos_slot(physical).locator('.interaction-surface'))
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),service)
            if physical>2:self.assertEqual(self.page.evaluate('calls.at(-1)[3].entity_id'),['media_player.player_a','media_player.player_b'])
        # Track and status strings stay centered/truncated inside the same cells.
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector("[data-honeycomb-slot=\\"1\\"]")._model.secondary.includes("synthetic")')
        metrics=self.sonos_slot(2).evaluate('''el=>{const root=el.shadowRoot,content=root.querySelector('.content'),r=content.getBoundingClientRect();return {
            grid:getComputedStyle(content).gridTemplateRows,
            items:['ha-icon','.primary','.secondary'].map(s=>{const n=root.querySelector(s),b=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:b.x+b.width/2-r.x,width:b.width,y:b.y-r.y,height:b.height,font:c.fontSize,align:c.alignSelf,padding:c.paddingTop}})
        }}''')
        for item in metrics['items']:self.assertAlmostEqual(item['x'],41,delta=.6)
        self.assertLessEqual(metrics['items'][1]['width'],66)
        self.assertLessEqual(metrics['items'][2]['width'],66)
        self.capture('issue90-controls')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.settle()
        light=self.sonos_slot(1).evaluate('''el=>{const r=el.shadowRoot.querySelector('.content').getBoundingClientRect();return ['ha-icon','.primary'].map(s=>{const n=el.shadowRoot.querySelector(s),b=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:b.x+b.width/2-r.x,width:b.width,y:b.y-r.y,height:b.height,font:c.fontSize,align:c.alignSelf,padding:c.paddingTop}})}''')
        # Sonos optional secondary text uses the same inherited hierarchy; its
        # extra line naturally shifts the group up without a reserved grid row.
        for index in range(2):
            for key in ['x','font']:
                if key=='x':self.assertAlmostEqual(metrics['items'][index][key],light[index][key],delta=.1)
                else:self.assertEqual(metrics['items'][index][key],light[index][key])
        self.capture('issue90-light-reference')
    def test_issue90_join_unjoin_live_state_failure_and_retry(self):
        self.sonos_open()
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===8')
        self.assertEqual(self.page.evaluate('calls.length'),0)
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Joined')
        self.assertEqual(self.sonos_slot(8).locator('.secondary').inner_text(),'Not joined')
        joined=self.sonos_slot(7).locator('.hex-fill').get_attribute('fill')
        solo=self.sonos_slot(8).locator('.hex-fill').get_attribute('fill')
        self.assertNotEqual(joined,solo)
        self.capture('issue90-join')
        self.activate(self.sonos_slot(7).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['script','toggle_member_a',{'member':'media_player.player_b'},{}])
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Joined','HA remains authoritative until updated')
        self.page.evaluate("pushStates([['media_player.player_a','playing',{volume_level:.42,group_members:['media_player.player_a']}],['media_player.player_b','idle',{group_members:['media_player.player_b']} ]])")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector("[data-honeycomb-slot=\\"6\\"]")._model.secondary==="Not joined"')
        self.assertEqual(self.sonos_slot(7).locator('.hex-fill').get_attribute('fill'),solo)
        self.activate(self.sonos_slot(7).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_b')
        self.page.evaluate("pushStates([['media_player.player_a','playing',{volume_level:.42,group_members:['media_player.player_a','media_player.player_b']}],['media_player.player_b','idle',{group_members:['media_player.player_a','media_player.player_b']} ]])")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector("[data-honeycomb-slot=\\"6\\"]")._model.secondary==="Joined"')
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        # Rejected promises produce user feedback and no optimistic membership.
        self.page.evaluate("()=>{hass.callService=(...args)=>{calls.push(args);return Promise.reject(new Error('synthetic grouping failure'))}}")
        self.activate(self.sonos_slot(8).locator('.interaction-surface'))
        self.page.wait_for_function('notifications.length===1')
        self.assertIn('Could not update Sonos group',self.page.evaluate('notifications[0]'))
        self.assertEqual(self.sonos_slot(8).locator('.secondary').inner_text(),'Not joined')
        self.page.evaluate('()=>{hass.callService=(...args)=>{calls.push(args);return Promise.resolve()}}')
        self.activate(self.sonos_slot(8).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_c')
        # Real center/back navigation returns to primary controls without playback.
        count=self.page.evaluate('calls.length')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.assertEqual(self.page.evaluate('calls.length'),count)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item)').count(),6)
    def test_issue90_empty_setup_single_room_and_script_errors(self):
        self.sonos_open({'type':'sonos','entity':'media_player.player_a'})
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertEqual(self.sonos_slot(7).locator('.primary').inner_text(),'No rooms')
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Metadata unavailable')
        self.assertEqual(self.page.evaluate('moreInfo.length+calls.length'),0)
        self.capture('issue90-empty')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        item=self.sonos_item();item['members']=[{'entity':'media_player.player_a'},{'entity':'media_player.player_b','name':'Room B'},{'entity':'media_player.player_b'}]
        item.pop('toggle_member_script')
        self.sonos_open(item);self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item)').count(),7)
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Grouping unsupported')
        self.activate(self.sonos_slot(7).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.length'),0)
        self.assertIn('grouping support',self.page.evaluate('notifications[0]'))
        self.capture('issue90-script-setup')
    def test_issue90_join_hold_and_touch_cancel_do_not_execute_actions(self):
        self.sonos_open();self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        target=self.sonos_slot(7).locator('.interaction-surface')
        target.dispatch_event('pointerdown',{'pointerId':55,'pointerType':'touch','clientX':30,'clientY':300,'button':0})
        target.dispatch_event('pointercancel',{'pointerId':55,'pointerType':'touch'})
        self.page.wait_for_timeout(550)
        self.hold_input(target)
        self.assertEqual(self.page.evaluate('calls.length+moreInfo.length'),0)
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.activate(target)
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_b')
    def test_issue90_live_candidate_availability_and_group_safety(self):
        self.sonos_open();self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        cases=[('media_player.player_c','idle',{'group_members':['media_player.player_d','media_player.player_c']},'Other group'),
            ('media_player.player_c','unavailable',{},'Unavailable'),
            ('media_player.player_c','idle',{},'Group unknown'),
            ('media_player.player_c','idle',{'group_members':['media_player.player_c']},'Not joined'),
            ('script.toggle_member_a','unavailable',{},'Script unavailable'),
            ('script.toggle_member_a','off',{},'Not joined'),
            ('media_player.player_a','playing',{'group_members':['media_player.player_d','media_player.player_a']},'Use group leader')]
        for entity,state,attrs,label in cases:
            self.page.evaluate('([id,s,a])=>pushState(id,s,a)',[entity,state,attrs])
            self.page.wait_for_function('(label)=>hub._hubMenu.shadowRoot.querySelector("[data-honeycomb-slot=\\"7\\"]")._model.secondary===label',arg=label)
            if label!='Not joined':
                count=self.page.evaluate('calls.length');self.activate(self.sonos_slot(8).locator('.interaction-surface'))
                self.assertEqual(self.page.evaluate('calls.length'),count)
        self.capture('issue90-other-group')
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
    def test_issue90_radio_outer_render_matches_v170_reference(self):
        self.sonos_open();self.sonos_radio_data()
        self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
        self.sonos_slot(12).locator('.station-artwork').wait_for(state='visible')
        snapshot=self.sonos_radio_state()
        if self.evidence:
            reference=json.loads((self.evidence/'before'/f'{self.viewport["width"]}-radio-state.json').read_text())
            # Shared presentation adds derived fill metadata. Radio favorites
            # must still be solid with the exact pre-existing fill color.
            for cell in snapshot['outer']:
                self.assertEqual(cell['model']['fill'],{'type':'solid','center':cell['model']['colors']['center']})
            self.assertEqual(snapshot['center']['fill']['center'],snapshot['center']['colors']['inner'])
            # Only metadata delivery/hidden-image representation changes: shared
            # img/error fallback replaces the old cache-dependent CSS background.
            for actual,old in zip(snapshot['outer'],reference['outer']):
                if actual['model']['artwork']:
                    self.assertEqual(actual['model']['artwork']['url'],'/station-a.svg')
                    self.assertEqual(old['model']['iconStyle']['display'],'none')
                    self.assertEqual(old['model']['nameStyle']['display'],'none')
                    self.assertEqual(actual['model']['name'],'');self.assertIsNone(actual['model']['icon'])
                    actual['model']['name']=old['model']['name'];actual['model']['icon']=old['model']['icon']
            # Built-in design lengths now use the existing size variable. At 82px
            # these exact two values are equivalent; all other style fields compare.
            for actual,old in zip(snapshot['outer'],reference['outer']):
                for group,key,design in [('iconStyle','width',17),('nameStyle','font-size',9)]:
                    value=actual['model'][group].get(key)
                    if isinstance(value,str) and value.startswith('calc(var(--honeycomb-persistent-size,82px)'):
                        self.assertEqual(value,f'calc(var(--honeycomb-persistent-size,82px) / 82 * {design})')
                        self.assertEqual(old['model'][group][key],f'{design}px')
                        actual['model'][group][key]=old['model'][group][key]
            for scene in [snapshot,reference]:
                scene['center'].pop('fill',None)
                for cell in scene['outer']:cell['model'].pop('fill',None)
                scene['center'].pop('artwork',None)
                for cell in scene['outer']:
                    cell['model'].pop('artwork',None)
                    cell['model']['colors'].pop('inner',None)
                    cell['model']['card'].pop('background-image',None)
                    cell['model']['iconStyle'].pop('display',None)
                    cell['model']['nameStyle'].pop('display',None)
            self.assertEqual(snapshot,reference,'Geometry/order/fills/text/style remain equivalent; only accents and native image delivery differ')
        self.assertEqual([x['model']['name'] for x in snapshot['outer']],[f'Station {i:02d}' for i in range(1,13)])
        self.assertEqual([x['index'] for x in snapshot['outer']],list(range(6,18)))
        self.capture('issue90-radio')
        for index in [0,5,11]:
            if index:
                self.page.wait_for_function('hub._menuContext.currentConfig?._persistent_hub_root===true && !hub._hubMenu?.closing')
                self.settle()
                self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===1')
                self.activate(self.sonos_slot(1).locator('.interaction-surface'))
            self.activate(self.sonos_slot(index+7).locator('.interaction-surface'))
            self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','play_media',{'media_content_id':f'favorite_{index}','media_content_type':'favorite_item_id'},{'entity_id':'media_player.player_a'}])
    def test_issue90_legacy_hub_and_standalone_sonos_share_actions(self):
        self.sonos_setup()
        for adapter in ['legacy','control']:
            item=self.sonos_item()
            if adapter=='legacy':
                item['type']='media';self.hub({'logo':False,'items':[item]})
                target=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface')
            else:
                item.pop('type');item['module']='sonos'
                self.page.evaluate('config=>makeControl(config)',item)
                target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
            self.hold_input(target)
            self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===6')
            self.activate(self.sonos_slot(5).locator('.interaction-surface'))
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'volume_down')
            self.activate(self.sonos_slot(3).locator('.interaction-surface'))
            self.activate(self.sonos_slot(7).locator('.interaction-surface'))
            self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_b')
            if adapter=='legacy':self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')

    def test_beta2_real_shaped_channel_matching_and_legacy_active_color(self):
        self.sonos_setup()
        self.page.evaluate("""()=>{
            pushStates([
              ['sensor.favorites','2',{items:{'FV:2/57':'Station A','FV:2/58':'Station B'}}],
              ['sensor.favorites_cache','2',{items:[{media_content_id:'FV:2/57',media_content_type:'favorite_item_id',title:'Station A',thumbnail:'/station-a.svg'}]}],
              ['media_player.player_a','playing',{volume_level:.42,media_content_id:'x-sonosapi-hls:stream-a?sid=1',media_channel:'Station A',media_title:'Track A',group_members:['media_player.player_a']}]
            ]);
        }""")
        self.hub({'logo':False,'items':[{'type':'media','entity':'media_player.player_a','active_color':'#00bcd4','favorites_sensor':'sensor.favorites'}]})
        cube=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item');cube.locator('.station-artwork').wait_for(state='visible')
        color=cube.locator('.hex-fill').get_attribute('fill');self.assertNotEqual(color,'#00bcd4')
        self.assertEqual(cube.locator('.hex-inner').get_attribute('fill'),color)
        self.capture('beta2-real-shaped-playing')
        self.page.evaluate("pushState('media_player.player_a','paused',{media_content_id:'x-sonosapi-hls:stream-a?sid=1',media_channel:'Station A',group_members:['media_player.player_a']})")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.colors.center==="#202224"')
        self.assertTrue(cube.locator('.station-artwork').is_visible());self.capture('beta2-real-shaped-paused')
        self.page.evaluate("pushState('media_player.player_a','playing',{media_content_id:'x-sonosapi-hls:other',media_channel:'Station A live',media_title:'Station A',group_members:['media_player.player_a']})")
        self.page.wait_for_function('!hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork')
        self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),'#00bcd4')
    def test_beta5_discovered_join_sleep_default_and_optional_explicit_browse(self):
        self.sonos_open({'type':'media','entity':'media_player.player_a','active_color':'#00bcd4'})
        self.page.evaluate("""()=>{
          hass.entities=Object.fromEntries(['a','b','c'].map(s=>['media_player.player_'+s,{entity_id:'media_player.player_'+s,platform:'sonos'}]));
          hass.entities['media_player.other']={entity_id:'media_player.other',platform:'cast'};
          hass.services.media_player={join:{},unjoin:{}};
          for(const s of ['a','b','c'])hass.states['media_player.player_'+s].attributes.supported_features=524288;
        }""")
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Joined')
        self.assertEqual(self.sonos_slot(8).locator('.secondary').inner_text(),'Not joined')
        self.activate(self.sonos_slot(7).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','unjoin',{}, {'entity_id':'media_player.player_b'}])
        self.activate(self.sonos_slot(8).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','join',{'group_members':['media_player.player_c']},{'entity_id':'media_player.player_a'}])
        self.capture('beta2-native-join')
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.page.evaluate("window.browseEvents=0;window.addEventListener('location-changed',()=>browseEvents++)")
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.assertFalse('/media-browser/' in self.page.url)
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Sonos unavailable')
        self.assertEqual(self.sonos_slot(7).locator('.interaction-surface').get_attribute('aria-disabled'),'true')
        self.assertEqual(self.page.evaluate('moreInfo'),[]);self.assertEqual(self.page.evaluate('browseEvents'),0)
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.page.evaluate("makeControl({module:'generic',entity:'media_player.player_a',name:'Optional Browse',tap_action:{action:'navigate',navigation_path:'/media-browser/media_player.player_a'}})")
        self.activate(self.page.locator('body > honeycomb-persistent-control .interaction-surface'))
        self.assertTrue(self.page.url.endswith('/media-browser/media_player/player_a') or self.page.url.endswith('/media-browser/media_player.player_a'))
        self.assertEqual(self.page.evaluate('browseEvents'),1)
    def test_beta2_registry_ws_failure_and_empty_discovery_are_distinct(self):
        self.sonos_open({'type':'sonos','entity':'media_player.player_a'})
        self.page.evaluate("()=>{hass.callWS=async()=>{throw new Error('synthetic permission denial')}}")
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Metadata unavailable')
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.page.evaluate("()=>{hass.callWS=async()=>({entities:[{ei:'media_player.player_a',pl:'sonos'}]})}")
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'No other Sonos')
        self.assertEqual(self.page.evaluate('calls.length'),0)

    def beta4_radio_hub(self):
        self.sonos_setup()
        data=json.loads((ROOT/'test/fixtures/sonos-radio.json').read_text())
        self.page.evaluate("""data=>{
            pushStates([
                ['sensor.favorites','2',{items:data.favorites}],
                ['sensor.favorites_cache','2',{items:data.cache}],
                ['media_player.player_a','playing',data.playing_a]
            ]);
        }""",data)
        # A real parent ring launcher beside a Light, rather than only slot 0.
        item={'type':'media','entity':'media_player.player_a','active_color':'#00bcd4',
              'favorites_sensor':'sensor.favorites'}
        self.hub({'logo':True,'items':[{'type':'light','entity':'light.zone_a'},item]})
        self.settle()
        return data
    def test_beta4_parent_and_promoted_center_real_shaped_live_radio(self):
        data=self.beta4_radio_hub()
        launcher=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[1]"]')
        launcher.locator('.station-artwork').wait_for(state='visible')
        color=launcher.locator('.hex-inner').get_attribute('fill')
        self.assertNotEqual(color,'#00bcd4')
        self.assertEqual(launcher.locator('.hex-fill').get_attribute('fill'),color)
        self.capture('beta4-parent-playing')
        self.hold_input(launcher.locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        center=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item')
        center.locator('.station-artwork').wait_for(state='visible')
        self.assertEqual(center.locator('.hex-fill').get_attribute('fill'),color)
        self.capture('beta4-promoted-playing')
        # Deeper Radio center uses arrow-left for navigation, but remains the
        # same Sonos presentation surface. Back still works with a station logo.
        self.activate(self.sonos_slot(1).locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===2');self.settle()
        self.assertTrue(center.locator('.station-artwork').is_visible())
        self.assertEqual(center.locator('.hex-inner').get_attribute('fill'),color)
        self.capture('beta4-radio-center-playing')
        self.activate(center.locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.page.evaluate("attrs=>pushState('media_player.player_a','playing',attrs)",data['playing_b'])
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork?.url==="/station-c.svg"')
        switched=center.locator('.hex-inner').get_attribute('fill');self.assertNotEqual(switched,color)
        self.assertEqual(center.locator('.hex-fill').get_attribute('fill'),switched)
        self.page.evaluate("attrs=>pushState('media_player.player_a','paused',attrs)",data['playing_b'])
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.colors.center==="#202224"')
        self.assertEqual(center.locator('.hex-inner').get_attribute('fill'),switched)
        self.assertTrue(center.locator('.station-artwork').is_visible());self.capture('beta4-promoted-paused')
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.assertEqual(launcher.locator('.hex-fill').get_attribute('fill'),'#202224')
        self.assertEqual(launcher.locator('.station-artwork').get_attribute('src'),'/station-c.svg')
        self.capture('beta4-parent-paused')
        self.page.evaluate("attrs=>pushState('media_player.player_a','playing',attrs)",data['unverified'])
        self.page.wait_for_function('''!hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-id="items[1]"]')._model.artwork''')
        self.assertEqual(launcher.locator('.hex-fill').get_attribute('fill'),'#00bcd4')
        report=launcher.evaluate('(el)=>el.getPresentationDiagnostics()')
        self.assertEqual(report['reason'],'channel_or_mapping_missing')
        self.assertEqual(report['map_channel_candidates'],0);self.assertEqual(report['metadata_channel_candidates'],0)
        for value in ['Station A','media_player.player_a','synthetic-unknown']:
            self.assertNotIn(value,json.dumps(report))

    def test_beta4_select_favorites_preserves_payload_and_updates_both_surfaces(self):
        data=self.beta4_radio_hub()
        self.page.evaluate("attrs=>pushState('media_player.player_a','playing',attrs)",data['unverified'])
        launcher=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[1]"]')
        for physical,key,expected,logo in [(7,'playing_a','FV:2/57','/station-a.svg'),(8,'playing_b','FV:2/58','/station-c.svg')]:
            self.hold_input(launcher.locator('.interaction-surface'))
            self.page.wait_for_function('hub._menuContext.stack.length===1')
            self.activate(self.sonos_slot(1).locator('.interaction-surface'))
            self.page.wait_for_function('hub._menuContext.stack.length===2')
            self.activate(self.sonos_slot(physical).locator('.interaction-surface'))
            self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','play_media',
                {'media_content_id':expected,'media_content_type':'favorite_item_id'},{'entity_id':'media_player.player_a'}])
            # Simulate HA's distinct stream response, never an optimistic FV ID.
            self.page.evaluate("attrs=>pushState('media_player.player_a','playing',attrs)",data[key])
            self.page.wait_for_function('hub._menuContext.stack.length===0 && hub._hubMenu && !hub._hubMenu.closing')
            self.page.wait_for_function("logo=>hub._hubMenu?.shadowRoot?.querySelector('[data-honeycomb-id=\"items[1]\"]')?._model.artwork?.url===logo",arg=logo)
            self.assertEqual(launcher.locator('.station-artwork').get_attribute('src'),logo)
            self.capture(f'beta4-selected-{physical}-parent')
            self.hold_input(launcher.locator('.interaction-surface'))
            self.page.wait_for_function('hub._menuContext.stack.length===1')
            center=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item')
            self.assertEqual(center.locator('.station-artwork').get_attribute('src'),logo)
            self.capture(f'beta4-selected-{physical}-center')
            self.back();self.page.wait_for_function('hub._menuContext.stack.length===0')

    def sleep_backend_setup(self,backend=None):
        if backend is None:
            import importlib.util,time
            spec=importlib.util.spec_from_file_location('native_sleep_contract',ROOT/'test/sleep_timer/run.py')
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            backend=module.HA();backend.time=int(time.time())
        self.sleep_backend=backend
        if not getattr(self,'_sleep_binding',False):
            def command(service,data,target):
                backend.service(service,data,target)
                return backend.states
            self.page.expose_function('nativeSonosCommand',command);self._sleep_binding=True
        self.page.evaluate("""states=>{
            window.notifications=[];
            if(!window.sleepNotificationListener){window.sleepNotificationListener=true;document.querySelector('home-assistant').addEventListener('hass-notification',e=>notifications.push(e.detail.message));}
            hass.connection=new EventTarget();
            hass.services={sonos:{set_sleep_timer:{},clear_sleep_timer:{}},media_player:{join:{},unjoin:{}}};
            hass.entities=Object.fromEntries(Object.keys(states).filter(id=>id.startsWith('media_player.')).map(id=>[id,{entity_id:id,platform:'sonos'}]));
            hass.callService=async(...args)=>{
                calls.push(args);
                if(args[0]==='sonos'){
                    const states=await nativeSonosCommand(args[1],args[2],args[3]);
                    pushStates(Object.entries(states).map(([id,s])=>[id,s.state,s.attributes]));
                }
            };
            pushStates(Object.entries(states).map(([id,s])=>[id,s.state,s.attributes]));
        }""",backend.states)
        return backend
    def sleep_hub(self,player='a',idle_timeout=None):
        self.hub({'logo':False,'items':[{'type':'sonos','entity':'media_player.player_'+player,
            **({'persistent':{'menu':{'idle_timeout':idle_timeout}}} if idle_timeout is not None else {}),
            'favorites_sensor':'sensor.favorites'}]})
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1');self.settle()
    def sleep_sync(self):
        self.page.evaluate('states=>pushStates(Object.entries(states).map(([id,s])=>[id,s.state,s.attributes]))',self.sleep_backend.states)
    def sleep_label(self,label):
        self.page.wait_for_function('label=>hub._hubMenu.shadowRoot.querySelector("[data-honeycomb-slot=\\"3\\"]")._model.secondary===label',arg=label)
    def test_beta6_native_choices_cancel_reload_and_ha_restart_expectation(self):
        backend=self.sleep_backend_setup();self.sleep_hub('b')
        self.assertEqual(self.sonos_slot(4).locator('.secondary').inner_text(),'Status unknown')
        self.activate(self.sonos_slot(4).locator('.interaction-surface'));self.settle()
        self.assertEqual([self.sonos_slot(i).locator('.primary').inner_text() for i in range(7,13)],['15 min','30 min','45 min','60 min','90 min','Cancel'])
        for physical,minutes in [(7,15),(8,30),(9,45),(10,60),(11,90)]:
            self.activate(self.sonos_slot(physical).locator('.interaction-surface'));self.sleep_label(f'Est. {minutes} min')
            self.assertEqual(backend.timers['media_player.player_a'],backend.time+minutes*60)
            self.assertEqual(self.page.evaluate('calls.at(-1)'),['sonos','set_sleep_timer',{'sleep_time':minutes*60},{'entity_id':'media_player.player_a'}])
        self.capture('beta6-native-sleep-estimate')
        self.activate(self.sonos_slot(12).locator('.interaction-surface'));self.sleep_label('Cancel sent')
        self.assertEqual(backend.timers,{})
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['sonos','clear_sleep_timer',{}, {'entity_id':'media_player.player_a'}])
        self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Est. 15 min')
        end=backend.timers['media_player.player_a'];count=len(backend.calls)
        self.page.reload();self.page.wait_for_function('window.ready');self.sleep_backend_setup(backend);self.sleep_hub('b')
        self.assertEqual(backend.timers['media_player.player_a'],end);self.assertEqual(len(backend.calls),count)
        self.sleep_label('Status unknown');self.capture('beta6-native-sleep-reload-unknown')
        # Device-boundary model continues while BOTH browser and HA are absent.
        self.page.goto('about:blank');backend.online=False;backend.tick(120);backend.restart()
        self.assertEqual(backend.timers['media_player.player_a'],end)
        backend.online=False;backend.tick(780)
        self.assertEqual(backend.states['media_player.player_a']['state'],'paused')
        self.assertEqual(backend.states['media_player.player_b']['state'],'paused')
        self.assertEqual(backend.states['media_player.player_c']['state'],'playing')
        backend.restart();self.page.goto(self.url);self.page.wait_for_function('window.ready');self.sleep_backend_setup(backend);self.sleep_hub('b')
        self.sleep_label('Status unknown');self.assertEqual(len(backend.calls),count)
        self.assertEqual(self.page.evaluate('calls'),[]);self.capture('beta6-device-boundary-after-restart')
    def test_beta6_native_two_clients_group_changes_and_cancel_target(self):
        backend=self.sleep_backend_setup();self.sleep_hub('b')
        other=Cubes();other.setUp()
        try:
            other.sleep_backend_setup(backend);other.sleep_hub('b')
            self.activate(self.sonos_slot(4).locator('.interaction-surface'));self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Est. 15 min')
            other.sleep_sync();other.settle();other.sleep_label('Status unknown')
            backend.service('set_sleep_timer',{'sleep_time':5400},{'entity_id':'media_player.player_c'})
            end_c=backend.timers['media_player.player_c']
            # Selected follower B moves to C; current group is resolved again on cancel.
            for suffix,group in [('a',['a']),('b',['c','b','d']),('c',['c','b','d']),('d',['c','b','d'])]:
                backend.states['media_player.player_'+suffix]['attributes']['group_members']=['media_player.player_'+s for s in group]
            self.sleep_sync();other.sleep_sync();self.sleep_label('Status unknown');other.sleep_label('Status unknown')
            self.assertEqual(backend.timers['media_player.player_c'],end_c)
            self.assertEqual(len(backend.calls),2,'Group updates cannot send automatic actions')
            self.activate(self.sonos_slot(12).locator('.interaction-surface'));self.sleep_label('Cancel sent')
            self.assertNotIn('media_player.player_c',backend.timers);self.assertIn('media_player.player_a',backend.timers)
            self.assertEqual(self.page.evaluate('calls.at(-1)'),['sonos','clear_sleep_timer',{}, {'entity_id':'media_player.player_c'}])
            self.back();self.page.wait_for_function('hub._menuContext.stack.length===1');self.capture('beta6-group-change-safe-back')
        finally:other.tearDown()
    def test_beta6_estimate_only_clock_disconnect_and_device_errors(self):
        from datetime import datetime,timezone
        # Explicitly disable UI idle-close for this device-estimate/error test.
        # Default/custom UI timeout behavior has its own clock-controlled tests.
        backend=self.sleep_backend_setup();self.page.clock.install(time=datetime.fromtimestamp(backend.time,timezone.utc));self.sleep_hub(idle_timeout=0)
        self.activate(self.sonos_slot(4).locator('.interaction-surface'));self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Est. 15 min')
        count=self.page.evaluate('calls.length');self.page.clock.fast_forward(61000);self.sleep_label('Est. 14 min')
        self.page.clock.fast_forward(14*60000);self.sleep_label('Check device')
        self.assertEqual(self.page.evaluate('calls.length'),count);self.assertEqual(backend.states['media_player.player_a']['state'],'playing')
        self.assertIn('media_player.player_a',backend.timers,'Frontend clock cannot expire a device timer')
        self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Est. 15 min')
        self.page.evaluate("hass.connection.dispatchEvent(new Event('disconnected'))");self.sleep_label('HA offline')
        self.page.evaluate("hass.connection.dispatchEvent(new Event('ready'))");self.sleep_label('Status unknown')
        backend.fail=True
        self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Check device')
        self.page.wait_for_function('notifications.some(x=>x.includes("Sleep Timer request failed"))')
        self.page.evaluate('()=>{hass.callService=()=>new Promise(()=>{})}')
        self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Sending…')
        self.assertEqual(self.sonos_slot(12).locator('.interaction-surface').get_attribute('aria-disabled'),'true')
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.sonos_slot(4).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.sleep_label('Sending…')
        self.page.clock.fast_forward(31000);self.sleep_label('Check device')
        self.page.wait_for_function('notifications.filter(x=>x.includes("Sleep Timer request failed")).length===2')
        self.capture('beta6-native-sleep-device-error')
    def test_beta6_service_availability_and_malformed_group_fail_closed(self):
        self.sleep_backend_setup();self.sleep_hub()
        self.page.evaluate('delete hass.services.sonos.set_sleep_timer;pushStates([])')
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.assertEqual(self.sonos_slot(7).locator('.interaction-surface').get_attribute('aria-disabled'),'true')
        self.assertEqual(self.sonos_slot(12).locator('.interaction-surface').get_attribute('aria-disabled'),'false')
        self.activate(self.sonos_slot(12).locator('.interaction-surface'));self.sleep_label('Cancel sent')
        self.page.evaluate("pushState('media_player.player_b','playing',{group_members:['media_player.player_b']})")
        self.sleep_label('Group unknown')
        self.assertEqual(self.sonos_slot(12).locator('.interaction-surface').get_attribute('aria-disabled'),'true')
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1');self.capture('beta6-native-sleep-unsupported')
    def test_beta5_join_back_reentry_and_late_discovery(self):
        self.sonos_open()
        for iteration in range(4):
            self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===2');self.settle()
            self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.settle()
            self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2,'No duplicate Join view')
            self.activate(self.sonos_slot(7).locator('.interaction-surface'))
            self.page.evaluate("pushState('media_player.player_b','idle',{group_members:['media_player.player_b'],volume_level:.2})")
            center=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface')
            self.assertEqual(center.get_attribute('aria-label'),'Back');center.press('Enter') if iteration==2 else self.activate(center)
            self.page.wait_for_function('hub._menuContext.stack.length===1');self.settle()
        self.capture('beta5-join-back-repeated')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.sonos_open({'type':'sonos','entity':'media_player.player_a'})
        self.page.evaluate("()=>{window.discovery=[];hass.callWS=()=>new Promise(resolve=>discovery.push(resolve))}")
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('discovery.length'),1)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.page.evaluate("discovery[0]({entities:[{ei:'media_player.player_a',pl:'sonos'},{ei:'media_player.player_b',pl:'sonos'}]})")
        self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0,'Late discovery never reopens a closed view')
        self.page.clock.install()
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.sonos_slot(3).locator('.interaction-surface'));self.page.clock.fast_forward(5100)
        self.page.wait_for_function('hub._menuContext.stack.length===2');self.settle()
        self.assertEqual(self.sonos_slot(7).locator('.secondary').inner_text(),'Metadata unavailable')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
    def navigation_id(self):
        return self.page.evaluate('hub._menuContext.currentConfig?._navigation_sibling?.id || "main"')
    def idle_before(self,remaining):
        delta=self.page.evaluate('remaining=>Math.max(0,hub._hubMenu._lastInteractionAt+Number(hub._hubMenu.config.idle_timeout)-Date.now()-remaining)',remaining)
        self.page.clock.fast_forward(delta)
    def test_beta8_all_sibling_permutations_same_view_reentry_and_one_back(self):
        self.page.clock.install();self.sonos_open();self.sonos_radio_data()
        origin=self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]')
        slots={'radio':1,'join':3,'sleep':4}
        for first in slots:
            for second in slots:
                for name in [first,second,second]:
                    self.activate(self.sonos_slot(slots[name]).locator('.interaction-surface'))
                    self.page.wait_for_function('name=>hub._menuContext.currentConfig?._navigation_sibling?.id===name',arg=name)
                    self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
                    self.assertEqual(self.page.evaluate('hub._menuContext.navigation.depth'),2)
                    self.assertEqual(self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]'),origin)
                    self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.assertEqual(self.navigation_id(),'main');self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1)
                self.assertEqual(self.page.evaluate('hub._hubMenu.buttons.filter(Boolean).length'),6)
        self.capture('beta8-siblings-one-back-main')
        self.back();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
        self.assertEqual(self.page.evaluate('calls.length'),0,'Sibling/Back controls never call playback or grouping')
    def test_beta8_default_idle_closes_all_siblings_despite_passive_state_and_config_updates(self):
        self.page.clock.install();self.sonos_open();self.sonos_radio_data()
        for name,slot in [('radio',1),('join',3),('sleep',4)]:
            self.activate(self.sonos_slot(slot).locator('.interaction-surface'))
            self.page.wait_for_function('name=>hub._menuContext.currentConfig?._navigation_sibling?.id===name',arg=name)
            self.assertEqual(self.page.evaluate('hub._hubMenu.config.idle_timeout'),8000)
            self.idle_before(1000)
            stamp=self.page.evaluate('hub._hubMenu._lastInteractionAt')
            self.page.evaluate("pushState('media_player.player_a','paused',{volume_level:.21,group_members:['media_player.player_a']});pushStates([]);hub._hubMenu.replaceConfig(hub._hubMenu.config)")
            self.assertEqual(self.page.evaluate('hub._hubMenu._lastInteractionAt'),stamp)
            self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
            self.idle_before(250);self.capture('beta8-'+name+'-before-idle')
            self.page.clock.fast_forward(400)
            self.page.wait_for_function('hub._menuContext.stack.length===0 && hub._menuContext.currentConfig._persistent_hub_root')
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1);self.assertEqual(self.page.evaluate('calls.length'),0)
            self.capture('beta8-'+name+'-idle-returned-hub')
            if name!='sleep':
                self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===1')
    def test_beta8_idle_configured_zero_and_custom_timeout_are_inherited(self):
        self.page.clock.install()
        for timeout in [0,2500]:
            item=self.sonos_item();item['persistent']={'menu':{'idle_timeout':timeout}}
            self.sonos_open(item)
            for name,slot in [('radio',1),('join',3),('sleep',4)]:
                self.activate(self.sonos_slot(slot).locator('.interaction-surface'))
                self.page.wait_for_function('name=>hub._menuContext.currentConfig?._navigation_sibling?.id===name',arg=name)
                self.assertEqual(self.page.evaluate('hub._hubMenu.config.idle_timeout'),timeout)
            self.page.clock.fast_forward(3000 if timeout else 60000)
            self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0 if timeout else 2)
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
            self.capture('beta8-idle-config-'+str(timeout))
            self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
    def test_beta8_only_real_interaction_resets_idle_native_sleep_command_and_group_updates(self):
        self.page.clock.install();self.sleep_backend_setup();self.sleep_hub()
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.idle_before(1000)
        self.activate(self.sonos_slot(7).locator('.interaction-surface'));self.sleep_label('Est. 15 min')
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['sonos','set_sleep_timer',{'sleep_time':900},{'entity_id':'media_player.player_a'}])
        self.page.clock.fast_forward(6500)
        self.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,volume_level:.66});pushStates([])")
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        # Keyboard action is also a real interaction, including Cancel/OFF.
        self.sonos_slot(12).locator('.interaction-surface').press('Enter');self.sleep_label('Cancel sent')
        self.page.clock.fast_forward(6500);self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.idle_before(1);self.page.clock.fast_forward(100)
        self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.assertEqual(self.page.evaluate('calls.length'),2)
        self.capture('beta8-sleep-cancel-idle-no-ghost')
    def test_beta8_async_join_keeps_deadline_and_survives_passive_renders(self):
        self.page.clock.install();self.sonos_open({'type':'sonos','entity':'media_player.player_a'})
        self.page.evaluate('()=>{window.discovery=[];hass.callWS=()=>new Promise(resolve=>discovery.push(resolve))}')
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.clock.fast_forward(3000)
        self.page.evaluate("pushState('media_player.player_a','playing',{volume_level:.7,group_members:['media_player.player_a']})")
        self.settle();stamp=self.page.evaluate('hub._hubMenu._lastInteractionAt')
        self.page.evaluate("discovery[0]({entities:[{ei:'media_player.player_a',pl:'sonos'},{ei:'media_player.player_b',pl:'sonos'}]})")
        self.page.wait_for_function('hub._menuContext.currentConfig?._navigation_sibling?.id==="join"')
        self.assertEqual(self.page.evaluate('hub._hubMenu._lastInteractionAt'),stamp,'Discovery is not interaction')
        self.assertEqual(self.page.evaluate('hub._hubMenu.config.idle_timeout'),8000)
        self.idle_before(100);self.capture('beta8-discovered-join-original-deadline')
        self.page.clock.fast_forward(250);self.page.wait_for_function('hub._menuContext.stack.length===0')
    def test_beta8_pending_join_fast_switch_back_close_and_reopen_never_resurrects(self):
        self.page.clock.install();self.sonos_open({'type':'sonos','entity':'media_player.player_a'});self.sonos_radio_data()
        self.page.evaluate('()=>{window.discovery=[];hass.callWS=()=>new Promise(resolve=>discovery.push(resolve))}')
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('discovery.length'),1)
        self.activate(self.sonos_slot(1).locator('.interaction-surface'))
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1)
        self.page.evaluate("discovery[0]({entities:[{ei:'media_player.player_a',pl:'sonos'},{ei:'media_player.player_b',pl:'sonos'}]})")
        self.settle();self.assertEqual(self.navigation_id(),'main');self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1)
        # A fresh request supersedes an invalidated in-flight request, even
        # when the same physical cube is reused after returning to the module.
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('discovery.length'),3)
        self.page.evaluate("discovery[1]({entities:[{ei:'media_player.player_a',pl:'sonos'}]})")
        self.settle();self.assertEqual(self.navigation_id(),'sleep')
        self.page.evaluate("discovery[2]({entities:[{ei:'media_player.player_a',pl:'sonos'},{ei:'media_player.player_b',pl:'sonos'}]})")
        self.page.wait_for_function('hub._menuContext.currentConfig?._navigation_sibling?.id==="join"')
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.back();self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.idle_before(1);self.page.clock.fast_forward(100)
        self.page.wait_for_function('hub._menuContext.stack.length===0')
        self.page.evaluate("discovery[3]({entities:[{ei:'media_player.player_a',pl:'sonos'},{ei:'media_player.player_b',pl:'sonos'}]})")
        self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1);self.assertEqual(self.page.evaluate('calls.length'),0)
        self.capture('beta8-late-discovery-no-ghost')
    def test_beta8_standalone_siblings_back_idle_and_late_discovery_restore_launcher(self):
        self.page.clock.install();self.sonos_setup()
        self.page.evaluate("()=>makeControl({module:'sonos',entity:'media_player.player_a',members:[{entity:'media_player.player_b'}]})")
        self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'))
        self.page.evaluate('window.sonosContext=view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")._menuContext')
        for slot in [3,1,4,3,4,1]:
            self.activate(self.sonos_slot(slot).locator('.interaction-surface'))
            self.page.wait_for_function('sonosContext.stack.length===1')
            self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.assertEqual(self.page.evaluate('sonosContext.stack.length'),0)
        self.activate(self.sonos_slot(4).locator('.interaction-surface'))
        self.page.clock.fast_forward(8200);self.page.clock.run_for(200)
        self.page.wait_for_function('view.querySelectorAll(":is(honeycomb-menu-ng,honeycomb-menu)").length===0')
        self.assertEqual(self.page.locator('body > honeycomb-persistent-control').evaluate('el=>getComputedStyle(el).visibility'),'visible')
        self.page.evaluate("()=>{control.setConfig({module:'sonos',entity:'media_player.player_a'});window.discovery=[];hass.callWS=()=>new Promise(resolve=>discovery.push(resolve))}")
        self.hold_input(self.page.locator('body > honeycomb-persistent-control .interaction-surface'))
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.clock.fast_forward(8200);self.page.clock.run_for(200)
        self.page.evaluate("discovery[0]({entities:[{ei:'media_player.player_a',pl:'sonos'}]})")
        self.settle();self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),0)
        self.assertEqual(self.page.evaluate('calls.length'),0)
        self.capture('beta8-standalone-idle-launcher-restored')
    def test_beta8_real_children_and_recursive_hue_kelvin_keep_exact_back_levels(self):
        self.page.clock.install();self.sonos_open()
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.page.evaluate("ng.openInContext(hub._menuContext,{nested_expand:true,inherit_inner:true,buttons:[{slot:7,name:'Child action',tap_action:{action:'none'}}]})")
        self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),3)
        self.back();self.assertEqual(self.navigation_id(),'join');self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),2)
        self.back();self.assertEqual(self.navigation_id(),'main')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        for mode in ['hs','color_temp']:
            self.page.evaluate("mode=>pushState('light.zoom_a','on',{brightness:128,supported_color_modes:[mode],min_color_temp_kelvin:1800,max_color_temp_kelvin:6535})",mode)
            self.hub({'logo':False,'items':[{'type':'light','entity':'light.zoom_a'}]})
            self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
            self.activate(self.sonos_slot(3).locator('.interaction-surface'))
            snapshot="()=>hub._hubMenu.buttons.slice(6).map(stack=>JSON.stringify(stack))"
            palettes=[self.page.evaluate(snapshot)]
            for depth in [3,4,5]:
                self.hold_input(self.sonos_slot(12).locator('.interaction-surface'))
                self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),depth)
                palettes.append(self.page.evaluate(snapshot))
            for previous in reversed(palettes[:-1]):
                self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
                self.assertEqual(self.page.evaluate(snapshot),previous)
            self.assertEqual(self.page.evaluate('calls.length'),0)
            self.capture('beta8-'+mode+'-exact-back-history')
            self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
    def test_beta5_named_light_center_keeps_visible_label_and_accessible_back(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','menu':{
            'entity':'light.zone_a','nested_expand':True,'promote_to_center':True,
            'promoted_center':{'entity':'light.zone_a','mode':'persistent','name':'Light A','show_name':True},
            'buttons':[{'name':'Details','show_name':True,'tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':{
                'entity':'light.zone_a','nested_expand':True,'buttons':[{'name':'Value A','show_name':True,'tap_action':{'action':'none'}}]}}}]}}]})
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle()
        center=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item')
        self.assertEqual(center.locator('.primary').inner_text(),'Light A')
        self.assertEqual(center.locator('.interaction-surface').get_attribute('aria-label'),'Back')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Details"]'));self.settle()
        self.assertEqual(center.locator('.primary').inner_text(),'Light A')
        center.locator('.interaction-surface').press('Enter');self.page.wait_for_function('hub._menuContext.stack.length===1');self.settle()
        self.assertEqual(center.locator('.primary').inner_text(),'Light A')
        self.activate(center.locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===0')

    def test_beta7_sonos_functions_match_light_hierarchy_with_real_icon_boxes(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle()
        reference=self.sonos_slot(1).evaluate('''el=>{const r=el.getBoundingClientRect(),root=el.shadowRoot;return {
            config:el.config,items:['ha-svg-icon','.primary'].map(s=>{const b=(s==='ha-svg-icon'?root.querySelector('ha-icon').shadowRoot.querySelector(s):root.querySelector(s)).getBoundingClientRect();return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height}}),
            font:getComputedStyle(root.querySelector('.primary')).fontSize}}''')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.sleep_backend_setup();self.sonos_open();self.settle()
        for physical in [1,2,3,4,5,6]:
            cube=self.sonos_slot(physical)
            metrics=cube.evaluate('''el=>{const r=el.getBoundingClientRect(),root=el.shadowRoot;return {
              config:el.config,display:getComputedStyle(root.querySelector('.content')).display,
              items:['ha-svg-icon','.primary','.secondary'].map(s=>{const n=s==='ha-svg-icon'?root.querySelector('ha-icon').shadowRoot.querySelector(s):root.querySelector(s);if(!n)return null;const b=n.getBoundingClientRect();return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height}}),
              font:getComputedStyle(root.querySelector('.primary')).fontSize}}''')
            self.assertEqual(metrics['display'],'flex');self.assertEqual(metrics['font'],reference['font'])
            icon,name,secondary=metrics['items'];self.assertEqual((icon['w'],icon['h']),(24,24))
            self.assertAlmostEqual(icon['x']+icon['w']/2,41,delta=.5)
            self.assertAlmostEqual(name['x']+name['w']/2,41,delta=.5)
            self.assertLessEqual(icon['y']+icon['h'],name['y']+1)
            if secondary:
                self.assertGreaterEqual(secondary['y'],name['y']+name['h'])
                self.assertLessEqual(secondary['w'],82*.8+.5)
            else:
                for actual,expected in zip(metrics['items'][:2],reference['items']):
                    for key in ['y','h']:self.assertAlmostEqual(actual[key],expected[key],delta=.5)
        # Render actual compiled Light/Sonos descriptors together for side-by-side evidence.
        self.page.evaluate('''reference=>{
          const panel=document.createElement('div');panel.style.cssText='position:absolute;top:520px;left:20px;display:grid;grid-template-columns:120px 120px;gap:8px';
          for(const [title,config] of [['Light function',reference],['Sonos function',hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-slot="0"]').config]]){
            const box=document.createElement('div');box.textContent=title;const cube=document.createElement('honeycomb-persistent-control');cube.setConfig({...config,interactive:false});box.append(cube);panel.append(box);
          }document.body.append(panel);
        }''',reference['config']);self.settle();self.capture('beta7-light-sonos-side-by-side')

    def test_beta7_full_bleed_station_artwork_spacing_compact_gray_and_radio_preservation(self):
        self.beta4_radio_hub()
        self.page.evaluate("pushState('sensor.favorites_cache','2',{items:[{title:'Station Alpha',media_content_id:'FV:2/57',media_content_type:'favorite_item_id',thumbnail:'/station-full-bleed.svg'}]})")
        launcher=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[1]"]')
        launcher.locator('.station-artwork').wait_for(state='visible')
        for promoted in [False,True]:
            if promoted:self.hold_input(launcher.locator('.interaction-surface'));self.settle()
            cube=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item') if promoted else launcher
            for state in ['playing','paused','idle']:
                for volume in ([0,.02,.42,1] if state=='playing' else [.42]):
                    self.page.evaluate("([state,volume])=>pushState('media_player.player_a',state,{...hass.states['media_player.player_a'].attributes,volume_level:volume})",[state,volume]);self.settle()
                    img=cube.locator('.station-artwork');img.wait_for(state='visible')
                    self.page.wait_for_function('()=>[...document.querySelectorAll("honeycomb-persistent-hub")].every(h=>!!h)')
                    details=img.evaluate('el=>({fit:getComputedStyle(el).objectFit,width:el.style.width,top:el.style.top,natural:[el.naturalWidth,el.naturalHeight],opacity:getComputedStyle(el).opacity})')
                    self.assertEqual(details['fit'],'contain');self.assertEqual(details['width'],'55.8%');self.assertEqual(details['opacity'],'1')
                    self.assertEqual(details['natural'],[160,80])
                    self.assertEqual(cube.bounding_box()['width'],82)
                    if state=='playing':
                        self.assertEqual(details['top'],'15%');self.assertEqual(cube.locator('.secondary').inner_text(),f'{round(volume*100)}%')
                        self.assertLess(img.bounding_box()['y']+img.bounding_box()['height'],cube.locator('.secondary').bounding_box()['y'])
                    else:
                        self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),'#202224')
                        pixels=Image.open(io.BytesIO(cube.screenshot())).convert('RGB')
                        self.assertEqual(pixels.getpixel((10,pixels.height//2)),(32,34,36),'Opaque edge-to-edge artwork leaves gray fill visible')
                self.capture(f'beta7-full-bleed-{ "promoted" if promoted else "module" }-{state}')
        self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
        favorite=self.sonos_slot(7)
        self.assertEqual(favorite.locator('.artwork').evaluate('el=>getComputedStyle(el).backgroundSize'),'56% auto')
        self.assertEqual(favorite.locator('.artwork').evaluate('el=>getComputedStyle(el).opacity'),'1')
        self.activate(favorite.locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1)[2].media_content_id'),'FV:2/57')
        self.capture('beta7-full-bleed-radio-unchanged')
    def test_beta5_artwork_responsive_state_and_volume_labels(self):
        self.beta4_radio_hub();launcher=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-id="items[1]"]')
        for promoted in [False,True]:
            if promoted:
                self.hold_input(launcher.locator('.interaction-surface'));self.page.wait_for_function('hub._menuContext.stack.length===1')
            cube=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item') if promoted else launcher
            sizes=[]
            for state in ['playing','paused']:
                for volume in ([0,.02,.42,1] if state=='playing' else [.02]):
                    self.page.evaluate("([state,volume])=>pushState('media_player.player_a',state,{...hass.states['media_player.player_a'].attributes,volume_level:volume})",[state,volume]);self.settle()
                    img=cube.locator('.station-artwork');img.wait_for(state='visible')
                    cell=cube.bounding_box();box=img.bounding_box();self.assertEqual(cell['width'],82)
                    sizes.append(box['width'])
                    self.assertGreater(box['x'],cell['x']);self.assertLess(box['x']+box['width'],cell['x']+cell['width'])
                    if state=='playing':
                        label=cube.locator('.secondary');self.assertEqual(label.inner_text(),f'{round(volume*100)}%')
                        text=label.bounding_box();self.assertLess(box['y']+box['height'],text['y'])
                    else:self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),'#202224')
                self.capture(f'beta5-artwork-{ "center" if promoted else "module" }-{state}')
            self.assertAlmostEqual(sizes[-1],sizes[0],delta=.1,msg='Paused artwork remains compact with visible gray fill')
            self.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,volume_level:.02})")

    def station_hub(self, overrides=None):
        self.sonos_setup()
        self.page.evaluate('''()=>{
            pushStates([
                ['sensor.favorites','3',{items:{favorite_a:'Station A',favorite_b:'Station B',favorite_c:'Station C'}}],
                ['sensor.favorites_cache','3',{items:[{media_content_id:'favorite_a',thumbnail:'/station-a.svg'},{media_content_id:'favorite_c',thumbnail:'/station-c.svg'}]}]
            ]);
            window.stationUpdate=(state,attrs={})=>pushState('media_player.player_a',state,{...hass.states['media_player.player_a'].attributes,...attrs});
            stationUpdate('playing',{media_content_id:'favorite_a'});
        }''')
        item=self.sonos_item();item.update(overrides or {})
        self.hub({'logo':False,'items':[item]});self.settle()
        if self.native_only:self.page.wait_for_function("hub._hubMenu.shadowRoot.querySelector('.center-item')._model.artwork?.url==='/station-a.svg'")
    def test_issue90_station_launcher_transitions_and_browse_updates(self):
        self.station_hub()
        cube=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item')
        image=cube.locator('.station-artwork')
        image.wait_for(state='visible')
        self.assertEqual(image.get_attribute('src'),'/station-a.svg')
        self.assertEqual(cube.locator('ha-icon').count(),0)
        color=cube.locator('.hex-inner').get_attribute('fill')
        self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),color)
        self.assertEqual(cube.locator('.secondary').inner_text(),'42%')
        bounds=cube.bounding_box();label=cube.locator('.secondary').bounding_box();logo=image.bounding_box()
        self.assertLessEqual(logo['y']+logo['height'],label['y'])
        self.assertLessEqual(label['y']+label['height']-bounds['y'],bounds['height']*.82)
        self.capture('issue90-station-playing')
        for state in ['paused','idle']:
            self.page.evaluate('(state)=>stationUpdate(state)',state)
            self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.colors.center==="#202224"')
            self.assertEqual(image.get_attribute('src'),'/station-a.svg')
            self.assertEqual(cube.locator('.hex-inner').get_attribute('fill'),color)
        self.capture('issue90-station-paused')
        self.page.evaluate("stationUpdate('playing',{media_content_id:'favorite_c'})")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork?.url==="/station-c.svg"')
        self.assertNotEqual(cube.locator('.hex-inner').get_attribute('fill'),color)
        self.page.evaluate("stationUpdate('playing',{media_content_id:'unknown_uri',media_title:'Station A',media_channel:'Station A'})")
        self.page.wait_for_function('!hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork')
        self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),'#00bcd4')
        self.assertEqual(cube.locator('ha-icon').count(),1)
        self.page.evaluate("stationUpdate('playing',{media_content_id:'favorite_a'});pushState('sensor.favorites_cache','0',{items:[]})")
        self.settle();self.assertEqual(image.count(),0)
        self.page.evaluate("pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',thumbnail:'/station-c.svg'}]})")
        image.wait_for(state='visible');self.assertEqual(image.get_attribute('src'),'/station-c.svg')
        self.page.evaluate("stationUpdate('unavailable')")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.colors.center==="#555b63"')
        self.assertEqual(image.count(),0)
    def test_issue90_station_group_override_selected_center_and_standalone(self):
        self.station_hub({'colors':{'center':'#112233','inner_border':'#445566'},'off':{'center_color':'#303030'}})
        cube=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item')
        self.assertEqual(cube.locator('.hex-fill').get_attribute('fill'),'#112233')
        self.assertEqual(cube.locator('.hex-inner').get_attribute('fill'),'#445566')
        self.hold_input(cube.locator('.interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.assertTrue(cube.locator('.station-artwork').is_visible())
        self.assertEqual(cube.locator('.hex-inner').get_attribute('fill'),'#445566')
        self.page.evaluate("stationUpdate('paused')")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.colors.center==="#303030"')
        self.activate(self.sonos_slot(3).locator('.interaction-surface'))
        self.assertTrue(cube.locator('.station-artwork').is_visible(),'Station artwork does not suppress the existing back action')
        self.page.evaluate("stationUpdate('playing',{group_members:['media_player.player_b','media_player.player_a'],media_content_id:'favorite_a'});pushState('media_player.player_b','playing',{group_members:['media_player.player_b','media_player.player_a'],media_content_id:'favorite_c'})")
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork?.url==="/station-c.svg"')
        self.page.evaluate("pushState('media_player.player_b','playing',{group_members:['media_player.player_b'],media_content_id:'favorite_c'})")
        self.page.wait_for_function('!hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork')
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.page.evaluate("stationUpdate('playing',{group_members:['media_player.player_a'],media_content_id:'favorite_a'});makeControl({module:'sonos',entity:'media_player.player_a',favorites_sensor:'sensor.favorites'})")
        self.page.locator('body > honeycomb-persistent-control .station-artwork').wait_for(state='visible')
    def test_issue90_station_failed_image_and_unrelated_update(self):
        self.station_hub()
        self.page.evaluate('''()=>{window.stationRenders=0;const el=hub._hubMenu.shadowRoot.querySelector('.center-item');const original=el.render;el.render=function(){stationRenders++;return original.call(this)}}''')
        self.page.evaluate("pushState('sensor.unrelated','updated')")
        self.page.wait_for_timeout(100);self.assertEqual(self.page.evaluate('stationRenders'),0)
        self.page.evaluate("pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',thumbnail:'/missing-station.png'}]})")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._failedArtworkKey && !hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .hex-fill').get_attribute('fill'),'#00bcd4')
        self.assertTrue(all('404' in error and 'Failed to load resource' in error for error in self.errors),self.errors)
        self.errors.clear() # Only the deliberately failing thumbnail resource was expected.
        self.page.evaluate("pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',thumbnail:'/station-a.svg'}]})")
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .station-artwork').wait_for(state='visible')
    def test_issue90_station_radio_accents_survive_reorder(self):
        self.station_hub();self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'))
        self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
        colors=[self.sonos_slot(i).locator('.hex-inner').get_attribute('fill') for i in [7,8,9]]
        self.assertEqual(len(set(colors)),3)
        self.capture('issue90-station-radio-accents')
        self.page.evaluate("pushState('sensor.favorites','3',{items:{favorite_c:'Station C',favorite_b:'Station B',favorite_a:'Station A'}})")
        self.back();self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle()
        self.assertEqual([self.sonos_slot(i).locator('.hex-inner').get_attribute('fill') for i in [7,8,9]],list(reversed(colors)))
        self.activate(self.sonos_slot(7).locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].media_content_id'),'favorite_c')
    def test_issue90_readme_diagram_responsive_light_dark(self):
        for theme,background in [('light','#ffffff'),('dark','#0d1117')]:
            self.page.evaluate('''([theme,background])=>{document.title='Honeycomb layout model preview';document.body.innerHTML='<main><h1>Layout model</h1><img alt="Honeycomb physical slots 0–18: center, inner and outer rings" src="/layout.svg"></main>';document.body.style.cssText='margin:0;background:'+background+';color:'+(theme==='dark'?'white':'#14202b');const main=document.querySelector('main');main.style.cssText='padding:16px;max-width:1012px;margin:auto';document.querySelector('img').style.cssText='max-width:100%;height:auto;display:block'}''',[theme,background])
            self.page.wait_for_function('document.querySelector("img").complete && document.querySelector("img").naturalWidth===520')
            image=self.page.locator('img');bounds=image.bounding_box()
            self.assertLessEqual(bounds['width'],self.viewport['width']-32)
            self.assertGreaterEqual(25*bounds['width']/520,14,'Slot numbers remain readable on mobile')
            self.assertEqual(self.page.title(),'Honeycomb layout model preview')
            self.capture('issue90-layout-'+theme)

    def test_sonos_native_favorites_volume_and_grouping(self):
        self.sonos_setup()
        self.hub({'logo':False,'items':[{'type':'sonos','entity':'media_player.player_a','favorites_sensor':'sensor.favorites','members':[{'entity':'media_player.player_b','name':'Player B'}],'toggle_member_script':'script.toggle_member_a'}]})
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['media_player','media_play_pause'])
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="4"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[3].entity_id'),['media_player.player_a','media_player.player_b'])
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Join"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===7')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="6"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_b')
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Radio"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===7')
        self.assertTrue(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .primary').filter(has_text='Station A').is_visible())
        thumbnail='/station-a.svg'
        self.page.evaluate("thumbnail=>pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',thumbnail}]})",thumbnail)
        artwork=self.sonos_slot(7).locator('.station-artwork');artwork.wait_for(state='visible')
        self.assertEqual(artwork.get_attribute('src'),thumbnail)
        self.assertEqual(self.sonos_slot(7).locator('.primary').count(),0)
        self.capture('favorite-artwork')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="6"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].media_content_id'),'favorite_a')
    def test_standalone_media_menu_and_touch_cancel(self):
        self.page.evaluate('makeControl({module:"media",entity:"media_player.player_a"})')
        target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
        target.dispatch_event('pointerdown',{'pointerId':55,'pointerType':'touch','clientX':190,'clientY':300,'button':0})
        target.dispatch_event('pointercancel',{'pointerId':55,'pointerType':'touch'})
        self.page.wait_for_timeout(550);self.assertEqual(self.page.evaluate('calls.length'),0)
        if self.viewport['width']<500:
            box=target.bounding_box();self.page.touchscreen.tap(box['x']+40,box['y']+40)
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'media_play_pause')
        self.hold(target)
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)").buttons.filter(Boolean).length===4')
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="3"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'volume_up')
        self.assertEqual(self.page.evaluate('calls.at(-1)[3].entity_id'),['media_player.player_a','media_player.player_b'])
    def test_state_updates_same_hass_identity_and_unrelated_no_render(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
        self.page.evaluate('''()=>{window.renders=0;const cube=hub._hubMenu.shadowRoot.querySelector('.center-item');const original=cube.render;cube.render=function(){renders++;return original.call(this)}}''')
        self.page.evaluate("pushState('sensor.unrelated','1')")
        self.page.wait_for_timeout(100);self.assertEqual(self.page.evaluate('renders'),0)
        self.page.evaluate("pushState('light.zone_a','off',{brightness:0,supported_color_modes:['hs']})")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item").shadowRoot.querySelector(".secondary").textContent === "Off"')
        self.assertEqual(self.page.evaluate('renders'),1)
        self.page.evaluate("pushState('light.zone_a','unavailable')")
        self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item").shadowRoot.querySelector(".secondary").textContent === "Unavailable"')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .hex-outer').get_attribute('fill'),'#34383d')
    def test_centerless_light_menu_and_replacement_keep_one_owned_overlay(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'},{'type':'light','entity':'light.zone_a'}]})
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item').count(),0)
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface').first)
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item').count(),1)
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===2')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item').count(),0)
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.hub({'logo':False,'items':[{'module':'generic','entity':'sensor.value_a','name':'Item A','menu':{
            'nested_expand':False,'animate':False,'buttons':[{'name':'Replacement','show_name':True,'tap_action':{'action':'none'}}]}}]})
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu===hub._menuContext.honeycomb && hub._menuContext.stack.length===1')
        self.assertTrue(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Replacement"]').is_visible())
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
        self.back();self.page.wait_for_function('hub._hubMenu===hub._menuContext.honeycomb && hub._menuContext.stack.length===0')
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),1)
    def test_nested_menu_keeps_its_own_defaults(self):
        child={'nested_expand':True,'animate':False,'buttons':[{'name':'Child','show_name':True,'tap_action':{'action':'none'}}]}
        self.hub({'logo':False,'items':[{'module':'generic','entity':'sensor.value_a','name':'Item A','menu':{
            'animate':False,'button_defaults':{'styles':{'card':[{'background':'#174b32'}]}},'buttons':[
                {'name':'Details','show_name':True,'tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':child}}]}}]})
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Details"]').click()
        target=self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item)').filter(has=self.page.locator('.primary',has_text='Child'))
        self.assertEqual(target.locator('.hex-fill').get_attribute('fill'),'#34424e')
    def test_empty_placeholders_are_passive(self):
        self.page.evaluate("window.menu=ng.open({entity:'light.zone_a',animate:false,position_mode:'anchored',anchor_x:innerWidth/2,anchor_y:300,buttons:[{slot:1,slot_mode:'hard',name:'Action A',show_name:true,tap_action:{action:'none'}}]})")
        self.page.wait_for_function('window.menu.shadowRoot.querySelectorAll(":is(honeycomb-menu-ng-item,honeycomb-menu-item)").length===7')
        passive=self.page.locator(':is(honeycomb-menu-ng-item,honeycomb-menu-item)').filter(has=self.page.locator('.interaction-surface')).count()
        self.assertEqual(passive,2) # ordinary center + one action; holes have no hit surface
    def test_fifty_items_render_without_fixed_ring_limit(self):
        self.hub({'size':30,'logo':False,'items':[{'type':'generic','name':f'Item {i}','icon':'mdi:plus'} for i in range(50)]})
        self.settle();self.assertEqual(self.controls().count(),50)
        boxes=self.controls().evaluate_all('(items)=>items.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
        self.assertEqual(len(set((b[0],b[1]) for b in boxes)),50)
        self.assertTrue(all(b[2]==30 for b in boxes));self.capture('fifty-items')
    def test_double_tap_keyboard_and_cancel_do_not_duplicate_actions(self):
        self.page.evaluate('makeControl({module:"generic",entity:"sensor.value_a",name:"Value A",tap_action:{action:"perform-action",perform_action:"test.tap"},double_tap_action:{action:"perform-action",perform_action:"test.double"}})')
        target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
        target.dblclick();self.page.wait_for_timeout(350)
        self.assertEqual(self.page.evaluate('calls.map(c=>c[1])'),['double'])
        target.press('Enter');self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'tap')
        box=target.bounding_box();self.page.mouse.move(box['x']+40,box['y']+40);self.page.mouse.down()
        self.page.mouse.move(box['x']+65,box['y']+40);self.page.mouse.up();self.page.wait_for_timeout(350)
        self.assertEqual(self.page.evaluate('calls.length'),2)
    def test_drag_select_native_cube_executes_one_action(self):
        self.hub({'logo':False,'items':[{'type':'generic','entity':'sensor.value_a','name':'Value A','icon':'mdi:plus','tap_action':{'action':'perform-action','perform_action':'test.tap'}}]})
        target=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface');box=target.bounding_box()
        self.page.mouse.move(box['x']+25,box['y']+40);self.page.mouse.down();self.page.mouse.move(box['x']+50,box['y']+40,steps=4);self.page.mouse.up()
        self.assertEqual(self.page.evaluate('calls.length'),1)
    def test_lifecycle_resize_and_reconnect_leave_one_overlay(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
        self.page.evaluate("hub.style.left='100px'")
        self.page.wait_for_function('Math.abs(hub._hubMenu._anchorX-141)<.1')
        self.hold(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        origin=self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY]')
        self.page.evaluate("hub.style.left='150px'")
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY]'),origin)
        self.back();self.page.wait_for_function('Math.abs(hub._hubMenu._anchorX-191)<.1')
        self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),0)
        self.page.evaluate('document.body.append(hub)');self.page.wait_for_function('view.querySelectorAll(":is(honeycomb-menu-ng,honeycomb-menu)").length===1')

    def test_baseline(self):
        self.page.evaluate("document.body.style.setProperty('--honeycomb-persistent-size','82px')")
        self.hub({'size':82,'logo':True,'items':[{'type':'light','entity':'light.zone_a'},{'type':'sonos','entity':'media_player.player_a'}]})
        # Fix the host CSS width to the reference cell size. v1.5.1 applies size
        # inside its host, otherwise the bootstrap falls back to 72 px.
        self.page.evaluate("hub.style.setProperty('--honeycomb-persistent-size','82px')")
        self.page.evaluate('hub._menuContext.honeycomb.reanchor(innerWidth/2,310)')
        self.capture('hub-reference')
        if self.evidence:
            self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .ring-item').first.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-light-cell.png'))
        self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
        self.hub({'size':82,'logo':False,'items':[{'type':'generic','entity':'sensor.value_a','name':'Value A','label':'24'}]})
        self.capture('generic-reference')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',type=Path,required=True)
    parser.add_argument('--button-card',type=Path,required=True)
    parser.add_argument('--baseline',action='store_true')
    parser.add_argument('--test-filter',help='Run only matching test names; CI always runs the complete suite')
    parser.add_argument('--evidence-dir',type=Path)
    args=parser.parse_args()
    assert hashlib.sha256(args.button_card.read_bytes()).hexdigest()==BUTTON_SHA
    if args.evidence_dir: args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve()
    threading.Thread(target=server.serve_forever,daemon=True).start()
    success=True
    try:
        with sync_playwright() as p:
            Cubes.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
            Cubes.url=f'http://127.0.0.1:{server.server_port}';Cubes.evidence=args.evidence_dir
            if args.evidence_dir and not args.baseline and not args.test_filter:
                from sonos_reference import capture_reference
                capture_reference(Cubes,Handler,args.button_card.resolve(),args.evidence_dir)
            for width,height in [(1100,900),(390,844)]:
                Cubes.viewport={'width':width,'height':height}
                names=['test_baseline'] if args.baseline else [n for n in unittest.defaultTestLoader.getTestCaseNames(Cubes) if n!='test_baseline' and (not args.test_filter or args.test_filter in n)]
                result=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Cubes(n) for n in names))
                success=result.wasSuccessful() and success
            Cubes.browser.close()
    finally: server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__': raise SystemExit(main())
