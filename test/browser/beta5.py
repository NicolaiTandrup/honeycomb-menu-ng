"""Cumulative beta.5 real Chromium QA; Browser plugin not available.
Flow: picture-elements image resize -> existing numeric cubes/menus/hit targets;
normalized energy state -> shared six-sided contour -> motion/lifecycle gates.
"""
import argparse,threading,os,shutil,unittest,json,re,yaml
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,Cubes,CheckResult

FLOORPLAN='''async(config)=>{
 window.obs=[];
 for(const key of ['ResizeObserver','IntersectionObserver']){const Native=window[key];window[key]=class extends Native{
  constructor(callback){super(callback);this.nodes=new Set();obs.push({key,instance:this});}
  observe(node,options){this.nodes.add(node);return super.observe(node,options)}
  unobserve(node){this.nodes.delete(node);return super.unobserve(node)}
  disconnect(){this.nodes.clear();return super.disconnect()}
 };}
 const card=document.createElement('hui-picture-elements-card');window.floor=card;card.style.cssText='display:block;width:640px;margin-top:100px';
 card.attachShadow({mode:'open'}).innerHTML='<div id="root" style="position:relative"><hui-image style="display:block;height:400px"></hui-image></div>';
 const root=card.shadowRoot.querySelector('#root'),imgHost=root.firstElementChild;window.imageHost=imgHost;
 imgHost.attachShadow({mode:'open'}).innerHTML='<img id="image" style="display:block;width:100%;height:100%;object-fit:contain;object-position:50% 50%">';
 const image=imgHost.shadowRoot.querySelector('img');window.floorImage=image;
 image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#30343a"/><path d="M0 200H640M320 0V400M64 40H576V360H64Z" stroke="#aaa" stroke-width="3" fill="none"/></svg>');
 window.addOverlay=(config,left='50%',top='50%')=>{
  const el=document.createElement((config.type || 'honeycomb-persistent-hub').replace('custom:',''));
  el.style.cssText=`position:absolute;left:${left};top:${top};transform:translate(-50%,-50%)`;
  if(config.style)Object.assign(el.style,config.style);el.setConfig(config);root.append(el);return el;
 };
 view.append(card);await image.decode();window.hub=addOverlay(config);
}'''

