"""Cumulative v1.9 beta.5 UI regressions; synthetic HA, no production commands.
Browser plugin not available; repository Chromium Playwright harness.
Flow: root Hub -> Light palette / Charger detail / nested generic -> Back.
"""
import argparse, os, shutil, threading, unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler, CheckResult
from beta4_navigation import Navigation
from charger import charger

GRAY='rgba(52, 66, 78, 0.94)'
INNER='rgb(52, 66, 78)'
OUTER='rgb(52, 56, 61)'

class UI(Navigation):
    baseline=False
    def fills(self,slot):
        return self.cell(slot).evaluate('e=>Object.fromEntries(["hex-fill","hex-inner","hex-outer"].map(c=>[c,getComputedStyle(e.shadowRoot.querySelector("."+c)).fill]))')
    def test_palette_indicator_belongs_to_three_and_center_restored(self):
        self.light_main();original=self.model(0)
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.capture('beta5-before-indicator-on-center' if self.baseline else 'beta5-after-indicator-on-three')
        if self.baseline:
            self.assertEqual(self.model(0)['name'],'White');self.assertEqual(self.model(0)['secondary'],'Color');return
        self.assertEqual(self.model(3)['name'],'White');self.assertEqual(self.model(3)['secondary'],'Color')
        for key in ['name','secondary','colors','fill']:
            self.assertEqual(self.model(0)[key],original[key],key)
        self.assertEqual(self.cell(0).locator('.interaction-surface').get_attribute('aria-label'),'Back')
        self.hold_input(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.model(3)['name'],'Color');self.assertEqual(self.model(3)['secondary'],'White')
        for key in ['name','secondary','colors','fill']:self.assertEqual(self.model(0)[key],original[key],key)
        self.light_state('on',{'color_mode':'color_temp'});self.assertEqual(self.model(3)['name'],'Color')
        self.hold_input(self.cell(8).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.model(3)['name'],'Color');self.assertEqual(self.model(0)['secondary'],'50%')
        self.back();self.settle();self.assertEqual(self.model(3)['name'],'Color')
        self.back();self.settle();self.assertEqual(self.model(3)['name'],'White');self.assert_no_commands()
        self.capture('beta5-cube3-back-history')
    def test_white_only_and_color_only_no_unsupported_alternative(self):
        if self.baseline:return
        self.light_main(['color_temp']);self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.model(3)['name'],'White');self.assertEqual(self.model(3)['secondary'],'')
        self.assertEqual(self.cell(3).evaluate('e=>e.config.hold_action.action'),'none')
        before=self.page.evaluate('hub._hubMenu.buttons.slice(6).map(b=>b.tap_action.data.color_temp_kelvin)')
        self.hold_input(self.cell(8).locator('.interaction-surface'));self.settle();self.assertEqual(self.model(3)['name'],'White')
        self.back();self.settle();self.assertEqual(self.page.evaluate('hub._hubMenu.buttons.slice(6).map(b=>b.tap_action.data.color_temp_kelvin)'),before)
        self.assert_no_commands();self.page.evaluate('hub.remove()')
        self.light_main(['rgbw'],'rgbw');self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.model(3)['name'],'Color');self.assertEqual(self.model(3)['secondary'],'');self.assert_no_commands()
        self.capture('beta5-color-only-no-white')
    def test_detail_gray_equals_light_reference_root_black_and_status_retained(self):
        self.overview([charger(1)])
        self.state(1,'power','0');self.state(1,'status','Ready to charge')
        root=self.model(1)['colors'];self.assertEqual(root['center'],'#202224');self.assertEqual(root['inner'],'#43c95b')
        self.open_details()
        self.capture('beta5-before-black-details' if self.baseline else 'beta5-after-neutral-details')
        if self.baseline:
            self.assertEqual(self.fills(1)['hex-fill'],'rgb(32, 34, 36)');return
        for slot in range(1,7):self.assertEqual(self.fills(slot),{'hex-fill':GRAY,'hex-inner':INNER,'hex-outer':OUTER})
        self.assertEqual(self.model(0)['colors'],root)
        self.back();self.settle();self.assertEqual(self.model(1)['colors'],root);self.assert_no_commands()
        self.page.evaluate('hub.remove()');self.light_main()
        reference=self.fills(1);self.assertEqual(reference,{'hex-fill':GRAY,'hex-inner':INNER,'hex-outer':OUTER})
        self.capture('beta5-light-neutral-reference')
    def test_three_depth_defaults_and_explicit_background_center_inner_overrides(self):
        if self.baseline:return
        def level(n):
            buttons=[{'slot':2,'slot_mode':'hard','name':'Plain','tap_action':{'action':'none'}},
                     {'slot':3,'slot_mode':'hard','name':'Explicit','colors':{'center':'#345678','inner_border':'#c0ffee'},'tap_action':{'action':'none'}},
                     {'slot':4,'slot_mode':'hard','name':'Styled','styles':{'card':[{'background':'#112233'}]},'colors':{'inner_border':'#333333'},'tap_action':{'action':'none'}}]
            if n<3:buttons.append({'slot':1,'slot_mode':'hard','name':'Next','tap_action':{'action':'honeycomb-open-nested','honeycomb_nested_menu':level(n+1)}})
            return {'nested_expand':True,'buttons':buttons}
        self.hub({'logo':False,'items':[{'type':'generic','slot':0,'name':'Root','background':'#202224','colors':{'inner_border':'#123456'},'menu':level(1)}]})
        root=self.fills(0);self.hold_input(self.cell(0).locator('.interaction-surface'));self.settle()
        for depth in [1,2,3]:
            self.assertEqual(self.fills(2),{'hex-fill':GRAY,'hex-inner':INNER,'hex-outer':OUTER})
            self.assertEqual(self.fills(3),{'hex-fill':'rgb(52, 86, 120)','hex-inner':'rgb(192, 255, 238)','hex-outer':OUTER})
            self.assertEqual(self.fills(4),{'hex-fill':'rgb(17, 34, 51)','hex-inner':'rgb(51, 51, 51)','hex-outer':OUTER})
            self.capture('beta5-generic-depth-'+str(depth))
            if depth<3:self.activate(self.cell(1).locator('.interaction-surface'));self.settle()
        for _ in range(3):self.back();self.settle()
        self.assertEqual(self.fills(0),root);self.assert_no_commands()
    def test_charger_explicit_center_inner_and_outer_overrides(self):
        if self.baseline:return
        self.overview([charger(1)])
        self.cell(1).evaluate('e=>e.config.menu.buttons[0].colors={center:"#112233",inner_border:"#123456",outer_border:"#abcdef"}')
        self.open_details()
        self.assertEqual(self.fills(1),{'hex-fill':'rgb(17, 34, 51)','hex-inner':'rgb(18, 52, 86)','hex-outer':'rgb(171, 205, 239)'})
        self.assertEqual(self.fills(2),{'hex-fill':GRAY,'hex-inner':INNER,'hex-outer':OUTER})
        self.assertEqual(self.model(0)['colors']['inner'],'#43c95b');self.assert_no_commands();self.capture('beta5-functional-center-and-explicit-action')
    def test_external_button_card_keeps_neutral_submenu_background(self):
        if self.baseline:return
        self.hub({'logo':False,'items':[{'type':'generic','name':'Root','menu':{'buttons':[
            {'slot':1,'slot_mode':'hard','name':'Read only','custom_fields':{'value':'Synthetic'},'tap_action':{'action':'none'}},
            {'slot':2,'slot_mode':'hard','name':'Explicit','custom_fields':{'value':'Synthetic'},'styles':{'card':[{'background':'#112233'}]},'tap_action':{'action':'none'}}]}}]})
        self.hold_input(self.cell(0).locator('.interaction-surface'));self.settle()
        card=self.cell(1).locator('button-card ha-card');card.wait_for()
        self.assertEqual(card.evaluate('e=>getComputedStyle(e).backgroundColor'),'rgba(0, 0, 0, 0)')
        self.assertEqual(self.fills(1)['hex-fill'],GRAY,'Transparent content preserves the shared gray cube')
        self.assertEqual(self.cell(2).locator('button-card ha-card').evaluate('e=>getComputedStyle(e).backgroundColor'),'rgb(17, 34, 51)')
        self.assert_no_commands()
    def test_protected_light_sonos_and_hub_pixels_equal_published_beta4(self):
        if self.baseline:return
        # Render both immutable baseline and candidate with identical synthetic
        # data. Compare actual pixels, not minified-source/model equality.
        saved=self.page
        for module,entity in [('light','light.zone_a'),('sonos','media_player.player_a'),('generic','sensor.value_a')]:
            images=[]
            for url in [self.before_url,self.url]:
                page=self.browser.new_page(viewport=self.viewport,has_touch=self.viewport['width']<500);page.set_default_timeout(7000)
                try:
                    self.page=page;page.goto(url);page.wait_for_function('window.ready');page.evaluate('window.ng=window.honeycombNG')
                    print('reference',module,'before' if url==self.before_url else 'after','root',flush=True)
                    self.hub({'logo':'auto','items':[{'type':module,'entity':entity,'slot':1,'name':'Module A'}]});self.settle()
                    root=page.locator('honeycomb-menu-ng').screenshot(animations='disabled')
                    if module!='generic':
                        print('reference',module,'open',flush=True)
                        self.hold_input(self.cell(1).locator('.interaction-surface'));print('reference',module,'settle',flush=True);self.settle()
                        print('reference',module,'capture',flush=True)
                        scene=page.locator('honeycomb-menu-ng').screenshot(animations='disabled',mask=[self.cell(3)] if module=='light' else [])
                    else:scene=root
                    images.append((root,scene))
                    if self.evidence:page.screenshot(path=str(self.evidence/(f'{self.viewport["width"]}-protected-{module}-'+('before' if url==self.before_url else 'after')+'.png')))
                finally:page.close();self.page=saved
            from PIL import Image,ImageChops
            import io
            for surface,index in [('root',0),('main',1)]:
                a=Image.open(io.BytesIO(images[0][index])).convert('RGB');b=Image.open(io.BytesIO(images[1][index])).convert('RGB')
                self.assertEqual(a.size,b.size,module+' '+surface+' geometry')
                diff=ImageChops.difference(a,b)
                if self.evidence:diff.save(self.evidence/f'{self.viewport["width"]}-protected-{module}-{surface}-diff.png')
                self.assertIsNone(diff.getbbox(),module+' '+surface+' pixels must remain unchanged')

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--before-bundle',type=Path);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--baseline',action='store_true');p.add_argument('--test-filter');args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    before=args.before_bundle
    if before is None:
        import subprocess,hashlib
        before=args.evidence_dir/'published-beta4.js';data=subprocess.check_output(['git','show','v1.9.0-beta.4:honeycomb-menu-ng.js'])
        assert hashlib.sha256(data).hexdigest()=='3ac96d191f56c3d86a6dbf81e8189a875defd8be6d26b92654e28f7a1a82e84f';before.write_bytes(data)
    servers=[];success=True
    try:
        for bundle in [args.bundle,before]:
            server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();servers.append(server)
        with sync_playwright() as p:
            UI.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);UI.url=f'http://127.0.0.1:{servers[0].server_port}';UI.before_url=f'http://127.0.0.1:{servers[1].server_port}';UI.evidence=args.evidence_dir;UI.baseline=args.baseline
            for width,height in [(1100,900),(390,844)]:
                UI.viewport={'width':width,'height':height};names=[n for n in UI.__dict__ if n.startswith('test_') and (not args.test_filter or args.test_filter in n)]
                if args.baseline:names=[n for n in names if n.startswith('test_palette_indicator') or n.startswith('test_detail_gray')]
                r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(UI(n) for n in names));success=r.wasSuccessful() and success
            UI.browser.close()
    finally:
        for server in servers:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
