"""Issue #125: production UI and HA-shaped editor lifecycle, synthetic HA only.
Browser plugin not available. No real HA/Easee/charging commands.
"""
import argparse,json,os,shutil,threading,unittest
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,CheckResult
from charger import Charger,charger
from beta5 import FLOORPLAN

SCENE='''async()=>{
 window.trackHosts=[];window.resizeRecords=[];window.pointerRecords=new Map();
 const Native=window.ResizeObserver;window.ResizeObserver=class extends Native{
 constructor(cb){super(cb);this.nodes=new Set();resizeRecords.push(this)}observe(n,o){this.nodes.add(n);super.observe(n,o)}disconnect(){this.nodes.clear();super.disconnect()}unobserve(n){this.nodes.delete(n);super.unobserve(n)}};
 const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
 document.addEventListener=(type,fn,opt)=>{if(['pointermove','pointerup','pointercancel'].includes(type)){if(!pointerRecords.has(type))pointerRecords.set(type,new Set());pointerRecords.get(type).add(fn)}return add(type,fn,opt)};
 document.removeEventListener=(type,fn,opt)=>{pointerRecords.get(type)?.delete(fn);return remove(type,fn,opt)};
 window.makeTrackPane=async(parent,preview=false)=>{
 const pane=document.createElement('section');pane.style.cssText='position:relative;display:block;width:'+Math.min(innerWidth-40,600)+'px;height:230px;margin:20px;background:#293747';
 parent.append(pane);const card=document.createElement('hui-picture-elements-card');card.style.cssText='display:block;width:100%;height:100%;';pane.append(card);
 const shadow=card.attachShadow({mode:'open'});shadow.innerHTML='<div id="root" style="position:relative;height:100%"><hui-image style="display:block;height:100%"></hui-image></div>';
 const root=shadow.querySelector('#root'),imageHost=root.firstElementChild;imageHost.attachShadow({mode:'open'}).innerHTML='<img id="image" style="display:block;width:100%;height:100%;object-fit:contain" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27230%27%3E%3Crect width=%27600%27 height=%27230%27 fill=%27%23313f4c%27/%3E%3C/svg%3E">';await imageHost.shadowRoot.querySelector('img').decode();
 const hosts=[];
 for(let i=0;i<2;i++){
  const h=document.createElement('honeycomb-persistent-hub');h.style.cssText='position:absolute;left:'+(i?70:30)+'%;top:50%;transform:translate(-50%,-50%)';h.preview=preview;
  h.setConfig({size:82,logo:false,items:[{type:'light',entity:'light.zone_a',name:preview?'Preview':'Dashboard',show_name:true}]});root.append(h);hosts.push(h);trackHosts.push(h);
 }
 pane.hosts=hosts;return pane;
 };
 window.trackMain=await makeTrackPane(view);window.trackPreview=await makeTrackPane(document.body,true);
 window.deepMenus=(root=document)=>{let out=[...root.querySelectorAll('honeycomb-menu-ng')];for(const el of root.querySelectorAll('*'))if(el.shadowRoot)out.push(...deepMenus(el.shadowRoot));return out};
}'''