class Beta5(Cubes):
 def floor(self,options=None):
  config={'size':'auto','auto_reference_width':640,'logo':'auto','items':[{'type':'light','entity':'light.zone_a'},{'type':'media','entity':'media_player.player_a'}]}
  config.update(options or {});self.page.evaluate(FLOORPLAN,config)
  
  if config.get('type')!='custom:honeycomb-persistent-control':self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")')
  self.settle()
 def measured(self):
  return self.page.evaluate('''()=>{const m=hub._menuContext.honeycomb;return {size:hub.size,menu:m.sizes.item,center:m._anchorX,y:m._anchorY,stack:hub._menuContext.stack.length,width:floorImage.getBoundingClientRect().width,translate:hub.style.translate}}''')
 def resize(self,width,height):
  self.page.evaluate('([w,h])=>{floor.style.width=w+"px";imageHost.style.height=h+"px"}',[width,height]);self.page.wait_for_timeout(100);self.settle()
 def test_auto_exact_ratios_and_numeric_defaults(self):
  self.floor()
  for factor in [1,.75,.5,1.5,1]:
   self.resize(640*factor,400*factor);r=self.measured();self.assertAlmostEqual(r['size'],82*factor,places=2);self.assertAlmostEqual(r['menu'],82*factor,places=2)
   icon=self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').first.locator('ha-svg-icon').bounding_box();self.assertAlmostEqual(icon['width'],24*factor,delta=.03)
   inner=self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').first.locator('.hex-inner').evaluate('(el)=>el.parentElement.getAttribute("transform")');self.assertAlmostEqual(float(re.search(r'scale\(([^)]+)',inner).group(1)),1-6/82,places=8)
   self.assertAlmostEqual(r['center'],self.page.evaluate('floorImage.getBoundingClientRect().left+floorImage.getBoundingClientRect().width/2'),delta=.1)
   self.capture(f'auto-scale-{factor}')
  for size in [60,82,100,None]:
   self.page.evaluate('(size)=>{hub.remove();hub=addOverlay({logo:false,...(size===null?{}:{size}),items:[{type:"light",entity:"light.zone_a"}]})}',size)
   self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")');self.resize(320,200)
   r=self.measured();self.assertAlmostEqual(r['size'],size or 82);self.assertAlmostEqual(r['menu'],size or 82)
 def test_contain_cover_offsets_and_nonuniform_fallback(self):
  self.floor();self.resize(400,400)
  # Centered image has y letterbox; percentages must map into actual pixels.
  self.page.evaluate("hub.remove();hub=addOverlay({size:'auto',auto_reference_width:640,logo:false,items:[{type:'light',entity:'light.zone_a'}]},'25%','25%')")
  self.page.wait_for_timeout(120);r=self.measured();left,top=self.page.evaluate('(()=>{let r=floorImage.getBoundingClientRect();return [r.left,r.top]})()')
  self.assertAlmostEqual(r['size'],51.25);self.assertAlmostEqual(r['center'],left+100,delta=.2);self.assertAlmostEqual(r['y'],top+137.5,delta=.2)
  self.capture('auto-contain-letterbox')
  self.page.evaluate("floorImage.style.objectFit='cover'");self.page.wait_for_timeout(120);r=self.measured()
  self.assertAlmostEqual(r['size'],82);self.assertAlmostEqual(r['center'],left+40,delta=.2);self.assertAlmostEqual(r['y'],top+100,delta=.2)
  self.capture('auto-cover-crop')
  self.page.evaluate("floorImage.style.objectFit='fill'");self.page.wait_for_timeout(100);self.assertEqual(self.measured()['size'],82);self.assertEqual(self.measured()['translate'],'')
 def test_two_overlays_shared_observer_hidden_reconnect_image_change(self):
  self.floor();self.page.evaluate("window.second=addOverlay({size:'auto',auto_reference_width:640,logo:false,items:[{type:'light',entity:'light.zone_a'}]},'70%','60%')")
  self.resize(320,200);self.assertEqual(self.page.evaluate('second.size'),41)
  for _ in range(5):
   self.page.evaluate("second.remove();second=addOverlay({size:'auto',auto_reference_width:640,logo:false,items:[{type:'light',entity:'light.zone_a'}]},'70%','60%')")
   self.page.wait_for_timeout(30)
  count=self.page.evaluate("obs.filter(o=>o.key==='ResizeObserver'&&o.instance.nodes.has(floor)).length");self.assertEqual(count,1)
  self.page.evaluate("floor.style.display='none'");self.page.wait_for_timeout(80);self.assertEqual(self.page.evaluate('hub.size'),82);self.assertEqual(self.page.evaluate('hub._hubMenu.style.visibility'),'hidden')
  self.page.evaluate("floor.style.display='block'");self.page.wait_for_timeout(80);self.assertEqual(self.page.evaluate('hub.size'),41)
  self.page.evaluate("floorImage.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"200\"><rect width=\"320\" height=\"200\" fill=\"gray\"/></svg>')")
  self.page.wait_for_function('hub.size===41&&second.size===41')
  for i in range(5):
   self.page.evaluate('hub.remove();second.remove()');self.page.wait_for_timeout(20)
   self.assertEqual(self.page.evaluate('obs.reduce((n,o)=>n+o.instance.nodes.size,0)'),0)
   self.page.evaluate("floor.shadowRoot.querySelector('#root').append(hub,second)");self.page.wait_for_timeout(40)
  self.capture('auto-two-hubs-reconnected')
 def test_auto_menu_resize_hit_target_and_exact_zoom_back(self):
  self.floor({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]});self.resize(480,300)
  center=self.page.locator('honeycomb-menu-ng .center-item');self.hold_input(center.locator('.interaction-surface'));self.settle()
  self.assertEqual(self.measured()['stack'],1)
  self.resize(320,200);self.assertAlmostEqual(self.measured()['menu'],41)
  self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').filter(has_text='Color').first.locator('.interaction-surface').click();self.settle()
  self.assertEqual(self.measured()['stack'],2);self.assertAlmostEqual(self.measured()['menu'],41)
  self.capture('auto-light-outer-palette')
  # Real long press creates meaningful recursive navigation; no service.
  swatch=self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').filter(has=self.page.locator('.interaction-surface[aria-label*="Hue"]')).first
  if not swatch.count():swatch=self.page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').nth(6)
  calls=self.page.evaluate('calls.length');self.hold_input(swatch.locator('.interaction-surface'));self.settle()
  self.assertEqual(self.page.evaluate('calls.length'),calls);self.assertEqual(self.measured()['stack'],3)
  self.back();self.settle();self.assertEqual(self.measured()['stack'],2)
  self.back();self.back();self.settle();self.assertEqual(self.measured()['stack'],0);self.assertAlmostEqual(self.measured()['menu'],41)
 def test_auto_control_and_no_image_fallback(self):
  self.floor({'type':'custom:honeycomb-persistent-control','module':'light','entity':'light.zone_a'});self.resize(320,200)
  self.assertEqual(self.page.evaluate('hub.size'),41)
  self.hold_input(self.page.locator('honeycomb-persistent-control#anchor .interaction-surface') if self.page.locator('#anchor').count() else self.page.locator('hui-picture-elements-card honeycomb-persistent-control .interaction-surface'))
  self.settle();self.resize(480,300);self.assertEqual(self.page.evaluate('hub._autoSizedMenu.sizes.item'),61.5)
  self.page.evaluate("hub.remove();floor.remove();makeControl({size:'auto',auto_reference_width:640,module:'light',entity:'light.zone_a'})")
  self.assertEqual(self.page.evaluate('control.size'),82)
 def test_numeric_equivalence_sidebar_orientation_and_idle_not_reset(self):
  self.floor({'logo':False,'items':[{'type':'light','entity':'light.zone_a'}]})
  self.resize(640*60/82,400*60/82)
  def metrics():return self.page.locator('honeycomb-menu-ng .center-item').evaluate('(el)=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,inner:el.shadowRoot.querySelector(".hex-inner").parentElement.getAttribute("transform"),content:getComputedStyle(el.shadowRoot.querySelector(".content")).fontSize})')
  automatic=metrics();self.page.evaluate("hub.remove();hub=addOverlay({size:60,logo:false,items:[{type:'light',entity:'light.zone_a'}]})")
  self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")');self.settle();fixed=metrics();self.assertAlmostEqual(fixed['w'],automatic['w'],delta=.03);self.assertAlmostEqual(fixed['h'],automatic['h'],delta=.03);self.assertEqual(fixed['content'],automatic['content'])
  self.page.evaluate("hub.remove();hub=addOverlay({size:'auto',auto_reference_width:640,logo:false,items:[{type:'light',entity:'light.zone_a'}]})")
  self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector("#honeycombs")')
  self.page.set_viewport_size({'width':844,'height':600});self.resize(480,300);self.assertAlmostEqual(self.measured()['size'],61.5)
  self.page.evaluate("floor.style.marginLeft='100px'");self.page.wait_for_timeout(80)
  self.assertAlmostEqual(self.measured()['center'],self.page.evaluate('floorImage.getBoundingClientRect().left+240'),delta=.2)
  self.page.clock.install();self.hold_input(self.page.locator('honeycomb-menu-ng .center-item .interaction-surface'));self.settle()
  self.page.clock.run_for(6000);self.page.evaluate("floor.style.width='320px';imageHost.style.height='200px'");self.page.clock.run_for(2200);self.settle()
  self.assertEqual(self.measured()['stack'],0,'passive image resize must not extend menu lifetime')
  self.capture('auto-orientation-sidebar-idle')
 def test_auto_two_hubs_sonos_artwork_logo_and_wave(self):
  self.station_hub();self.page.evaluate('hub.remove()')
  self.floor({'logo':'auto','items':[{'type':'sonos','entity':'media_player.player_a','favorites_sensor':'sensor.favorites'}, {'type':'generic','name':'Energy demo','energy_wave':{'active':True,'available':True,'fault':False,'power_w':1200},'tap_action':{'action':'none'}}]})
  self.page.evaluate("window.second=addOverlay({size:'auto',auto_reference_width:640,logo:false,items:[{type:'light',entity:'light.zone_a'}]},'75%','65%')")
  self.resize(480,300);self.page.wait_for_function('!!hub._hubMenu.shadowRoot.querySelector(".station-artwork") || [...hub._hubMenu.shadowRoot.querySelectorAll("honeycomb-menu-ng-item")].some(c=>c.shadowRoot.querySelector(".station-artwork"))')
  self.page.emulate_media(reduced_motion='reduce');self.capture('auto-multiple-logo-native-artwork-wave')
  self.assertEqual(self.page.evaluate('second.size'),61.5)
  self.page.evaluate('hub.remove();second.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
 def test_documented_copy_paste_floorplan_and_no_device_demo(self):
  document=Path('docs/FLOORPLAN_SIZING.md').read_text();config=yaml.safe_load(re.search(r'```yaml\n(.*?)```',document,re.S).group(1))
  self.station_hub();self.page.evaluate('hub.remove()');self.page.evaluate("pushState('sensor.favorites_a','2',{items:{favorite_a:'Station A',favorite_b:'Station B'}})")
  self.page.evaluate(FLOORPLAN,config['elements'][0]);self.page.evaluate('config=>window.second=addOverlay(config)',config['elements'][1]);self.resize(320,200)
  reference=config['elements'][0].get('auto_reference_width',1536);self.assertEqual(self.page.evaluate('[hub.size,second.size]'),[82*320/reference]*2);self.capture('documented-floorplan-auto')
  self.page.evaluate('hub.remove();second.remove();floor.remove()')
  demo=yaml.safe_load(Path('examples/energy-wave.yaml').read_text());self.hub(demo);self.settle()
  self.assertEqual(self.page.locator('honeycomb-menu-ng .energy-contour').count(),1);self.assertEqual(self.page.evaluate('calls.length'),0);self.capture('documented-synthetic-energy')
 def wave(self,more=None):
  config={'logo':False,'items':[{'type':'generic','name':'Synthetic energy','label':'1.2 kW','icon':'mdi:flash','tap_action':{'action':'none'},'colors':{'center':'#116644','inner_border':'#22cc88'},'energy_wave':{'active':True,'available':True,'fault':False,'power_w':1200}}]}
  if more:config['items'][0].update(more)
  self.hub(config);self.settle();return self.page.locator('honeycomb-menu-ng .center-item')
 def test_true_hex_wave_and_power_health_service_isolation(self):
  cube=self.wave();self.page.wait_for_function('view.querySelector("honeycomb-menu-ng").shadowRoot.querySelector(".center-item").hasAttribute("energy-wave-running")')
  contour=cube.locator('.energy-contour');self.assertEqual(len(contour.get_attribute('points').split()),6);self.assertEqual(contour.get_attribute('fill'),'none');self.assertEqual(cube.locator('radialGradient').count(),0)
  self.assertEqual(self.page.evaluate('calls.length'),0)
  animation=contour.evaluate('(el)=>el.getAnimations()[0].effect.getKeyframes()');self.assertEqual(animation[0]['transform'],'scale(0.12)');self.assertEqual(animation[-1]['transform'],'scale(1.4)')
  contour.evaluate('(el)=>{const a=el.getAnimations()[0];a.pause();a.currentTime=1200}');self.capture('hex-wave-positive');contour.evaluate('(el)=>el.getAnimations()[0].play()')
  self.page.evaluate("window.base=JSON.parse(JSON.stringify(hub.config));window.base.items[0].energy_wave.power_w=0;hub.setConfig(base)");self.settle();self.assertEqual(cube.locator('.energy-contour').count(),0)
  self.capture('hex-wave-zero-static')
  for key,value in [('active',False),('available',False),('fault',True),('enabled',False)]:
   self.page.evaluate('([key,value])=>{const c=JSON.parse(JSON.stringify(base));c.items[0].energy_wave.power_w=1200;c.items[0].energy_wave[key]=value;hub.setConfig(c)}',[key,value]);self.settle();self.assertEqual(cube.locator('.energy-contour').count(),0)
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_wave_reduced_motion_visibility_budget_and_disposal(self):
  cube=self.wave();self.page.wait_for_timeout(50);self.page.emulate_media(reduced_motion='reduce');self.page.wait_for_timeout(50)
  self.assertFalse(cube.evaluate('(el)=>el.hasAttribute("energy-wave-running")'));self.assertEqual(cube.locator('.energy-contour').evaluate('(el)=>el.getAnimations().length'),0)
  self.capture('hex-wave-reduced-motion')
  self.page.emulate_media(reduced_motion='no-preference');self.page.wait_for_timeout(50);self.assertTrue(cube.evaluate('(el)=>el.hasAttribute("energy-wave-running")'))
  self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
  self.assertFalse(cube.evaluate('(el)=>el.hasAttribute("energy-wave-running")'))
  self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
  self.page.evaluate("hub.style.top='5000px';hub._hubMenu.reanchor(100,5000)");self.page.wait_for_timeout(100);self.assertFalse(cube.evaluate('(el)=>el.hasAttribute("energy-wave-running")'))
  self.page.evaluate('hub.remove()');self.page.wait_for_timeout(30);self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0)
 def test_wave_live_normalized_state_and_unavailable_fault_fallback(self):
  self.page.evaluate("pushState('sensor.power_a','1200',{active:true,available:true,fault:false})")
  cube=self.wave({'entity':'sensor.power_a','energy_wave':{'active':'HCJS: return entity.attributes.active === true;','available':'HCJS: return entity.attributes.available === true;','fault':'HCJS: return entity.attributes.fault === true;','power_w':'HCJS: return Number(entity.state);'}})
  self.assertEqual(cube.locator('.energy-contour').count(),1)
  for state,attributes in [('0',{'active':True,'available':True,'fault':False}),('1200',{'active':False,'available':True,'fault':False}),('1200',{'active':True,'available':True,'fault':True}),('unavailable',{})]:
   self.page.evaluate('([state,attributes])=>pushState("sensor.power_a",state,attributes)',[state,attributes]);self.settle();self.assertEqual(cube.locator('.energy-contour').count(),0)
  self.page.evaluate("pushState('sensor.power_a','1200',{active:true,available:true,fault:false})");self.settle();self.assertEqual(cube.locator('.energy-contour').count(),1)
  self.assertEqual(self.page.evaluate('calls.length'),0)
 def test_wave_many_cubes_bounded_animation_and_no_ha_polling(self):
  self.hub({'logo':False,'size':22,'items':[{'type':'generic','slot':i,'energy_wave':{'active':True,'available':True,'fault':False,'power_w':100},'tap_action':{'action':'none'}} for i in range(180)]})
  self.page.wait_for_timeout(150)
  metrics=self.page.evaluate('''()=>{let cells=[...hub._hubMenu.shadowRoot.querySelectorAll('honeycomb-menu-ng-item,honeycomb-persistent-control')];return {cells:cells.length,animations:cells.filter(c=>c.hasAttribute('energy-wave-running')).length,calls:calls.length}}''')
  self.assertEqual(metrics['cells'],180);self.assertGreater(metrics['animations'],0);self.assertLessEqual(metrics['animations'],24);self.assertEqual(metrics['calls'],0)
  if self.evidence:(self.evidence/f'{self.viewport["width"]}-wave-budget.json').write_text(json.dumps(metrics,indent=2))
 def test_logo_gradient_darkening_comparison_and_explicit_optout(self):
  for darken in [.3,.4]:
   self.hub({'logo':'auto','colors':{'fill_gradient':{'type':'radial','darken':darken}},'items':[{'type':'light','entity':'light.zone_a','colors':{'inner_border':'#ff8000','fill_gradient':{'type':'radial','darken':darken}}},{'type':'media','entity':'media_player.player_a'}]})
   center=self.page.locator('honeycomb-menu-ng .center-item');self.assertEqual(center.evaluate('(el)=>el._model.fill.type'),'radial');self.capture(f'gradient-{darken}-logo')
   self.page.evaluate('hub.remove()')
  self.hub({'logo':'auto','colors':{'fill_gradient':False},'items':[{'type':'light','entity':'light.zone_a'},{'type':'media','entity':'media_player.player_a'}]})
  self.assertEqual(self.page.locator('honeycomb-menu-ng .center-item').evaluate('(el)=>el._model.fill.type'),'solid')
  self.page.evaluate('hub.remove()')
  self.hub({'logo':'auto','items':[{'type':'light','entity':'light.zone_a'},{'type':'media','entity':'media_player.player_a'}]})
  self.assertEqual(self.page.locator('honeycomb-menu-ng .center-item').evaluate('(el)=>el._model.fill.type'),'radial');self.capture('gradient-default-logo')
  self.page.evaluate('hub.remove()')
  self.hub({'logo':'auto','colors':{'center':'#112233'},'items':[{'type':'light','entity':'light.zone_a'},{'type':'media','entity':'media_player.player_a'}]})
  self.assertEqual(self.page.locator('honeycomb-menu-ng .center-item').evaluate('(el)=>el._model.fill'),{'type':'solid','center':'#112233'})

def main():
 a=argparse.ArgumentParser();a.add_argument('--bundle',type=Path,required=True);a.add_argument('--button-card',type=Path,required=True);a.add_argument('--evidence-dir',type=Path,required=True);args=a.parse_args();args.evidence_dir.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();threading.Thread(target=server.serve_forever,daemon=True).start();success=True
 try:
  with sync_playwright() as p:
   Beta5.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Beta5.url=f'http://127.0.0.1:{server.server_port}';Beta5.evidence=args.evidence_dir
   names=[n for n in Beta5.__dict__ if n.startswith('test_')]
   for w,h in [(1100,900),(390,844)]:
    Beta5.viewport={'width':w,'height':h};r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Beta5(n) for n in names));success=r.wasSuccessful() and success
   Beta5.browser.close()
 finally:server.shutdown();server.server_close()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
