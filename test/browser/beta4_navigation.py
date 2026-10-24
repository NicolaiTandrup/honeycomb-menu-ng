"""Issue #133/#134: real pointer/touch navigation with synthetic HA.
Browser plugin not available; use repository Playwright Chromium harness.
Flow: Hub -> Light/Charger -> palette/detail -> Back; no commands on navigation.
"""
import argparse, os, shutil, threading, unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler, CheckResult
from charger import Charger, charger
from beta5 import FLOORPLAN

class Navigation(Charger):
    baseline=False
    def light_main(self,modes=None,mode='color_temp',state='on'):
        self.page.evaluate('([modes,mode,state])=>pushState("light.zone_a",state,{brightness:128,supported_color_modes:modes,color_mode:mode,min_color_temp_kelvin:2200,max_color_temp_kelvin:6500})',[modes or ['hs','color_temp'],mode,state])
        self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','slot':0}]})
        self.hold_input(self.cell(0).locator('.interaction-surface'));self.settle()
    def light_state(self,state,attributes):
        self.page.evaluate('([s,a])=>pushState("light.zone_a",s,{...hass.states["light.zone_a"].attributes,...a})',[state,attributes]);self.settle()
    def center(self,slot):
        r=self.cell(slot).bounding_box();return (r['x']+r['width']/2,r['y']+r['height']/2)
    def nested_overview(self):
        self.overview();self.settle()
        self.page.evaluate('''()=>{
            const snapshot=structuredClone(hub._menuContext.currentConfig);
            snapshot.buttons=hub._hubMenu.buttons.filter(Boolean);
            delete snapshot._persistent_hub_root;
            snapshot.nested_expand=true;snapshot.promote_to_center=true;
            snapshot.promoted_center=structuredClone(snapshot.persistent_center);
            ng.openInContext(hub._menuContext,snapshot);
        }''');self.settle()
    def palette(self):return self.page.evaluate('hub._hubMenu.config._light_palette_view')
    def test_current_white_opposite_color_labels_manual_selection_and_reopen(self):
        self.light_main();self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.capture('issue133-before-current-white-opens-color' if self.baseline else 'issue133-after-current-white')
        if self.baseline:
            self.assertTrue(self.page.evaluate('hub._hubMenu.buttons[6].tap_action.data.hs_color!==undefined'));return
        self.assertEqual(self.palette(),'white');self.assertEqual(self.model(0)['name'],'White');self.assertEqual(self.model(0)['secondary'],'Color')
        self.hold_input(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.palette(),'color');self.assertEqual(self.model(0)['name'],'Color');self.assertEqual(self.model(0)['secondary'],'White')
        self.light_state('on',{'brightness':200,'color_mode':'color_temp'})
        self.assertEqual(self.palette(),'color');self.assert_no_commands();self.capture('issue133-after-manual-color-retained')
        self.cell(3).locator('.interaction-surface').press('Shift+Enter');self.settle();self.assertEqual(self.palette(),'white');self.assert_no_commands()
        self.back();self.back();self.back();self.settle();self.assertEqual(self.page.evaluate('hub._menuContext.stack.length'),1)
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'white');self.assert_no_commands()
    def test_capabilities_off_recovery_and_mixed_groups(self):
        if self.baseline:return
        self.light_main(['color_temp']);self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.palette(),'white');self.assertEqual(self.model(0)['secondary'],'');self.assertEqual(self.cell(3).evaluate('(e)=>e.config.hold_action.action'),'none')
        self.back();self.back();self.settle()
        self.light_state('on',{'supported_color_modes':['hs','color_temp'],'color_mode':'hs'})
        self.hold_input(self.cell(0).locator('.interaction-surface'));self.settle()
        self.light_state('off',{'color_mode':None})
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'color');self.assert_no_commands()
        self.back();self.light_state('on',{'color_mode':'color_temp'})
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'white')
        self.back();self.page.evaluate('pushState("light.zone_a","unavailable",{color_mode:null,supported_color_modes:["hs"]})');self.settle()
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle();self.assertEqual(self.palette(),'color');self.assertEqual(self.model(0)['secondary'],'');self.assert_no_commands()
    def test_fixed_white_presets_never_issue_kelvin_and_onoff_has_no_detail(self):
        if self.baseline:return
        self.light_main(['brightness'],None)
        self.assertEqual(self.cell(3).evaluate('(e)=>e.config.tap_action.action'),'none')
        self.assertEqual(self.cell(4).evaluate('(e)=>e.config.tap_action.data'),{'brightness_pct':60})
        self.back();self.page.evaluate('pushState("light.zone_a","on",{supported_color_modes:["onoff"],color_mode:"onoff"})');self.settle()
        self.page.evaluate('hub.remove()');self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','slot':0}]});self.assertIsNone(self.cell(0).evaluate('(e)=>e.config.menu'));self.assert_no_commands()
    def test_charger_promotion_exact_position_gray_children_and_back(self):
        self.nested_overview();self.page.evaluate("hub.style.left=(innerWidth*.65-41)+'px'");self.settle()
        before=self.center(1);self.capture('issue134-overview')
        self.hold_input(self.cell(1).locator('.interaction-surface'));self.settle();after=self.center(0);self.capture('issue134-before-detail' if self.baseline else 'issue134-after-detail')
        delta=sum(abs(a-b) for a,b in zip(before,after))
        if self.baseline:self.assertGreater(delta,40);return
        self.assertLess(delta,.1)
        for slot in range(1,7):self.assertEqual(self.model(slot)['colors']['inner'],'#555b63')
        self.assertEqual(self.model(0)['colors']['inner'],'#43c95b')
        self.activate(self.cell(0).locator('.interaction-surface'));self.settle()
        restored=self.center(1);self.assertAlmostEqual(restored[0],before[0],delta=.1);self.assertAlmostEqual(restored[1],before[1],delta=.1);self.assert_no_commands()
    def test_deeper_generic_promotion_overrides_and_exact_back(self):
        if self.baseline:return
        self.overview([charger(1)])
        # Explicit child override must survive live Charger state and navigation.
        self.cell(1).evaluate('(e)=>e.config.menu.buttons[2].colors={inner_border:"#123456"}')
        self.open_details();self.assertEqual(self.model(3)['colors']['inner'],'#123456')
        self.page.evaluate('chargerSet("sensor.charger_1_status","Ready to charge")');self.settle();self.assertEqual(self.model(3)['colors']['inner'],'#123456')
        prior=self.center(0);selected=self.center(6)
        self.cell(6).evaluate('(e)=>e.config.menu={nested_expand:true,promote_to_center:true,promoted_center:{mode:"generic",name:"Child",show_name:true,colors:{inner_border:"#abcdef"}},buttons:[{slot:1,slot_mode:"hard",name:"Action",tap_action:{action:"none"}}]}')
        self.hold_input(self.cell(6).locator('.interaction-surface'));self.settle()
        center=self.center(0);self.assertAlmostEqual(center[0],selected[0],delta=.1);self.assertAlmostEqual(center[1],selected[1],delta=.1);self.assertEqual(self.model(0)['colors']['inner'],'#abcdef')
        self.back();self.settle();self.assertAlmostEqual(self.center(0)[0],prior[0],delta=.1);self.assertEqual(self.model(3)['colors']['inner'],'#123456');self.assert_no_commands()
    def test_auto_floorplan_promote_at_scaled_size_and_restore(self):
        if self.baseline:return
        config={'type':'custom:honeycomb-persistent-hub','logo':False,'size':'auto','auto_reference_width':900,'items':[{'type':'charging-hub','slot':0,'chargers':[charger(1)]},charger(1)]}
        self.page.evaluate(FLOORPLAN,config);self.page.evaluate('floor.style.width="450px";imageHost.style.height="300px"');self.page.wait_for_function('hub._hubMenu?.sizes.item===41');self.settle()
        before=self.center(1);self.hold_input(self.cell(1).locator('.interaction-surface'));self.settle()
        after=self.cell(0).bounding_box();self.assertAlmostEqual(after['width'],41,delta=.1);self.assertAlmostEqual(self.center(0)[0],before[0],delta=.1);self.assertAlmostEqual(self.center(0)[1],before[1],delta=.1)
        self.back();self.settle();self.assertAlmostEqual(self.center(1)[0],before[0],delta=.1);self.assert_no_commands();self.capture('issue134-auto-41-back')

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--baseline',action='store_true');args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Navigation.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Navigation.url=f'http://127.0.0.1:{server.server_port}';Navigation.evidence=args.evidence_dir;Navigation.baseline=args.baseline
            for width,height in [(1100,900),(390,844)]:
                Navigation.viewport={'width':width,'height':height};names=[n for n in Navigation.__dict__ if n.startswith('test_')]
                if args.baseline:names=[n for n in names if 'current_white' in n or 'exact_position_gray' in n]
                r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Navigation(n) for n in names));success=r.wasSuccessful() and success
            Navigation.browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
