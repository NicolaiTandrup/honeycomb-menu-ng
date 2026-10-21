"""Browser-only CSS primitive study; Browser plugin unavailable, no HA connection."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import argparse,functools,os,shutil,threading,json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--evidence-dir',type=Path,required=True);a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(Path(__file__).parent)));threading.Thread(target=server.serve_forever,daemon=True).start();rows=[]
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(1100,900),(390,844)]:
   page=b.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{server.server_port}/demo.html');assert page.title()=='Honeycomb NG charging wave study';assert page.locator('h1').is_visible();assert page.locator('.sample').count()==180
   page.wait_for_function('document.getAnimations().length>0');visible=page.locator('[data-visible="true"]').count();assert 0<visible<180
   row=page.evaluate('({...study,visible:document.querySelectorAll("[data-visible=true]").length,animations:document.getAnimations().length})');assert row['animations']==visible
   page.evaluate('for(const animation of document.getAnimations()){animation.pause();animation.currentTime=1500;}');page.screenshot(path=str(a.evidence_dir/f'{width}-active-wave.png'))
   page.emulate_media(reduced_motion='reduce');page.wait_for_function('document.getAnimations().length===0');page.screenshot(path=str(a.evidence_dir/f'{width}-reduced-motion-static.png'))
   page.emulate_media(reduced_motion='no-preference');page.wait_for_function('document.getAnimations().length>0')
   page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))");page.wait_for_function('document.getAnimations().length===0')
   page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");page.wait_for_function('document.getAnimations().length>0')
   page.evaluate('scrollTo(0,document.body.scrollHeight)');page.wait_for_function("document.querySelector('.sample').dataset.visible==='false'");assert page.locator('[data-visible="true"]').count()<180
   page.evaluate('for(const c of controllers)c.update({active:true,available:true,powerW:0})');page.wait_for_function('document.getAnimations().length===0')
   page.evaluate('for(const c of controllers)c.dispose()');assert errors==[],errors;rows.append({'viewport':width,**row});page.close()
  b.close()
finally:server.shutdown();server.server_close()
(a.evidence_dir/'performance.json').write_text(json.dumps(rows,indent=2));print('PASS: 2 viewports × active/reduced-motion/offscreen/page-hidden/zero-power/disposal; no HA actions')
