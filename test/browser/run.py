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
        paths = {'/': ROOT/'test/browser/fixture.html', '/bundle.js': self.server.bundle, '/button-card.js': self.server.button}
        if self.path == '/favicon.ico':
            self.send_response(204); self.end_headers(); return
        if self.path not in paths:
            self.send_error(404); return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html' if self.path == '/' else 'text/javascript')
        self.end_headers(); self.wfile.write(paths[self.path].read_bytes())
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
        self.assertEqual(self.page.title(),'Honeycomb shared cube test')
        self.assertTrue(self.page.locator('h1').is_visible())
    def tearDown(self):
        try:
            self.assertEqual(self.errors,[])
            self.assertEqual(self.page.locator('hui-error-card').count(),0)
        finally: self.page.close()
    def hub(self, config):
        self.page.evaluate('config=>makeHub(config)',config)
        self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")')
    def settle(self):
        self.page.evaluate('''async()=>{await new Promise(r=>requestAnimationFrame(r));for(const menu of view.querySelectorAll('honeycomb-menu')){await menu.updateComplete;await Promise.all(menu.shadowRoot.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})))}}''')
    def capture(self, name):
        self.settle()
        if self.evidence:
            self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-{name}.png'))
    def controls(self):
        return self.page.locator('honeycomb-menu honeycomb-menu-item, honeycomb-menu honeycomb-persistent-control')
    def hold(self, locator):
        box=locator.bounding_box();self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        self.page.mouse.down();self.page.wait_for_timeout(600);self.page.mouse.up()
    def back(self):
        self.page.evaluate('honeycomb_menu_context_back(hub._menuContext)')
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
            {'type':'media','entity':'media_player.player_a','name':'Media','favorites_sensor':'sensor.favorites','favorites_cache_sensor':'sensor.favorites_cache'}]})
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
        self.assertEqual(self.page.locator('honeycomb-menu').count(),1)
    def test_issue78_hub_launchers_survive_repeated_light_navigation(self):
        self.issue78_hub()
        root_geometry=self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop,el.offsetWidth,el.offsetHeight])')
        self.page.evaluate('''()=>{window.rootMenu=hub._hubMenu;window.rootCubes=[...rootMenu.shadowRoot.querySelectorAll('honeycomb-menu-item,honeycomb-persistent-control')]}''')
        for cycle in range(2):
            for slot,entity in [(1,'light.zone_a'),(3,'light.zone_b')]:
                launcher=self.page.locator(f'honeycomb-menu [data-honeycomb-slot="{slot}"] .interaction-surface')
                calls_before=self.page.evaluate('calls.length')
                self.activate(launcher)
                self.assertEqual(self.page.evaluate('calls.length'),calls_before+1)
                self.assertEqual(self.page.evaluate('calls.at(-1)'),['homeassistant','toggle',{}, {'entity_id':entity}])
                self.hold_input(launcher)
                self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
                self.assert_visible_unique_cells(7)
                self.activate(self.page.locator('honeycomb-menu [aria-label="Color"]'))
                self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===18')
                self.assert_visible_unique_cells(19)
                # Return through the visible center controls, using real touch on mobile.
                self.activate(self.page.locator('honeycomb-menu .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===1')
                self.assert_visible_unique_cells(7)
                self.activate(self.page.locator('honeycomb-menu .center-item .interaction-surface'))
                self.page.wait_for_function('hub._menuContext.stack.length===0')
                self.assert_visible_unique_cells(4)
                self.assertEqual(self.controls().evaluate_all('(els)=>els.map(el=>[el.offsetLeft,el.offsetTop,el.offsetWidth,el.offsetHeight])'),root_geometry)
                self.assertTrue(self.page.evaluate('hub._hubMenu===rootMenu && rootCubes.every(el=>el.isConnected && el.style.visibility!=="hidden")'))
        self.capture('issue78-restored-hub')
        # Full close from a nested palette must produce exactly one clean base overlay.
        self.hold_input(self.page.locator('honeycomb-menu [data-honeycomb-slot="1"] .interaction-surface'))
        self.activate(self.page.locator('honeycomb-menu [aria-label="Color"]'))
        self.page.evaluate('honeycomb_menu_context_close(hub._menuContext)')
        self.page.wait_for_function('hub._hubMenu && hub._hubMenu!==rootMenu && hub._menuContext.stack.length===0')
        self.assert_visible_unique_cells(4)
        self.hold_input(self.page.locator('honeycomb-menu [data-honeycomb-slot="3"] .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.assert_visible_unique_cells(7)
    def test_issue78_light_slot_mapping_presets_and_capabilities(self):
        self.issue78_hub()
        for slot,labels,preset in [(1,['100%','60%','Color','2700K','5%','5%'],'kelvin'),(3,['100%','70%','Color','210° · 65%','5%','5%'],'color')]:
            self.hold_input(self.page.locator(f'honeycomb-menu [data-honeycomb-slot="{slot}"] .interaction-surface'))
            self.assert_visible_unique_cells(7)
            self.assertEqual(self.page.locator('honeycomb-menu-item .interaction-surface').evaluate_all('(els)=>els.map(el=>el.getAttribute("aria-label"))'),labels)
            mapping=self.page.evaluate('hub._hubMenu.buttons.map(b=>({slot:b.slot,action:b.tap_action.action,preset:b.tap_action.preset_type||null}))')
            self.assertEqual([b['slot'] for b in mapping],list(range(1,7)))
            self.assertEqual([b['preset'] for b in mapping],[None,'brightness',None,preset,None,None])
            self.assertEqual(mapping[2]['action'],'honeycomb-open-nested')
            self.capture(f'issue78-light-{preset}')
            target=self.page.locator('honeycomb-menu [data-honeycomb-slot="3"] .interaction-surface')
            self.activate(target)
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'turn_on')
            self.hold_input(target)
            self.assertEqual(self.page.evaluate('calls.at(-1)[1]'),'set_value')
            self.back()
        # The existing capability-dependent slot 3 is White for temperature-only
        # lights and a passive Light action for brightness-only lights.
        for modes,label in [(['color_temp'],'White'),(['brightness'],'Light')]:
            self.page.evaluate('modes=>pushState("light.zone_a","on",{brightness:128,supported_color_modes:modes})',modes)
            self.hold_input(self.page.locator('honeycomb-menu [data-honeycomb-slot="1"] .interaction-surface'))
            self.assert_visible_unique_cells(7)
            self.assertEqual(self.page.locator('honeycomb-menu [data-honeycomb-slot="2"] .interaction-surface').get_attribute('aria-label'),label)
            if label=='White':
                self.activate(self.page.locator('honeycomb-menu [aria-label="White"]'))
                self.assert_visible_unique_cells(19)
                self.assertTrue(self.page.evaluate('hub._hubMenu.buttons.slice(6).every(b=>b.tap_action.data.color_temp_kelvin>0)'))
                self.back()
            self.back()
    def test_standalone_launcher_restores_after_close(self):
        self.page.evaluate('makeControl({module:"light",entity:"light.zone_a"})')
        target=self.page.locator('body > honeycomb-persistent-control .interaction-surface')
        for cycle in range(2):
            self.hold_input(target)
            self.page.wait_for_function('view.querySelector("honeycomb-menu")')
            self.assertEqual(self.page.locator('body > honeycomb-persistent-control').evaluate('(el)=>getComputedStyle(el).visibility'),'hidden')
            self.page.evaluate('honeycomb_menu_close()')
            self.page.wait_for_function('!view.querySelector("honeycomb-menu")')
            self.assertTrue(target.is_visible())
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
            a=Image.open(io.BytesIO(self.page.locator('honeycomb-menu .center-item').screenshot())).convert('RGB')
            b=Image.open(io.BytesIO(self.page.locator('body > honeycomb-persistent-control').screenshot())).convert('RGB')
            self.assertEqual(a.size,b.size)
            box=(10,10,a.width-10,a.height-10)
            difference=ImageChops.difference(a.crop(box),b.crop(box))
            self.assertLess(max(ImageStat.Stat(difference).mean),1, module+' painted parity')
            self.page.evaluate('honeycomb_menu_context_dispose(hub._menuContext);hub.remove();control.remove()')
    def test_canonical_hub_full_cell_colors_and_logo(self):
        self.hub({'logo':'auto','items':[{'type':'light','entity':'light.zone_a'},{'type':'sonos','entity':'media_player.player_a'}]})
        self.settle()
        self.assertEqual(self.controls().count(),3)
        faces=self.page.evaluate('''()=>[...hub._hubMenu.shadowRoot.querySelectorAll('honeycomb-menu-item,honeycomb-persistent-control')].map(el=>({
            width:el.getBoundingClientRect().width,points:el.shadowRoot.querySelector('.hex-outer').getAttribute('points'),
            fill:el.shadowRoot.querySelector('.hex-fill').getAttribute('fill'),outer:el.shadowRoot.querySelector('.hex-outer').getAttribute('fill')}))''')
        self.assertTrue(all(f['width']==82 and f['points'].startswith('50,0 ') and f['outer']=='#34383d' for f in faces))
        self.assertIn('rgb(255, 128, 0)',[f['fill'] for f in faces])
        self.assertTrue(self.page.locator('honeycomb-menu .bee-icon').is_visible())
        self.capture('hub-reference')
    def test_logo_false_allows_functional_center_and_zero_items(self):
        self.hub({'logo':False,'items':[{'type':'generic','entity':'sensor.value_a','name':'Value A','slot':0}]})
        self.assertTrue(self.page.locator('honeycomb-menu .primary').is_visible())
        self.assertEqual(self.page.locator('honeycomb-menu .bee-icon').count(),1) # generic default icon, not branding
        self.page.evaluate('honeycomb_menu_context_dispose(hub._menuContext);hub.remove()')
        self.hub({'logo':False,'items':[]})
        self.assertEqual(self.controls().count(),0)
        self.capture('empty-hub')
    def test_light_presets_palette_swatches_and_back_keep_anchor(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','presets':{'brightness':{'entity':'input_number.brightness_a'}}}]})
        self.hold(self.page.locator('honeycomb-menu .center-item .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        origin=self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]')
        fills=self.page.locator('honeycomb-menu-item .hex-fill').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("fill"))')
        self.page.locator('honeycomb-menu [aria-label="Color"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===18')
        self.assertEqual(self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY,hub._hubMenu.sizes.item]'),origin)
        self.assertEqual(self.page.locator('honeycomb-menu-item .hex-fill').evaluate_all('(nodes)=>nodes.slice(0,6).map(n=>n.getAttribute("fill"))'),fills)
        swatches=self.page.evaluate('''()=>[...hub._hubMenu.shadowRoot.querySelectorAll('honeycomb-menu-item')].slice(-12).map(el=>el.shadowRoot.querySelector('.hex-fill').getAttribute('fill'))''')
        self.assertEqual(len(set(swatches)),12);self.assertTrue(all(c.startswith('hsl(') for c in swatches))
        self.capture('light-palette')
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        preset=self.page.locator('honeycomb-menu [data-honeycomb-slot="1"] .interaction-surface')
        preset.click();self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['light','turn_on'])
        self.hold(preset);self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['input_number','set_value'])
    def test_sonos_favorites_cache_volume_and_grouping(self):
        self.hub({'logo':False,'items':[{'type':'sonos','entity':'media_player.player_a','favorites_sensor':'sensor.favorites','favorites_cache_sensor':'sensor.favorites_cache','members':[{'entity':'media_player.player_b','name':'Player B'}],'toggle_member_script':'script.toggle_member_a'}]})
        self.page.locator('honeycomb-menu .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['media_player','media_play_pause'])
        self.hold(self.page.locator('honeycomb-menu .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.page.locator('honeycomb-menu [data-honeycomb-slot="0"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[3].entity_id'),['media_player.player_a','media_player.player_b'])
        self.page.locator('honeycomb-menu [aria-label="Join"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===7')
        self.page.locator('honeycomb-menu [data-honeycomb-slot="6"] .interaction-surface').click()
        self.assertEqual(self.page.evaluate('calls.at(-1)[2].member'),'media_player.player_b')
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.page.locator('honeycomb-menu [aria-label="Radio"]').click()
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===7')
        self.assertTrue(self.page.locator('honeycomb-menu .primary').filter(has_text='Station A').is_visible())
        thumbnail='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22%3E%3Crect width=%2224%22 height=%2224%22 fill=%22red%22/%3E%3C/svg%3E'
        self.page.evaluate("thumbnail=>pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',thumbnail}]})",thumbnail)
        self.page.wait_for_function("getComputedStyle(hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-slot=\"6\"]').shadowRoot.querySelector('.artwork')).backgroundImage.includes('data:image/svg+xml')")
        self.assertEqual(self.page.locator('honeycomb-menu [data-honeycomb-slot="6"] .primary').evaluate('(el)=>getComputedStyle(el).display'),'none')
        self.capture('favorite-artwork')
        self.page.locator('honeycomb-menu [data-honeycomb-slot="6"] .interaction-surface').click()
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
        self.page.wait_for_function('view.querySelector("honeycomb-menu").buttons.filter(Boolean).length===4')
        self.page.locator('honeycomb-menu [data-honeycomb-slot="3"] .interaction-surface').click()
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
        self.assertEqual(self.page.locator('honeycomb-menu .hex-outer').get_attribute('fill'),'#34383d')
    def test_centerless_light_menu_and_replacement_keep_one_owned_overlay(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'},{'type':'light','entity':'light.zone_a'}]})
        self.assertEqual(self.page.locator('honeycomb-menu .center-item').count(),0)
        self.hold(self.page.locator('honeycomb-menu .interaction-surface').first)
        self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===6')
        self.assertEqual(self.page.locator('honeycomb-menu .center-item').count(),1)
        self.back();self.page.wait_for_function('hub._hubMenu.buttons.filter(Boolean).length===2')
        self.assertEqual(self.page.locator('honeycomb-menu .center-item').count(),0)
        self.page.evaluate('honeycomb_menu_context_dispose(hub._menuContext);hub.remove()')
        self.hub({'logo':False,'items':[{'module':'generic','entity':'sensor.value_a','name':'Item A','menu':{
            'nested_expand':False,'animate':False,'buttons':[{'name':'Replacement','show_name':True,'tap_action':{'action':'none'}}]}}]})
        self.hold(self.page.locator('honeycomb-menu .interaction-surface'))
        self.page.wait_for_function('hub._hubMenu===hub._menuContext.honeycomb && hub._menuContext.stack.length===1')
        self.assertTrue(self.page.locator('honeycomb-menu [aria-label="Replacement"]').is_visible())
        self.assertEqual(self.page.locator('honeycomb-menu').count(),1)
        self.back();self.page.wait_for_function('hub._hubMenu===hub._menuContext.honeycomb && hub._menuContext.stack.length===0')
        self.assertEqual(self.page.locator('honeycomb-menu').count(),1)
    def test_nested_menu_keeps_its_own_defaults(self):
        child={'nested_expand':True,'animate':False,'buttons':[{'name':'Child','show_name':True,'tap_action':{'action':'none'}}]}
        self.hub({'logo':False,'items':[{'module':'generic','entity':'sensor.value_a','name':'Item A','menu':{
            'animate':False,'button_defaults':{'styles':{'card':[{'background':'#174b32'}]}},'buttons':[
                {'name':'Details','show_name':True,'tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':child}}]}}]})
        self.hold(self.page.locator('honeycomb-menu .interaction-surface'))
        self.page.locator('honeycomb-menu [aria-label="Details"]').click()
        target=self.page.locator('honeycomb-menu-item').filter(has=self.page.locator('.primary',has_text='Child'))
        self.assertEqual(target.locator('.hex-fill').get_attribute('fill'),'#34424e')
    def test_empty_placeholders_are_passive(self):
        self.page.evaluate("window.menu=honeycomb_menu({entity:'light.zone_a',animate:false,position_mode:'anchored',anchor_x:innerWidth/2,anchor_y:300,buttons:[{slot:1,slot_mode:'hard',name:'Action A',show_name:true,tap_action:{action:'none'}}]})")
        self.page.wait_for_function('window.menu.shadowRoot.querySelectorAll("honeycomb-menu-item").length===7')
        passive=self.page.locator('honeycomb-menu-item').filter(has=self.page.locator('.interaction-surface')).count()
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
        target=self.page.locator('honeycomb-menu .interaction-surface');box=target.bounding_box()
        self.page.mouse.move(box['x']+25,box['y']+40);self.page.mouse.down();self.page.mouse.move(box['x']+50,box['y']+40,steps=4);self.page.mouse.up()
        self.assertEqual(self.page.evaluate('calls.length'),1)
    def test_lifecycle_resize_and_reconnect_leave_one_overlay(self):
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
        self.page.evaluate("hub.style.left='100px'")
        self.page.wait_for_function('Math.abs(hub._hubMenu._anchorX-141)<.1')
        self.hold(self.page.locator('honeycomb-menu .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        origin=self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY]')
        self.page.evaluate("hub.style.left='150px'")
        self.page.wait_for_timeout(100)
        self.assertEqual(self.page.evaluate('[hub._hubMenu._anchorX,hub._hubMenu._anchorY]'),origin)
        self.back();self.page.wait_for_function('Math.abs(hub._hubMenu._anchorX-191)<.1')
        self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-menu').count(),0)
        self.page.evaluate('document.body.append(hub)');self.page.wait_for_function('view.querySelectorAll("honeycomb-menu").length===1')

    def test_baseline(self):
        self.page.evaluate("document.body.style.setProperty('--honeycomb-persistent-size','82px')")
        self.hub({'size':82,'logo':True,'items':[{'type':'light','entity':'light.zone_a'},{'type':'sonos','entity':'media_player.player_a'}]})
        # Fix the host CSS width to the reference cell size. v1.5.1 applies size
        # inside its host, otherwise the bootstrap falls back to 72 px.
        self.page.evaluate("hub.style.setProperty('--honeycomb-persistent-size','82px')")
        self.page.evaluate('hub._menuContext.honeycomb.reanchor(innerWidth/2,310)')
        self.capture('hub-reference')
        if self.evidence:
            self.page.locator('honeycomb-menu .ring-item').first.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-light-cell.png'))
        self.page.evaluate('honeycomb_menu_context_dispose(hub._menuContext);hub.remove()')
        self.hub({'size':82,'logo':False,'items':[{'type':'generic','entity':'sensor.value_a','name':'Value A','label':'24'}]})
        self.capture('generic-reference')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',type=Path,required=True)
    parser.add_argument('--button-card',type=Path,required=True)
    parser.add_argument('--baseline',action='store_true')
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
            for width,height in [(1100,900),(390,844)]:
                Cubes.viewport={'width':width,'height':height}
                names=['test_baseline'] if args.baseline else [n for n in unittest.defaultTestLoader.getTestCaseNames(Cubes) if n!='test_baseline']
                result=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Cubes(n) for n in names))
                success=result.wasSuccessful() and success
            Cubes.browser.close()
    finally: server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__': raise SystemExit(main())
