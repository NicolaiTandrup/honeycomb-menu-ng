"""Issue #138: permanent dev resource, real HTTP caching and bee version.
Browser plugin not available; repository Playwright Chromium, synthetic HA only.
"""
import argparse, hashlib, json, os, shutil, threading, unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright
from run import Handler, CheckResult, ROOT
from beta4_navigation import Navigation

class DevHandler(Handler):
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/' and self.server.dev_mode:
            payload=(ROOT/'test/browser/fixture.html').read_bytes().replace(b'window.nativeFavoritesOnly=false;',b'window.nativeFavoritesOnly=true;').replace(b"await import('/bundle.js');",b"await import('/local/honeycomb-dev/honeycomb-menu-ng.js');")
            self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(payload);return
        if path.startswith('/local/honeycomb-dev/'):
            self.server.requests.append(self.path)
            name=path.rsplit('/',1)[1]
            if name=='manifest.json':
                self.server.manifest_queries.append(parse_qs(urlsplit(self.path).query))
                if self.server.bad_manifest:
                    payload=b'{"schema":1,"file":"https://example.org/not-local.js"}'
                else:payload=(self.server.active/'manifest.json').read_bytes()
            else:
                match=next((directory/name for directory in [self.server.active,*self.server.packages] if (directory/name).is_file()),None)
                if not match:self.send_error(404);return
                payload=match.read_bytes()
            self.send_response(200);self.send_header('Content-Type','application/json' if name=='manifest.json' else 'text/javascript')
            # Deliberately aggressive cache: loader can remain cached; each
            # manifest nonce must still retrieve the current active deployment.
            self.send_header('Cache-Control','public,max-age=31536000,immutable');self.end_headers();self.wfile.write(payload);return
        super().do_GET()

class DevBuild(Navigation):
    def test_actual_version_with_flight_and_keyboard_no_layout_shift(self):
        self.hub({'logo':True,'items':[{'type':'light','entity':'light.zone_a','slot':1,'name':'Light A'}]});self.settle()
        self.page.clock.install()
        expected='v'+self.page.evaluate('ng.version');self.assertIn('1.9.0-beta.6-dev+',expected)
        before=self.controls().evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
        bee=self.cell(0);target=bee.locator('.interaction-surface')
        box=target.bounding_box();self.page.clock.pause_at(self.page.evaluate('Date.now()')+30)
        point=(box['x']+box['width']/2,box['y']+box['height']/2)
        if self.viewport['width']<500:self.page.touchscreen.tap(*point)
        else:self.page.mouse.click(*point)
        self.page.clock.run_for(35)
        label=bee.locator('.bee-version');self.assertTrue(label.is_visible());self.assertEqual(label.text_content(),expected)
        self.assertEqual(label.get_attribute('role'),'status');self.assertEqual(label.get_attribute('aria-live'),'polite');self.assertEqual(label.evaluate('e=>getComputedStyle(e).position'),'absolute')
        self.assertTrue(bee.locator('.bee-icon').evaluate('e=>e.classList.contains("flap")'))
        self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-issue138-bee-version.png'))
        self.assertEqual(self.controls().evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})'),before)
        self.page.clock.run_for(500);self.assertEqual(label.count(),0);self.assertFalse(bee.locator('.bee-icon').evaluate('e=>e.classList.contains("flap")'))
        for key in ['Enter','Space']:
            target.press(key);self.page.clock.run_for(35);self.assertEqual(label.text_content(),expected)
            self.page.clock.run_for(500);self.assertEqual(label.count(),0)
        self.assert_no_commands()

