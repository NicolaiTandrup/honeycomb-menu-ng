"""Beta.6 measured hardening; synthetic Chromium, no live HA.
4x CPU throttling is a lab proxy, not a Raspberry Pi benchmark.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,CheckResult
from beta4_navigation import Navigation

class Hardening(Navigation):
    def test_throttled_updates_remain_dependency_scoped_and_dispose(self):
        session=self.page.context.new_cdp_session(self.page);session.send('Emulation.setCPUThrottlingRate',{'rate':4})
        try:
            self.page.evaluate('pushStates(Array.from({length:50},(_,i)=>["light.load_"+i,"on",{brightness:128,supported_color_modes:["brightness"]}]))')
            self.hub({'logo':False,'items':[{'type':'light','entity':f'light.load_{i}'} for i in range(50)]});self.settle()
            self.assertEqual(self.controls().count(),50)
            self.controls().evaluate_all('els=>{window.loadRenders=0;for(const e of els){const render=e.render;e.render=function(){loadRenders++;return render.call(this)}}}')
            stats=self.page.evaluate('''()=>{const samples=[];for(let i=0;i<1000;i++){
                const start=performance.now();pushState('sensor.unrelated',String(i));samples.push(performance.now()-start);
            }samples.sort((a,b)=>a-b);return {p50Ms:samples[500],p95Ms:samples[950],updates:1000,items:50,cpuThrottle:4}}''')
            self.settle();self.assertEqual(self.page.evaluate('loadRenders'),0)
            self.page.evaluate('pushState("light.load_0","off",{brightness:0,supported_color_modes:["brightness"]})');self.settle();self.assertEqual(self.page.evaluate('loadRenders'),1)
            self.assertEqual(self.model(0)['secondary'],'OFF');self.assert_no_commands()
            self.page.evaluate('window.disposedLoadMenu=hub._hubMenu;hub.remove()')
            self.assertTrue(self.page.evaluate('disposedLoadMenu._disposed && !disposedLoadMenu.parentNode'))
            self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
            if self.evidence:(self.evidence/f'{self.viewport["width"]}-throttled-performance.json').write_text(json.dumps({**stats,'unrelatedRenders':0,'relevantRenders':1},indent=2))
        finally:session.send('Emulation.setCPUThrottlingRate',{'rate':1});session.detach()
    def test_palette_anchor_and_back_record_existing_viewport_capacity(self):
        self.light_main();before=self.center(0)
        self.activate(self.cell(3).locator('.interaction-surface'));self.settle()
        self.assertEqual(self.center(0),before);self.assertAlmostEqual(self.cell(0).bounding_box()['width'],82,delta=.1)
        bounds=self.controls().evaluate_all('els=>{const boxes=els.map(e=>e.getBoundingClientRect());return {viewport:innerWidth,minX:Math.min(...boxes.map(r=>r.left)),maxX:Math.max(...boxes.map(r=>r.right)),cubeWidth:boxes[0].width}}')
        self.capture('beta6-anchored-palette-capacity')
        if self.evidence:(self.evidence/f'{self.viewport["width"]}-palette-capacity.json').write_text(json.dumps(bounds,indent=2))
        # Capacity is reported, never disguised as a clipping fix or addressed
        # by moving the selected cube/changing approved fixed geometry.
        self.back();self.settle();self.assertEqual(self.center(0),before);self.assert_no_commands()

def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=a.bundle.resolve();server.button=a.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Hardening.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Hardening.url=f'http://127.0.0.1:{server.server_port}';Hardening.evidence=a.evidence_dir
            for width,height in [(1100,900),(390,844)]:
                Hardening.viewport={'width':width,'height':height};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Hardening(n) for n in Hardening.__dict__ if n.startswith('test_')));success=r.wasSuccessful() and success
            Hardening.browser.close()
    finally:server.shutdown();server.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