class Track3(Charger):
    def ready_scene(self):
        self.page.evaluate(SCENE);self.page.wait_for_function('trackHosts.every(h=>h._hubMenu?.shadowRoot.querySelector(".center-item"))');self.page.wait_for_timeout(80)
    def capture_scene(self,name):
        if self.evidence:self.page.screenshot(path=str(self.evidence/f'{self.viewport["width"]}-{name}.png'))
    def test_two_readable_rows_and_power_badge_at_numeric_and_auto_sizes(self):
        for size,width in [(82,600),('auto',450),('auto',300)]:
            if self.page.evaluate('!!window.hub'):self.page.evaluate('hub.remove();if(window.floor)floor.remove()')
            self.page.evaluate("chargerSet('switch.charger_1_enabled','on',{})")
            item=charger();item['slot']=0
            self.page.evaluate(FLOORPLAN,{'size':size,'auto_reference_width':600,'logo':False,'items':[item]})
            self.page.evaluate('w=>{floor.style.width=w+"px";imageHost.style.height=w*2/3+"px"}',min(width,self.viewport['width']-20))
            self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelector(".center-item")');self.page.wait_for_timeout(120)
            cell=self.cell(0);self.assertEqual(cell.locator('.content > .primary,.content > .secondary,.content > .tertiary').count(),2)
            self.assertEqual(cell.locator('.primary').inner_text(),'Car connected');self.assertEqual(cell.locator('.secondary').inner_text(),'Charger 1');self.assertEqual(cell.locator('.power-badge').inner_text(),'7.4 kW')
            body=cell.locator('.primary').bounding_box();fixed=cell.locator('.secondary').bounding_box();badge=cell.locator('.power-badge').bounding_box();self.assertLessEqual(badge['y']+badge['height'],body['y']+.5);self.assertLessEqual(body['y']+body['height'],fixed['y']+.5)
            self.assertTrue(cell.locator('.primary').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
            self.assertTrue(cell.locator('.secondary').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
            self.capture_scene('two-row-'+str(size)+'-'+str(width))
            self.state(1,'enabled','off');self.assertEqual(cell.locator('.primary').inner_text(),'Disabled');self.assertEqual(cell.locator('.power-badge').count(),0);self.assertEqual(cell.locator('.secondary').inner_text(),'Charger 1')
        self.assert_no_commands()
    def test_native_sonos_padding_rectangular_square_paused_and_responsive(self):
        self.station_hub()
        for thumb in ['/station-full-bleed.svg','/station-a.svg']:
            self.page.evaluate("url=>pushState('sensor.favorites_cache','1',{items:[{media_content_id:'favorite_a',title:'Station A',thumbnail:url}]})",thumb)
            for size in [82,60,41]:
                self.page.evaluate('size=>hub.setConfig({logo:false,size,items:[{type:"sonos",entity:"media_player.player_a",favorites_sensor:"sensor.favorites"}]})',size)
                for state in ['playing','paused']:
                    self.page.evaluate("s=>pushState('media_player.player_a',s,{volume_level:.42,media_content_id:'favorite_a',group_members:['media_player.player_a']})",state)
                    image=self.cell(0).locator('.station-artwork');image.wait_for();self.page.wait_for_function('h=>h._hubMenu.shadowRoot.querySelector(".center-item").shadowRoot.querySelector("img.station-artwork").naturalWidth>0',arg=self.page.evaluate_handle('hub'))
                    self.assertEqual(image.evaluate('e=>getComputedStyle(e).objectFit'),'contain');self.assertEqual(image.evaluate('e=>e.style.width'),'55.8%')
                    box=image.bounding_box();cell=self.cell(0).bounding_box();self.assertGreater(box['x']-cell['x'],size*.14);self.assertLess(box['x']+box['width'],cell['x']+size*.86)
                    if state=='playing':self.assertLess(box['y']+box['height'],self.cell(0).locator('.secondary').bounding_box()['y'])
                    else:self.assertEqual(self.cell(0).locator('.hex-fill').get_attribute('fill'),'#202224')
                self.capture_scene('sonos-padded-'+str(size)+'-'+thumb[1:-4])
        self.assert_no_commands()
    def test_custom_media_background_is_contained_and_padded(self):
        self.page.evaluate('''()=>makeControl({module:'media',entity:'media_player.player_a',show_icon:false,styles:{card:[{'background-image':'url(/station-full-bleed.svg)'},{'background-size':'cover'}]}})''')
        c=self.page.locator('body > honeycomb-persistent-control');art=c.locator('.media-background-artwork');self.assertEqual(art.evaluate('e=>getComputedStyle(e).backgroundSize'),'contain')
        box=art.bounding_box();cell=c.bounding_box();self.assertGreater(box['x'],cell['x']+10);self.assertLess(box['x']+box['width'],cell['x']+cell['width']-10);self.assertLess(box['y']+box['height'],c.locator('.secondary').bounding_box()['y']);self.capture_scene('media-background-padding')
    def test_detached_view_reconnect_does_not_retain_or_duplicate_menus(self):
        self.ready_scene()
        for i in range(3):
            self.page.evaluate('window.viewParent=view.parentNode;window.oldMenus=trackMain.hosts.map(h=>h._hubMenu);view.remove()')
            self.assertTrue(self.page.evaluate('oldMenus.every(m=>!m.parentNode && m._disposed)'))
            self.page.evaluate('viewParent.append(view)');self.page.wait_for_function('trackMain.hosts.every(h=>h._hubMenu?.isConnected)');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),4)
        self.capture_scene('edit-reconnected');self.assert_no_commands()
    def test_editor_preview_ownership_hide_rebuild_and_cleanup(self):
        self.ready_scene()
        self.assertTrue(self.page.evaluate('trackHosts.every(h=>h._hubMenu.parentElement===h.parentElement)'))
        self.page.evaluate("trackPreview.style.display='none'");self.assertEqual(self.page.locator('honeycomb-menu-ng:visible').count(),2)
        self.page.evaluate("trackPreview.style.display='';trackPreview.hosts.forEach(h=>h.setConfig({logo:false,items:[{type:'light',entity:'light.zone_a',name:'Edited'}]}))");self.page.wait_for_timeout(100);self.assertEqual(self.page.locator('honeycomb-menu-ng:visible').count(),4);self.capture_scene('edit-preview-owned')
        self.page.evaluate('trackPreview.hosts.forEach(h=>h._hubMenu.shadowRoot.querySelector(".center-item")._executeAction({action:"toggle"}))');self.assert_no_commands()
        self.page.evaluate('trackPreview.remove();trackMain.remove()');self.page.wait_for_timeout(100)
        self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),0);self.assertTrue(self.page.evaluate('resizeRecords.every(r=>r.nodes.size===0)'));self.assertTrue(self.page.evaluate('[...pointerRecords.values()].every(s=>s.size===0)'))
    def test_scaled_editor_anchor_geometry_and_no_preview_action(self):
        self.ready_scene()
        for scale in [.75,.6,1]:
            self.page.evaluate("s=>{trackPreview.style.transformOrigin='0 0';trackPreview.style.transform='translate(12px,8px) scale('+s+')'}",scale);self.page.wait_for_timeout(150)
            positions=self.page.evaluate('trackPreview.hosts.map(h=>{let a=h.getBoundingClientRect(),c=h._hubMenu.shadowRoot.querySelector(".center-item").getBoundingClientRect();return {dx:a.left+a.width/2-c.left-c.width/2,dy:a.top+a.height/2-c.top-c.height/2,width:a.width-c.width}})')
            for p in positions:
                for key in ['dx','dy','width']:self.assertAlmostEqual(p[key],0,delta=.65,msg=str(p))
        self.capture_scene('scaled-preview');self.assert_no_commands()
    def test_standalone_control_dispose_keeps_other_hubs_and_global_close(self):
        self.ready_scene();self.page.evaluate('''()=>{const c=document.createElement('honeycomb-persistent-control');c.style.cssText='position:absolute;left:50%;top:50%';c.setConfig({module:'light',entity:'light.zone_a'});trackPreview.hosts[0].parentElement.append(c);window.trackControl=c;c._openMenu()}''')
        self.page.wait_for_function('trackControl._ownedMenuContext?.honeycomb?.isConnected');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),5)
        self.page.evaluate('trackControl.remove()');self.assertEqual(self.page.locator('honeycomb-menu-ng').count(),4);self.assert_no_commands()


def main():
    p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--button-card',type=Path,required=True);p.add_argument('--evidence-dir',type=Path,required=True);p.add_argument('--test-filter');a=p.parse_args();a.evidence_dir.mkdir(parents=True,exist_ok=True)
    s=ThreadingHTTPServer(('127.0.0.1',0),Handler);s.bundle=a.bundle.resolve();s.button=a.button_card.resolve();threading.Thread(target=s.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Track3.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);Track3.url=f'http://127.0.0.1:{s.server_port}';Track3.evidence=a.evidence_dir
            for width,height in [(1100,900),(390,844)]:
                Track3.viewport={'width':width,'height':height};names=[n for n in Track3.__dict__ if n.startswith('test_') and (not a.test_filter or a.test_filter in n)];r=unittest.TextTestRunner(verbosity=2,resultclass=CheckResult).run(unittest.TestSuite(Track3(n) for n in names));success=r.wasSuccessful() and success
            Track3.browser.close()
    finally:s.shutdown();s.server_close()
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
