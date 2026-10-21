"""Shared fill presentation regressions; real Chromium in synthetic HA shell."""
import argparse,threading,os,shutil,unittest,json
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,Cubes,CheckResult
class Presentation(Cubes):
 def cube(self):return self.page.locator('honeycomb-menu-ng .center-item')
 def fill(self):return self.cube().evaluate('(el)=>el._model.fill')
 def test_gradient_state_and_border_isolation(self):
  self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
  cube=self.cube();self.assertEqual(self.fill()['type'],'radial');self.assertEqual(self.fill()['center'],cube.locator('.hex-inner').get_attribute('fill'))
  self.assertEqual(cube.locator('radialGradient stop').first.get_attribute('stop-color'),self.fill()['center'])
  self.assertIn('url(',cube.locator('.hex-fill').evaluate('(el)=>getComputedStyle(el).fill'))
  outer=cube.locator('.hex-outer').get_attribute('fill');self.capture('presentation-rgb-active')
  self.page.evaluate("pushState('light.zone_a','on',{brightness:200,color_temp_kelvin:3200,supported_color_modes:['color_temp']})")
  self.assertEqual(self.fill()['center'],cube.locator('.hex-inner').get_attribute('fill'));self.assertEqual(cube.locator('.hex-outer').get_attribute('fill'),outer)
  self.capture('presentation-kelvin-active')
  self.page.evaluate("pushState('light.zone_a','off',{supported_color_modes:['color_temp']})")
  self.assertEqual(self.fill()['type'],'solid');self.assertEqual(cube.locator('radialGradient').count(),0);self.capture('presentation-light-off')
  self.page.evaluate("pushState('light.zone_a','unavailable')");self.assertEqual(self.fill()['type'],'solid')
 def test_sonos_playing_paused_artwork_volume_and_main_center(self):
  self.station_hub();cube=self.cube();self.assertEqual(self.fill()['type'],'radial');self.assertEqual(self.fill()['center'],cube.locator('.hex-inner').get_attribute('fill'))
  self.capture('presentation-sonos-playing');self.hold_input(cube.locator('.interaction-surface'));self.settle()
  self.assertEqual(self.fill()['type'],'radial');self.assertTrue(self.cube().locator('.station-artwork').is_visible());self.capture('presentation-sonos-promoted')
  self.page.evaluate("pushState('media_player.player_a','paused',{media_content_id:'favorite_a',volume_level:.42,group_members:['media_player.player_a']})")
  self.assertEqual(self.fill()['type'],'solid');self.assertEqual(self.fill()['center'],'#202224');self.capture('presentation-sonos-paused')
 def test_explicit_legacy_and_new_fill_choices(self):
  for options,kind in [({'center':'#102030'},'solid'),({'fill_gradient':False},'solid'),({'fill_gradient':{'type':'solid'}},'solid'),({'fill_gradient':{'type':'radial','edge':'#102030'}},'radial')]:
   self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','colors':options}]});self.assertEqual(self.fill()['type'],kind)
   if kind=='radial':self.assertEqual(self.fill()['edge'],'#102030')
   self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
 def test_named_and_css_variable_status_colors(self):
  self.page.evaluate("document.body.style.setProperty('--synthetic-accent','#22aa66')")
  for color in ['lime','var(--synthetic-accent)']:
   self.hub({'logo':False,'items':[{'type':'light','entity':'light.zone_a','colors':{'inner_border':color}}]})
   self.assertEqual(self.fill()['type'],'radial');self.assertEqual(self.fill()['center'],color)
   stop=self.cube().locator('radialGradient stop').last
   self.assertNotIn('color-mix',stop.evaluate('(el)=>getComputedStyle(el).stopColor'))
   self.assertEqual(stop.evaluate('(el)=>el.namespaceURI'),'http://www.w3.org/2000/svg')
   self.page.evaluate('ng.disposeContext(hub._menuContext);hub.remove()')
 def test_large_hub_no_unrelated_render_work(self):
  self.page.evaluate("window.entries=Array.from({length:91},(_,i)=>['light.item_'+i,'on',{brightness:128,rgb_color:[255,128,0],supported_color_modes:['hs']}]);pushStates(entries)")
  self.hub({'logo':False,'items':[{'type':'light','entity':f'light.item_{i}'} for i in range(91)]});self.settle()
  result=self.page.evaluate('''async()=>{
   const cells=[...hub._hubMenu.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control')];
   const proto=Object.getPrototypeOf(customElements.get('honeycomb-menu-ng-item').prototype),render=proto.render;let renders=0;proto.render=function(){renders++;return render.call(this)};
   try{const start=performance.now();for(let i=0;i<1000;i++)pushState('sensor.unrelated',String(i));await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const unrelated=renders;pushState('light.item_0','off',{supported_color_modes:['hs']});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    return {count:cells.length,unrelated,related:renders-unrelated,elapsedMs:performance.now()-start,gradients:cells.filter(c=>c._model.fill.type==='radial').length};
   }finally{proto.render=render;}
  }''')
  self.assertEqual(result['count'],91);self.assertEqual(result['unrelated'],0);self.assertEqual(result['related'],1);self.assertEqual(result['gradients'],90)
  if self.evidence:(self.evidence/f'{self.viewport["width"]}-presentation-performance.json').write_text(json.dumps(result,indent=2))
def main():
 a=argparse.ArgumentParser();a.add_argument('--bundle',type=Path,required=True);a.add_argument('--button-card',type=Path,required=True);a.add_argument('--evidence-dir',type=Path,required=True);args=a.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   Presentation.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Presentation.url=f'http://127.0.0.1:{server.server_port}';Presentation.evidence=args.evidence_dir
   names=[n for n in Presentation.__dict__ if n.startswith('test_')]
   for w,h in [(1100,900),(390,844)]:
    Presentation.viewport={'width':w,'height':h};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Presentation(n) for n in names));success=r.wasSuccessful() and success
   Presentation.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