class Loader(unittest.TestCase):
    def page(self):
        page=self.browser.new_page(viewport=self.viewport,has_touch=self.viewport['width']<500);page.set_default_timeout(7000)
        return page
    def test_two_successive_builds_same_url_reload_and_deduplication(self):
        self.server.active=self.packages[0];self.server.bad_manifest=False;self.server.manifest_queries=[];self.server.requests=[]
        page=self.page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            for i,directory in enumerate(self.packages):
                self.server.active=directory;manifest=json.loads((directory/'manifest.json').read_text())
                if i==0:page.goto(self.url)
                else:page.reload()
                page.wait_for_function('window.ready')
                self.assertEqual(page.title(),'Honeycomb shared cube test');self.assertTrue(page.locator('h1').is_visible())
                self.assertEqual(page.evaluate('window.honeycombNG.version'),manifest['version']);self.assertEqual(page.evaluate('window.honeycombNG.commit'),manifest['commit'])
                page.evaluate('''()=>{window.defineCalls=0;const define=customElements.define.bind(customElements);customElements.define=(...args)=>{defineCalls++;return define(...args)}}''')
                page.evaluate('''async()=>{await Promise.all([import('/local/honeycomb-dev/honeycomb-menu-ng.js?duplicate=1'),import('/local/honeycomb-dev/honeycomb-menu-ng.js?duplicate=2')])}''')
                self.assertEqual(page.evaluate('defineCalls'),0);self.assertEqual(len(self.server.manifest_queries),i+1)
                page.evaluate('''()=>{pushState('light.zone_a','off',{friendly_name:'Light A',supported_color_modes:['hs','color_temp']});makeHub({logo:'auto',items:[{type:'light',entity:'light.zone_a',name:'A',slot:1}]})}''')
                page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("[data-honeycomb-slot]")?._model.name==="A"')
                cube=page.locator('honeycomb-menu-ng [data-honeycomb-slot="0"]');self.assertEqual(cube.evaluate('e=>e._model.secondary'),'OFF')
                page.wait_for_timeout(150);self.assertEqual(len(self.server.manifest_queries),i+1,'No polling or per-cube request')
                page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-issue138-build-{i+1}.png'))
            self.assertNotEqual(json.loads((self.packages[0]/'manifest.json').read_text())['version'],json.loads((self.packages[1]/'manifest.json').read_text())['version'])
            nonces=[q['_ng_dev'][0] for q in self.server.manifest_queries];self.assertEqual(len(set(nonces)),2)
            imports=[urlsplit(url).path for url in self.server.requests if '/honeycomb-build-' in url]
            self.assertEqual(len(imports),2,'One distinct immutable runtime fetch per build')
            self.assertEqual(page.locator('hui-error-card').count(),0);self.assertEqual(page.evaluate('calls.length'),0);self.assertEqual(errors,[])
        finally:page.close()
    def test_invalid_manifest_fails_closed_without_importing_a_runtime(self):
        self.server.active=self.packages[1];self.server.bad_manifest=True;self.server.manifest_queries=[];self.server.requests=[]
        page=self.page()
        try:
            page.goto(self.url);page.wait_for_function('window[Symbol.for("honeycombNG.developmentLoader")] !== undefined')
            failure=page.evaluate('window[Symbol.for("honeycombNG.developmentLoader")].then(()=>null,e=>e.message)')
            self.assertIn('Invalid Honeycomb development manifest',failure)
            self.assertFalse(page.evaluate('!!window.honeycombNG'));self.assertEqual(len(self.server.manifest_queries),1)
            self.assertEqual([url for url in self.server.requests if '/honeycomb-build-' in url],[])
        finally:self.server.bad_manifest=False;page.close()

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--package-a',type=Path);p.add_argument('--package-b',type=Path);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
    packages=[args.package_a,args.package_b] if args.package_a and args.package_b else []
    for directory in packages:
        manifest=json.loads((directory/'manifest.json').read_text());data=(directory/manifest['file']).read_bytes()
        assert hashlib.sha256(data).hexdigest()==manifest['sha256'];assert len(data)==manifest['bytes']
    server=ThreadingHTTPServer(('127.0.0.1',0),DevHandler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();server.dev_mode=False;server.packages=packages;server.bad_manifest=False;threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
            for case in [DevBuild,Loader]:case.browser=browser;case.url=f'http://127.0.0.1:{server.server_port}';case.evidence=args.evidence_dir
            Loader.server=server;Loader.packages=packages
            for width,height in [(1100,900),(390,844)]:
                DevBuild.viewport=Loader.viewport={'width':width,'height':height};server.dev_mode=False
                r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite([DevBuild('test_actual_version_with_flight_and_keyboard_no_layout_shift')]));success=r.wasSuccessful() and success
                if packages:
                    server.dev_mode=True;r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.defaultTestLoader.loadTestsFromTestCase(Loader));success=r.wasSuccessful() and success
            browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
