"""Issue #137: Hub OFF identity only; Browser plugin not available.
Flow: several OFF lights -> live ON/OFF/unavailable -> refresh -> palette/Back.
"""
import argparse, os, shutil, threading, unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler, CheckResult
from beta4_navigation import Navigation

class LightOff(Navigation):
    def seed(self):
        self.page.evaluate('''()=>{
            pushState('light.zone_a','off',{friendly_name:'Long HA Light Name',brightness:128,rgb_color:[40,80,120],supported_color_modes:['hs','color_temp'],color_mode:'color_temp',min_color_temp_kelvin:2200,max_color_temp_kelvin:6500});
            pushState('light.zone_b','off',{friendly_name:'Light B',supported_color_modes:['color_temp'],color_mode:'color_temp',min_color_temp_kelvin:2200,max_color_temp_kelvin:6500});
            pushState('light.long_name','off',{friendly_name:'A very long friendly light name that must not overflow the cube',supported_color_modes:['brightness']});
        }''')
        self.hub({'logo':'auto','items':[{'type':'light','entity':'light.zone_a','name':'A','slot':1},
            {'type':'light','entity':'light.zone_b','slot':2},{'type':'light','entity':'light.long_name','slot':3}]});self.settle()
    def test_off_names_live_transitions_and_containment(self):
        self.seed()
        for slot,name in [(1,'A'),(2,'Light B'),(3,'A very long friendly light name that must not overflow the cube')]:
            self.assertEqual(self.model(slot)['name'],name);self.assertEqual(self.model(slot)['secondary'],'OFF')
            self.assertAlmostEqual(self.cell(slot).bounding_box()['width'],82,delta=.1)
            for selector in ['.primary','.secondary']:
                text=self.cell(slot).locator(selector)
                self.assertEqual(text.evaluate('e=>getComputedStyle(e).textOverflow'),'ellipsis')
                bounds=text.bounding_box();cube=self.cell(slot).bounding_box()
                self.assertGreaterEqual(bounds['x'],cube['x']);self.assertLessEqual(bounds['x']+bounds['width'],cube['x']+cube['width'])
        self.assertGreater(self.cell(3).locator('.primary').evaluate('e=>e.scrollWidth'),self.cell(3).locator('.primary').evaluate('e=>e.clientWidth'))
        self.capture('issue137-off-names')
        self.light_state('on',{'brightness':128});self.assertEqual(self.model(1)['secondary'],'50%');self.assertEqual(self.model(1)['name'],'')
        ring=self.model(1)['colors']['inner'];self.capture('issue137-on-unchanged')
        self.light_state('off',{});self.assertEqual(self.model(1)['name'],'A');self.assertEqual(self.model(1)['secondary'],'OFF');self.assertEqual(self.model(1)['colors']['inner'],ring)
        for state in ['unknown','unavailable']:
            self.light_state(state,{});self.assertEqual(self.model(1)['secondary'],'Unavailable');self.assertEqual(self.model(1)['name'],'')
        self.assert_no_commands()
    def test_reload_fallbacks_templates_and_name_updates(self):
        self.seed();self.page.reload();self.page.wait_for_function('window.ready');self.seed()
        self.assertEqual(self.model(1)['name'],'A');self.assertEqual(self.model(2)['name'],'Light B')
        self.page.evaluate('pushState("light.zone_b","off",{friendly_name:"Updated Light B",supported_color_modes:["color_temp"]})');self.settle();self.assertEqual(self.model(2)['name'],'Updated Light B')
        self.page.evaluate('hub.remove()');self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','name':'[[[ return variables.short; ]]]','variables':{'short':'C'},'slot':0}]});self.settle();self.assertEqual(self.model(0)['name'],'C')
        self.page.evaluate('hub.remove();pushState("light.zone_a","off",{})');self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','slot':0}]});self.settle();self.assertEqual(self.model(0)['name'],'zone a');self.assertEqual(self.model(0)['secondary'],'OFF');self.assert_no_commands()
    def test_off_launcher_palette_and_center_back_unchanged(self):
        self.seed();self.hold_input(self.cell(1).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.model(0)['secondary'],'Off');self.assertEqual(self.cell(0).locator('.interaction-surface').get_attribute('aria-label'),'Back')
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'white');self.assertEqual(self.model(3)['name'],'White')
        self.hold_input(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'color');self.assert_no_commands()
        self.back();self.back();self.back();self.settle();self.assertEqual(self.model(1)['name'],'A');self.assertEqual(self.model(1)['secondary'],'OFF');self.assert_no_commands()

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            LightOff.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);LightOff.url=f'http://127.0.0.1:{server.server_port}';LightOff.evidence=args.evidence_dir
            for width,height in [(1100,900),(390,844)]:
                LightOff.viewport={'width':width,'height':height};names=[n for n in LightOff.__dict__ if n.startswith('test_')]
                r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(LightOff(n) for n in names));success=r.wasSuccessful() and success
            LightOff.browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
