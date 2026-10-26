"""Info Cube: caller -> real modal -> tap return / fixed 30s close-all.
Browser plugin not available; repository Playwright Chromium, synthetic HA only.
"""
import argparse, os, shutil, threading, unittest, json
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler, CheckResult
from beta4_navigation import Navigation
from charger import charger
from beta5 import FLOORPLAN

class Info(Navigation):
    def root(self,extra=None):
        self.hub({'logo':'auto','items':[{'name':'Info','icon':'mdi:information','slot':1,'tap_action':{'action':'honeycomb-info','info':{'title':'Information','text':'Æblegrød, Ørsted and safe read-only information.'}}},*(extra or [])]});self.settle()
    def open(self,config=None):
        if config is None:self.activate(self.cell(1).locator('.interaction-surface'))
        else:self.page.evaluate('config=>ng.openInfoInContext(hub._menuContext,config)',config)
        self.page.wait_for_function('!!hub._menuContext.info?._layout');self.page.locator('honeycomb-ng-info .surface').last.wait_for()
    def dialog(self):return self.page.locator('honeycomb-ng-info .surface')
    def snapshot(self):
        self.page.mouse.move(0,0);self.settle()
        return self.page.evaluate('''()=>{const c=hub._menuContext,m=hub._hubMenu;return {config:JSON.stringify(c.currentConfig),stack:JSON.stringify(c.stack),navigation:c.navigation,anchor:[m._anchorX,m._anchorY],cells:[...m.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control')].map(e=>{const r=e.getBoundingClientRect();return [e.config._hub_item_id,r.x,r.y,r.width]})}}''')
    def assert_safe(self):
        lines=self.page.locator('honeycomb-ng-info').evaluate('''e=>{const g=e._geometry,l=e._layout;return [...e.shadowRoot.querySelectorAll('.info-line')].map(t=>{const b=t.getBBox();return {r:{x:b.x,y:b.y,width:b.width,height:b.height},g}});}''')
        for line in lines:
            r,g=line['r'],line['g'];self.assertGreaterEqual(r['y'],0)
            def bound(y):return max(0,(abs(y-g['height']/2)-g['height']/4)*g['width']/(g['height']/2))+10
            left=max(bound(r['y']),bound(r['y']+r['height']))
            self.assertGreaterEqual(r['x']+.3,left);self.assertLessEqual(r['x']+r['width'],g['width']-left+.3)
    def test_declarative_root_safe_hex_and_tap_exact_return(self):
        self.root();before=self.snapshot();self.open();self.assertEqual(self.dialog().get_attribute('aria-label'),'Information')
        shell=self.page.locator('honeycomb-ng-info honeycomb-menu-ng-item');self.assertAlmostEqual(shell.bounding_box()['width'],328,delta=.1)
        self.assertAlmostEqual(shell.locator('.hex-outer').bounding_box()['width'],328,delta=.1)
        self.assertEqual(self.page.evaluate('hub._menuContext.info._geometry.footprint.slots'),list(range(8)))
        self.assertTrue(self.page.evaluate('hub._hubMenu.shadowRoot.querySelector("#honeycombs").inert'));self.assert_safe()
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-text.png'))
        self.activate(self.dialog());self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assertEqual(self.snapshot(),before);self.assert_no_commands()
    def test_fixed_30_seconds_despite_updates_and_scroll_closes_all(self):
        self.root();self.page.clock.install();self.open({'text':'Read-only '*150})
        self.page.clock.run_for(29000);self.assertEqual(self.page.locator('honeycomb-ng-info').count(),1)
        self.page.evaluate('pushState("sensor.unrelated","42");hub._menuContext.info._turn(1)');self.page.clock.run_for(1001)
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),0)
        self.assert_no_commands()
    def test_light_recursive_palette_exact_state_and_back(self):
        self.light_main();self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.hold_input(self.cell(7).locator('.interaction-surface'));self.settle();before=self.snapshot();palette=self.palette()
        self.open({'title':'Light details','text':{'entity':'light.zone_a','prefix':'State: '}});self.dialog().press('Escape')
        self.assertEqual(self.snapshot(),before);self.assertEqual(self.palette(),palette);self.back();self.settle();self.assertEqual(self.palette(),'white');self.assert_no_commands()
    def test_sonos_charger_and_generic_nested_menus_restore(self):
        self.root([{'type':'sonos','entity':'media_player.player_a','slot':2},charger(1)|{'slot':3}])
        for slot in [2,3]:
            self.hold_input(self.cell(slot).locator('.interaction-surface'));self.settle();before=self.snapshot()
            self.open({'mode':'stack','title':'Details','blocks':['Read only','No commands']});self.dialog().press('Enter');self.assertEqual(self.snapshot(),before);self.back();self.settle()
        self.page.evaluate('ng.openInContext(hub._menuContext,{nested_expand:true,buttons:[{name:"Generic child",tap_action:{action:"honeycomb-info",info:{text:"Child info"}}}]})');self.settle()
        before=self.snapshot();self.activate(self.cell(1).locator('.interaction-surface'));self.dialog().press('Enter');self.assertEqual(self.snapshot(),before);self.assert_no_commands()
    def test_wrapping_pagination_positioned_danish_and_injection(self):
        self.root();self.open({'title':'Safe text','text':'ÆØÅ æøå '+('<img src=x onerror=alert(1)> ${neverRun()} '+'LangtOrdUdenMellemrum'*4+' ')*50})
        self.assert_safe();self.assertEqual(self.page.locator('honeycomb-ng-info img').count(),0)
        self.assertGreater(self.page.evaluate('hub._menuContext.info._layout.pages.length'),1)
        self.dialog().press('PageDown');self.assertEqual(self.page.evaluate('hub._menuContext.info._page'),1);self.assert_safe()
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-long-page2.png'))
        self.dialog().press('Escape')
        self.open({'mode':'positioned','blocks':[{'text':'Read-only','x':50,'y':30,'z':2,'align':'center','weight':700},{'text':'Energy 12.4 kWh','x':50,'y':50,'z':0,'align':'center'},{'text':'Clamped','x':0,'y':75}]})
        self.assert_safe();self.assertTrue(self.page.evaluate('hub._menuContext.info._layout.warnings.length>0'))
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-positioned.png'));self.dialog().press('Escape');self.assert_no_commands()
    def test_dynamic_updates_are_dependency_aware_and_preserve_page_and_timer(self):
        self.root();self.page.clock.install();self.open({'mode':'stack','title':'Live HA','blocks':[{'text':{'entity':'sensor.energy','prefix':'Energy: ','suffix':' kWh','fallback':'Waiting'}}]})
        self.assertIn('Waiting',self.dialog().text_content());self.page.evaluate('window.layoutBefore=hub._menuContext.info._layout;pushState("sensor.unrelated","1")')
        self.assertTrue(self.page.evaluate('hub._menuContext.info._layout===layoutBefore'))
        self.page.evaluate('pushState("sensor.energy","12.4")');self.page.clock.run_for(100);self.assertIn('12.4',self.dialog().text_content());self.assert_safe()
        self.page.clock.run_for(30100);self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assert_no_commands()
    def test_no_clickthrough_underlying_command_or_late_navigation(self):
        self.root();self.open();before=self.snapshot()
        self.page.evaluate('''()=>{hub._hubMenu.shadowRoot.querySelector('[data-honeycomb-slot="0"]')._executeAction({action:'call-service',service:'light.turn_on'});ng.openInContext(hub._menuContext,{nested_expand:true,buttons:[]});}''')
        self.assertEqual(self.snapshot(),before);self.assert_no_commands()
        self.page.mouse.click(2,2);self.assertEqual(self.page.locator('honeycomb-ng-info').count(),1)
        self.activate(self.dialog());self.assert_no_commands()
    def test_repeated_open_removal_editor_and_multiple_instances_cleanup(self):
        self.root();self.page.clock.install();self.open({'text':'First'});self.page.clock.run_for(20000);self.open({'text':'Second'})
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),1);self.page.clock.run_for(10001);self.assertEqual(self.page.locator('honeycomb-ng-info').count(),1)
        self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0)
        self.page.clock.run_for(40000);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0);self.assert_no_commands()
    def test_scroll_swipe_keyboard_no_service_and_responsive_resize(self):
        self.root();self.open({'text':'Long text for pagination '*150});self.dialog().hover();self.page.mouse.wheel(0,150)
        self.page.wait_for_function('hub._menuContext.info._page===1');self.dialog().press('PageUp');self.assertEqual(self.page.evaluate('hub._menuContext.info._page'),0)
        self.dialog().press('Tab');self.assertEqual(self.dialog().evaluate('e=>e.getRootNode().activeElement===e'),True)
        self.page.set_viewport_size({'width':320,'height':600});self.page.wait_for_timeout(50);self.assert_safe()
        box=self.dialog().bounding_box();self.assertGreaterEqual(box['x'],11);self.assertLessEqual(box['x']+box['width'],309)
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-320px.png'));self.dialog().press('Escape');self.assert_no_commands()
    def test_multiple_hubs_only_top_modal_handles_keyboard_and_each_disposes(self):
        self.root();self.open({'text':'First hub'})
        self.page.evaluate("window.firstHub=hub;makeHub({logo:'auto',items:[{type:'light',entity:'light.zone_a'}]})")
        self.settle();self.open({'text':'Second hub'})
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),2)
        self.page.locator('honeycomb-ng-info').last.locator('.surface').press('Escape')
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),1)
        self.assertTrue(self.page.evaluate('!!firstHub._menuContext.info'));self.page.evaluate('firstHub.remove();hub.remove()')
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assert_no_commands()
    def test_real_touch_swipe_changes_page_then_tap_returns(self):
        if self.viewport['width']>=500:return
        self.root();self.open({'text':'A long safe payload '*150})
        box=self.dialog().bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
        session=self.page.context.new_cdp_session(self.page)
        try:
            session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-60}]})
            session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        finally:session.detach()
        self.page.wait_for_function('hub._menuContext.info._page===1');self.assert_safe();self.activate(self.dialog())
        self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assert_no_commands()
    def test_scaled_floorplan_empty_center_and_editor_cleanup(self):
        config={'type':'custom:honeycomb-persistent-hub','size':'auto','auto_reference_width':900,'logo':False,'items':[{'type':'generic','slot':1,'name':'Info','tap_action':{'action':'honeycomb-info','info':{'text':'Scaled Info'}}}]}
        self.page.evaluate(FLOORPLAN,config);self.page.evaluate('floor.style.width="450px";imageHost.style.height="300px"');self.page.wait_for_function('hub._hubMenu?.sizes.item===41');self.settle()
        self.open();self.assertAlmostEqual(self.page.evaluate('hub._menuContext.info._geometry.width'),164,delta=.1);self.assert_safe()
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-auto41.png'))
        self.page.evaluate('floor.style.width="900px";imageHost.style.height="600px"');self.page.wait_for_function('hub._hubMenu.sizes.item===82 && hub._menuContext.info._geometry.width===328');self.assert_safe()
        self.page.evaluate('hub.remove()');self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assert_no_commands()
    def test_declarative_text_never_executes_javascript_and_invalid_config_is_clear(self):
        self.hub({'logo':'auto','items':[{'type':'generic','slot':1,'name':'Info','tap_action':{'action':'honeycomb-info','info':{'text':'${window.shouldNotRun=42} [[[ return 9; ]]] <script>window.shouldNotRun=43</script>'}}}]});self.settle()
        self.open();self.assertFalse(self.page.evaluate('!!window.shouldNotRun'));self.assertIn('${window.shouldNotRun=42}',self.dialog().text_content());self.assert_safe()
        self.dialog().press('Escape');message=self.page.evaluate('()=>{try{ng.openInfoInContext(hub._menuContext,{text:"A",font_size:2})}catch(e){return e.message}}')
        self.assertIn('Info Cube:',message);self.assertEqual(self.page.locator('honeycomb-ng-info').count(),0);self.assert_no_commands()
    def test_reopening_keeps_original_focus_and_fixed_lifetime(self):
        self.root();opener=self.cell(1).locator('.interaction-surface');opener.focus()
        self.open({'text':'First'});self.open({'text':'Second'})
        self.dialog().press('Escape');self.assertTrue(opener.evaluate('e=>e.getRootNode().activeElement===e'));self.assert_no_commands()
    def test_empty_whitespace_and_positioned_payloads_have_visible_fallback(self):
        self.root()
        for config in [{'text':' \n'*1000},{'mode':'stack','blocks':[]},{'mode':'positioned','blocks':[]}]:
            self.open(config);self.assertIn('No information available',self.dialog().text_content());self.assertEqual(self.page.evaluate('hub._menuContext.info._layout.pages.length'),1);self.assert_safe();self.dialog().press('Escape')
        self.assert_no_commands()
    def test_charging_plan_example(self):
        self.root();payload=json.loads((Path(__file__).resolve().parents[1]/'fixtures/info-charging-plan.json').read_text());self.open(payload);self.assert_safe()
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-info-charging-plan.png'));self.dialog().press('Enter');self.assert_no_commands()

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Info.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Info.url=f'http://127.0.0.1:{server.server_port}';Info.evidence=args.evidence_dir
            for width,height in [(1100,900),(768,1024),(390,844)]:
                Info.viewport={'width':width,'height':height};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Info(n) for n in Info.__dict__ if n.startswith('test_')));success=r.wasSuccessful() and success
            Info.browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
