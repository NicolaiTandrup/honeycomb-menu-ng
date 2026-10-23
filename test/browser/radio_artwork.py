"""Issue125 beta.3: source pixels must fit within the sloping inner hex.
Browser plugin not available; real Chromium, synthetic HA, no live services.
Flow: Sonos launcher -> promoted center -> Radio -> same favorite playback/Back.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Cubes,Handler,CheckResult

GEOMETRY='''e=>{
 const r=e.getBoundingClientRect(),s=Math.min(r.width/e.naturalWidth,r.height/e.naturalHeight),w=e.naturalWidth*s,h=e.naturalHeight*s,x=r.x+(r.width-w)/2,y=r.y+(r.height-h)/2;
 const poly=e.getRootNode().querySelector('.hex-fill'),m=poly.getScreenCTM(),pts=[...poly.points].map(p=>new DOMPoint(p.x,p.y).matrixTransform(m));
 const corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 const distances=corners.flatMap(([x,y])=>pts.map((a,i)=>{const b=pts[(i+1)%pts.length];return ((b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x))/Math.hypot(b.x-a.x,b.y-a.y)}));
 return {minClearance:Math.min(...distances),fillWidth:Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),paint:{x,y,w,h},natural:[e.naturalWidth,e.naturalHeight],fit:getComputedStyle(e).objectFit,position:getComputedStyle(e).objectPosition,cell:e.getRootNode().host.getBoundingClientRect().width};
}'''

class RadioArtwork(Cubes):
 def meta(self,shape):
  self.page.evaluate("url=>pushState('sensor.favorites_cache','2',{items:[{media_content_id:'favorite_a',thumbnail:url},{media_content_id:'favorite_c',thumbnail:'/station-tall.svg'}]})",f'/station-{shape}.svg')
 def check_art(self,cube,label):
  image=cube.locator('.station-artwork');image.wait_for(state='visible');image.evaluate('e=>e.decode()');g=image.evaluate(GEOMETRY)
  self.assertEqual(g['fit'],'contain');self.assertEqual(g['position'],'50% 50%')
  self.assertAlmostEqual(g['paint']['w']/g['paint']['h'],g['natural'][0]/g['natural'][1],places=6)
  self.assertGreaterEqual(g['minClearance'],g['fillWidth']*.1,msg=json.dumps(g))
  self.assertEqual(image.evaluate('e=>e.style.width'),'48%')
  for selector in ['.primary','.secondary']:
   text=cube.locator(selector)
   if text.count():self.assertLess(g['paint']['y']+g['paint']['h'],text.bounding_box()['y']+.5)
  if self.evidence:self.evidence.joinpath('measurements.jsonl').open('a').write(json.dumps({'viewport':self.viewport['width'],'surface':label,**g})+'\n')
 def test_native_launcher_promoted_and_radio_all_ratios_and_states(self):
  self.station_hub();launcher=self.page.locator('honeycomb-menu-ng .center-item')
  for shape in ['square','wide','tall']:
   self.meta(shape)
   for state in ['playing','paused','idle']:
    self.page.evaluate('s=>stationUpdate(s)',state);self.settle();self.check_art(launcher,'launcher-'+shape+'-'+state)
    if state!='playing':self.assertEqual(launcher.locator('.hex-fill').get_attribute('fill'),'#202224')
   self.page.evaluate("stationUpdate('playing')");self.hold_input(launcher.locator('.interaction-surface'));self.settle()
   self.check_art(self.page.locator('honeycomb-menu-ng .center-item'),'promoted-'+shape)
   self.activate(self.sonos_slot(1).locator('.interaction-surface'));self.settle();favorite=self.sonos_slot(7);self.check_art(favorite,'radio-'+shape)
   self.assertEqual(favorite.locator('.primary').count(),0);self.capture('radio-'+shape)
   self.activate(favorite.locator('.interaction-surface'));self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'),['media_player','play_media']);self.assertEqual(self.page.evaluate('calls.at(-1)[2].media_content_id'),'favorite_a')
   self.page.evaluate('ng.closeInContext(hub._menuContext)');self.page.wait_for_function('hub._menuContext.stack.length===0');self.settle();self.page.evaluate('calls.length=0')
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_responsive_numeric_small_and_large_borders(self):
  self.station_hub();item=self.page.evaluate('hub.config.items[0]')
  for size in [82,60,41]:
   self.page.evaluate('(x)=>hub.setConfig({logo:false,size:x.size,items:[{...x.item,border:{inner_width:5,outer_width:4}}]})',{'size':size,'item':item});self.settle()
   self.meta('square');self.check_art(self.page.locator('honeycomb-menu-ng .center-item'),'responsive-'+str(size))
   self.assertAlmostEqual(self.page.locator('honeycomb-menu-ng .center-item').bounding_box()['width'],size,delta=.05);self.capture('responsive-'+str(size))
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_unknown_missing_failure_and_live_recovery(self):
  self.station_hub();self.meta('square');cube=self.page.locator('honeycomb-menu-ng .center-item');self.check_art(cube,'known')
  self.page.evaluate("stationUpdate('playing',{media_content_id:'unconfigured',media_channel:'Unknown station',media_title:'Unknown station'})");self.settle();self.assertEqual(cube.locator('.station-artwork').count(),0);self.assertEqual(cube.locator('ha-icon').count(),1)
  self.page.evaluate("stationUpdate('playing',{media_content_id:'favorite_a'})");self.settle();self.check_art(cube,'recovered')
  cube.locator('.station-artwork').dispatch_event('error');self.settle();self.assertEqual(cube.locator('.station-artwork').count(),0)
  self.meta('wide');self.check_art(cube,'image-replaced');self.capture('fallback-recovery');self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_named_volume_center_and_configured_media_background(self):
  self.station_hub({'name':'Speaker A','show_name':True});self.meta('square');self.check_art(self.page.locator('honeycomb-menu-ng .center-item'),'named-volume');self.capture('named-volume')
  self.page.evaluate('hub.remove()')
  for mode in ['media','sonos']:
   self.page.evaluate("mode=>makeControl({module:mode,entity:'media_player.player_a',show_icon:false,styles:{card:[{'background-image':'url(/station-square.svg)'},{'background-size':'cover'}]}})",mode)
   cube=self.page.locator('body > honeycomb-persistent-control');box=cube.locator('.media-background-artwork');self.assertEqual(box.evaluate('e=>getComputedStyle(e).backgroundSize'),'contain');self.assertLess(box.bounding_box()['y']+box.bounding_box()['height'],cube.locator('.secondary').bounding_box()['y']);self.capture('custom-'+mode);self.page.evaluate('control.remove()')
  self.assertEqual(self.page.evaluate('calls.length'),0)

def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
 s=ThreadingHTTPServer(('127.0.0.1',0),Handler);s.bundle=a.bundle.resolve();s.button=a.button_card.resolve();threading.Thread(target=s.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   RadioArtwork.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);RadioArtwork.url=f'http://127.0.0.1:{s.server_port}';RadioArtwork.evidence=a.evidence_dir
   for width,height in [(1100,900),(390,844)]:
    RadioArtwork.viewport={'width':width,'height':height};names=[n for n in RadioArtwork.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(RadioArtwork(n) for n in names));success=r.wasSuccessful() and success
   RadioArtwork.browser.close()
 finally:s.shutdown();s.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
