"""Reference display sizing and phase-preserving power speed, real Chromium.
Browser plugin not available; reuses the synthetic HA fixture and real engine.
"""
import argparse,threading,os,shutil,unittest,json,re,yaml,io
from functools import lru_cache
from PIL import Image,ImageDraw
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,Cubes,CheckResult
from beta5 import FLOORPLAN

@lru_cache(maxsize=3)
def raster(width):
 image=Image.new('RGB',(width,width*2//3),'#30343a');draw=ImageDraw.Draw(image);draw.line((0,width//3,width,width//3),fill='#aaa',width=max(1,width//300));draw.line((width//2,0,width//2,width*2//3),fill='#aaa',width=max(1,width//300));output=io.BytesIO();image.save(output,format='PNG');return output.getvalue()
class Beta6Handler(Handler):
 def do_GET(self):
  match=re.fullmatch(r'/floorplan-(1500|3000|6000)\.png',self.path)
  if not match:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type','image/png');self.end_headers();self.wfile.write(raster(int(match.group(1))))

class Beta6(Cubes):
 def floor(self,reference=1500,display=1500,natural=6000):
  config={'size':'auto','logo':False,'items':[{'type':'light','entity':'light.zone_a'}]}
  if reference is not None:config['auto_reference_width']=reference
  self.page.evaluate(FLOORPLAN,config)
  self.page.evaluate('''async([width,natural])=>{
   floor.style.width=width+'px';imageHost.style.height=width*2/3+'px';
   floorImage.src=`/floorplan-${natural}.png`;
   await floorImage.decode();
  }''',[display,natural]);self.page.wait_for_timeout(70)
  self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")');self.settle()
 def test_reference_1500_and_high_resolution_replacements(self):
  self.floor()
  for natural in [1500,3000,6000]:
   self.page.evaluate('async n=>{floorImage.src=`/floorplan-${n}.png`;await floorImage.decode()}',natural)
   self.assertEqual(self.page.evaluate('floorImage.naturalWidth'),natural)
   for width in [1500,1125,750,2250]:
    self.page.evaluate('w=>{floor.style.width=w+"px";imageHost.style.height=w*2/3+"px"}',width);self.page.wait_for_timeout(70)
    self.assertAlmostEqual(self.page.evaluate('hub.size'),min(82,82*width/1500),delta=.002)
    self.assertAlmostEqual(self.page.evaluate('hub._hubMenu.sizes.item'),min(82,82*width/1500),delta=.002)
   self.page.evaluate("floor.style.width='1500px';imageHost.style.height='1000px'");self.page.wait_for_timeout(70);self.capture(f'beta6-resolution-{natural}-baseline-82')
  self.page.evaluate("floor.style.width='750px';imageHost.style.height='500px'");self.page.wait_for_timeout(70);self.capture('beta6-display-750-cube-41')
 def test_first_mobile_reload_default_and_independent_references(self):
  self.floor(reference=None,display=768);self.assertAlmostEqual(self.page.evaluate('hub.size'),41)
  self.page.reload();self.page.wait_for_function('window.ready');self.page.evaluate('window.ng=window.honeycombNG')
  self.floor(reference=None,display=768);self.assertAlmostEqual(self.page.evaluate('hub.size'),41)
  self.page.evaluate("window.second=addOverlay({size:'auto',auto_reference_width:768,logo:false,items:[{type:'light',entity:'light.zone_a'}]},'65%','50%')")
  self.page.wait_for_timeout(70);self.assertEqual(self.page.evaluate('second.size'),82);self.assertEqual(self.page.evaluate('hub.size'),41)
  self.page.evaluate('second.remove()');self.capture('beta6-mobile-first-default-reference')
 def pulse(self,fixed=False):
  self.page.evaluate("pushState('sensor.power_a','1000',{active:true,available:true,fault:false,peak:19400,cycle:1400})")
  wave={'active':'HCJS: return entity.attributes.active === true;','available':'HCJS: return entity.attributes.available === true;','fault':'HCJS: return entity.attributes.fault === true;','power_w':'HCJS: return Number(entity.state);','speed_mode':'fixed' if fixed else 'power'}
  if fixed:wave['cycle_ms']='HCJS: return entity.attributes.cycle;'
  else:wave['max_power_w']='HCJS: return entity.attributes.peak;'
  self.hub({'logo':False,'items':[{'type':'generic','entity':'sensor.power_a','name':'Energy demo','energy_wave':wave,'tap_action':{'action':'none'}}]})
  self.cube=self.page.locator('honeycomb-menu-ng .center-item');self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item").hasAttribute("energy-wave-running")')
  self.page.evaluate('window.originalContour=hub._hubMenu.shadowRoot.querySelector(".center-item").shadowRoot.querySelector(".energy-contour");window.originalAnimation=originalContour.getAnimations()[0]')
  self.page.wait_for_function('originalAnimation.playbackRate>1')
 def state(self,power,attrs=None):
  self.page.evaluate('([state,attrs])=>pushState("sensor.power_a",String(state),{active:true,available:true,fault:false,peak:19400,cycle:1400,...attrs})',[power,attrs or {}])
 def metrics(self):return self.page.evaluate('''()=>{const c=hub._hubMenu.shadowRoot.querySelector('.center-item'),p=c.shadowRoot.querySelector('.energy-contour'),a=p?.getAnimations()[0];return {running:c.hasAttribute('energy-wave-running'),rate:a?.playbackRate,time:a?.currentTime,same:a===originalAnimation,node:p===originalContour}}''')
 def test_power_speed_phase_and_no_power_render_churn(self):
  self.pulse();self.page.wait_for_timeout(50);previous=0
  for power in [1000,7000,11000,19400,25000,1]:
   before=self.metrics();self.state(power);self.page.wait_for_timeout(450);m=self.metrics()
   expected=3000/(2200-1300*min(1,power/19400))
   self.assertAlmostEqual(m['rate'],expected,places=6);self.assertTrue(m['same'] and m['node']);self.assertGreater(m['time'],before['time'])
   if power!=1:self.assertGreaterEqual(m['rate'],previous);previous=m['rate']
   self.capture(f'beta6-wave-power-{power}')
  self.page.evaluate('''()=>{window.renders=0;window.originalRender=hub._hubMenu.shadowRoot.querySelector('.center-item').render;hub._hubMenu.shadowRoot.querySelector('.center-item').render=function(){renders++;return originalRender.call(this)}}''')
  self.state(7000);self.page.wait_for_timeout(100);mid=self.metrics();self.assertGreater(mid['rate'],3000/2200);self.assertLess(mid['rate'],3000/(2200-1300*7000/19400))
  self.page.wait_for_timeout(400);self.assertEqual(self.page.evaluate('renders'),0)
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_fixed_speed_runtime_invalid_settings_and_health_fail_closed(self):
  self.pulse(fixed=True);self.assertAlmostEqual(self.metrics()['rate'],3000/1400)
  self.state(11000);self.page.wait_for_timeout(420);self.assertAlmostEqual(self.metrics()['rate'],3000/1400)
  for value in [0,-1,'1400;animation:injected',None,20000]:
   self.state(1000,{'cycle':value});self.settle();self.assertEqual(self.cube.locator('.energy-contour').count(),0)
  self.state(1000);self.page.wait_for_timeout(60);self.assertTrue(self.metrics()['running'])
  for power,attrs in [(0,{}),('unavailable',{}),(1200,{'active':False}),(1200,{'fault':True}),(1200,{'available':False})]:
   self.state(power,attrs);self.settle();self.assertEqual(self.cube.locator('.energy-contour').count(),0)
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_dynamic_power_limit_and_suppression_cancel_rate_work(self):
  self.pulse();self.state(11000,{'peak':11000});self.page.wait_for_timeout(450);self.assertAlmostEqual(self.metrics()['rate'],3000/900)
  for value in [0,-1,None,'19400','Infinity']:
   self.state(1000,{'peak':value});self.settle();self.assertEqual(self.cube.locator('.energy-contour').count(),0)
  self.state(1000);self.page.wait_for_timeout(50);self.state(19400)
  self.page.emulate_media(reduced_motion='reduce');self.page.wait_for_timeout(80);self.assertFalse(self.metrics()['running'])
  self.assertEqual(self.cube.locator('.energy-contour').evaluate('(el)=>el.getAnimations().length'),0)
  self.page.emulate_media(reduced_motion='no-preference');self.page.wait_for_timeout(80);self.assertTrue(self.metrics()['running'])
  self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");self.assertFalse(self.metrics()['running'])
  self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
  self.state(7000);self.page.evaluate('hub.remove()');self.page.wait_for_timeout(450);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0);self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_burst_rate_updates_keep_one_animation_and_quiet_scheduler(self):
  self.pulse();self.page.evaluate('''()=>{window.rafCalls=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=cb=>{rafCalls++;return raf(cb)};window.renders=0;const c=hub._hubMenu.shadowRoot.querySelector('.center-item'),render=c.render;c.render=function(){renders++;return render.call(this)};for(let i=0;i<200;i++)pushState('sensor.power_a',String(1000+i*70),{active:true,available:true,fault:false,peak:19400});}''')
  self.page.wait_for_timeout(500);m=self.metrics();self.assertTrue(m['same'] and m['node']);self.assertEqual(self.page.evaluate('renders'),0)
  frames=self.page.evaluate('rafCalls');self.assertGreater(frames,0);self.assertLess(frames,45)
  self.page.wait_for_timeout(120);self.assertEqual(self.page.evaluate('rafCalls'),frames)
  metrics={'updates':200,'cubeRenders':0,'scheduledFrames':frames,'quietFrames':0,'sameAnimation':m['same'],'serviceCalls':self.page.evaluate('calls.length')}
  if self.evidence:(self.evidence/f'{self.viewport["width"]}-beta6-rate-performance.json').write_text(json.dumps(metrics,indent=2))
 def test_documented_power_demo_independent_peaks_and_budget(self):
  config=yaml.safe_load(Path('examples/energy-wave-power.yaml').read_text());self.hub(config);self.page.wait_for_timeout(80)
  cells=self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item, honeycomb-menu-ng .center-item');rates=[]
  for cube in cells.all():
   value=cube.evaluate('(el)=>{const a=el.shadowRoot.querySelector(".energy-contour")?.getAnimations()[0];return {config:el.config.energy_wave,rate:a?.playbackRate}}')
   if value['config']:
    cfg=value['config'];ms=cfg.get('cycle_ms',2200-1300*min(1,cfg['power_w']/cfg.get('max_power_w',1)))
    self.assertAlmostEqual(value['rate'],3000/ms);rates.append(value['rate'])
  self.assertEqual(len(rates),4);self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('beta6-documented-independent-power')

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Beta6Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   Beta6.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Beta6.url=f'http://127.0.0.1:{server.server_port}';Beta6.evidence=args.evidence_dir
   names=[n for n in Beta6.__dict__ if n.startswith('test_')]
   for w,h in [(1800,1100),(900,1000),(390,844)]:
    Beta6.viewport={'width':w,'height':h};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Beta6(n) for n in names));success=r.wasSuccessful() and success
   Beta6.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
