"""Issue119 resolved wave color in the real shared renderer.
Browser plugin not available; repository Playwright/Chromium synthetic HA shell.
"""
import argparse,threading,os,shutil,unittest,json,yaml
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,Cubes,CheckResult

WAVE={'active':True,'available':True,'fault':False,'power_w':7000,'speed_mode':'power','max_power_w':19400}
class WaveColor(Cubes):
 def cube(self):return self.page.locator('honeycomb-menu-ng .center-item')
 def stroke(self,cube=None):return (cube or self.cube()).locator('.energy-contour').evaluate('(el)=>getComputedStyle(el).stroke')
 def running(self):self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")?.hasAttribute("energy-wave-running")')
 def remember(self):
  self.running();self.page.evaluate('''()=>{const c=hub._hubMenu.shadowRoot.querySelector('.center-item');window.originalContour=c.shadowRoot.querySelector('.energy-contour');window.originalAnimation=originalContour.getAnimations()[0]}''')
 def continuity(self):
  self.assertTrue(self.cube().locator('.energy-contour').evaluate('(el)=>el===originalContour && el.getAnimations()[0]===originalAnimation'))
 def screenshot_wave(self,name):
  for cube in self.controls().all():
   cube.locator('.energy-contour').evaluate_all('(els)=>els.forEach(el=>{const a=el.getAnimations()[0];if(a){a.pause();a.currentTime=1200;}})')
  self.capture(name)
 def test_documented_green_inheritance_and_blue_override(self):
  self.hub(yaml.safe_load(Path('examples/energy-wave-color.yaml').read_text()));self.running();self.settle()
  cells={c.evaluate('(el)=>el.config.name'):c for c in self.controls().all()};self.assertEqual(len(cells),2)
  self.assertEqual(self.stroke(cells['Green']),'rgb(34, 204, 136)');self.assertEqual(self.stroke(cells['Blue']),'rgb(0, 191, 255)')
  self.assertEqual(cells['Green'].locator('.hex-inner').get_attribute('fill'),'#22cc88')
  self.assertEqual(cells['Green'].locator('.hex-fill').get_attribute('fill'),'#116644')
  for c in cells.values():
   p=c.locator('.energy-contour');self.assertEqual(len(p.get_attribute('points').split()),6);self.assertEqual(p.get_attribute('fill'),'none');self.assertEqual(p.get_attribute('stroke-width'),'6')
   k=p.evaluate('(el)=>el.getAnimations()[0].effect.getKeyframes()');self.assertEqual(k[0]['transform'],'scale(0.12)');self.assertEqual(k[-1]['transform'],'scale(1.4)');self.assertEqual(k[1]['opacity'],'0.32')
   self.assertEqual(c.evaluate('(el)=>parseFloat(getComputedStyle(el).width)'),82)
  self.assertEqual(self.page.evaluate('calls.length'),0);self.screenshot_wave('issue119-inherited-green-explicit-blue')
 def test_light_auto_color_and_template_border_update_without_animation_restart(self):
  self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','colors':{'inner_border':'auto'},'energy_wave':WAVE}]});self.remember()
  self.assertEqual(self.cube().evaluate('(el)=>el._model.energyWaveColor'),self.cube().locator('.hex-inner').get_attribute('fill'))
  before=self.stroke();self.page.evaluate("pushState('light.zone_a','on',{brightness:180,rgb_color:[22,204,88],supported_color_modes:['hs']})");self.settle()
  self.assertNotEqual(self.stroke(),before);self.assertEqual(self.stroke(),'rgb(22, 204, 88)');self.continuity()
  fill=self.cube().evaluate('(el)=>el._model.fill');self.assertEqual(fill,{'type':'radial','center':'rgb(22, 204, 88)','edge':'rgb(13, 122, 53)'})
  self.page.evaluate("hub.setConfig({logo:false,items:[{type:'light',entity:'light.zone_a',colors:{inner_border:'HCJS: return entity.attributes.accent;'},energy_wave:hub.config.items[0].energy_wave}]});pushState('light.zone_a','on',{brightness:180,rgb_color:[255,128,0],supported_color_modes:['hs'],accent:'#00bfff'})")
  self.settle();self.assertEqual(self.stroke(),'rgb(0, 191, 255)');self.assertEqual(self.cube().locator('.hex-inner').get_attribute('fill'),'#00bfff');self.continuity();self.screenshot_wave('issue119-light-resolved-user-border')
 def test_sonos_station_accent_updates_resolved_wave(self):
  self.station_hub({'energy_wave':WAVE});self.remember();first=self.stroke()
  self.assertEqual(self.cube().evaluate('(el)=>el._model.energyWaveColor'),self.cube().locator('.hex-inner').get_attribute('fill'))
  self.page.evaluate("stationUpdate('playing',{media_content_id:'favorite_c'})");self.page.wait_for_function('hub._hubMenu.shadowRoot.querySelector(".center-item")._model.artwork?.url==="/station-c.svg"');self.settle()
  self.assertNotEqual(self.stroke(),first);self.assertEqual(self.cube().evaluate('(el)=>el._model.energyWaveColor'),self.cube().locator('.hex-inner').get_attribute('fill'));self.continuity();self.screenshot_wave('issue119-sonos-station-accent')
 def test_dynamic_override_alpha_and_invalid_results_fail_static_then_recover(self):
  self.page.evaluate("pushState('sensor.accent_a','#00bfff')")
  wave={**WAVE,'color':'HCJS: return states["sensor.accent_a"].state;'}
  self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','energy_wave':wave}]});self.remember()
  self.assertEqual(self.stroke(),'rgb(0, 191, 255)')
  self.page.evaluate("pushState('light.zone_a','on',{brightness:200,rgb_color:[22,204,88],supported_color_modes:['hs']})");self.settle();self.continuity();self.assertEqual(self.stroke(),'rgb(0, 191, 255)')
  inner=self.cube().locator('.hex-inner').get_attribute('fill')
  self.page.evaluate("pushState('sensor.accent_a','rgba(255, 0, 0, 0.5)')");self.settle();self.assertEqual(self.stroke(),'rgba(255, 0, 0, 0.5)');self.continuity();self.assertEqual(self.cube().locator('.hex-inner').get_attribute('fill'),inner)
  for color in ['not-a-color','url(https://example.org/paint.svg)','#fff;opacity:1','var(--x, url(#paint))','',None,False,42,{}]:
   self.page.evaluate('(color)=>{hass.states["sensor.accent_a"]={state:color,attributes:{}};pushState("sensor.unrelated",String(Math.random()))}',color);self.settle()
   self.assertEqual(self.cube().locator('.energy-contour').count(),0);self.assertFalse(self.cube().evaluate('(el)=>el.hasAttribute("energy-wave-running")'));self.assertEqual(self.cube().locator('.hex-inner').get_attribute('fill'),inner)
  self.page.evaluate("pushState('sensor.accent_a','#22cc88')");self.running();self.assertEqual(self.stroke(),'rgb(34, 204, 136)')
  self.page.evaluate("delete hass.states['sensor.accent_a'];pushState('sensor.unrelated','missing')");self.settle();self.assertEqual(self.cube().locator('.energy-contour').count(),0)
  self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('issue119-invalid-template-static')
 def test_control_named_css_variable_and_no_paint_url_requests(self):
  requests=[];self.page.on('request',lambda request:requests.append(request.url))
  self.page.evaluate("document.body.style.setProperty('--wave-accent','#00bfff')")
  for color,expected in [('blue','rgb(0, 0, 255)'),('var(--wave-accent, #22cc88)','rgb(0, 191, 255)'),('#00bfff80','rgba(0, 191, 255, 0.5)')]:
   self.page.evaluate('config=>makeControl(config)',{'module':'generic','name':'Synthetic wave','colors':{'inner_border':'#22cc88'},'energy_wave':{**WAVE,'color':color},'tap_action':{'action':'none'}})
   c=self.page.locator('body > honeycomb-persistent-control');self.page.wait_for_function('control.hasAttribute("energy-wave-running")');self.assertEqual(self.stroke(c),expected);self.page.evaluate('control.remove()')
  # A CSS custom property cannot turn the color property into SVG paint.
  self.page.evaluate("document.body.style.setProperty('--wave-accent','url(https://example.org/paint.svg)')")
  self.page.evaluate('config=>makeControl(config)',{'module':'generic','energy_wave':{**WAVE,'color':'var(--wave-accent, #22cc88)'}});self.page.wait_for_timeout(50)
  c=self.page.locator('body > honeycomb-persistent-control');self.assertNotIn('url(',self.stroke(c));self.assertFalse(any('paint.svg' in url for url in requests));self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_invalid_literal_configuration_rejected_without_style_injection(self):
  for color in ['not-a-color','rgb(999, x, 2)','url(#paint)','#fff;opacity:1',None,True,{},'inherit']:
   result=self.page.evaluate('config=>{const el=document.createElement("honeycomb-persistent-control");try{el.setConfig(config);return "accepted"}catch(e){return e.message}}',{'module':'generic','energy_wave':{**WAVE,'color':color}})
   self.assertIn('energy_wave.color',result)

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);args=p.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   WaveColor.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);WaveColor.url=f'http://127.0.0.1:{server.server_port}';WaveColor.evidence=args.evidence_dir
   names=[n for n in WaveColor.__dict__ if n.startswith('test_')]
   for w,h in [(1100,900),(390,844)]:
    WaveColor.viewport={'width':w,'height':h};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(WaveColor(n) for n in names));success=r.wasSuccessful() and success
   WaveColor.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
