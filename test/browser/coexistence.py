"""Full upstream/NG bundle coexistence; real Chromium, synthetic HA, no live HA.
Browser plugin not available. Upstream immutable bundle and digest are pinned.
"""
import argparse,hashlib,importlib.util,os,shutil,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from run import Handler,ROOT,BUTTON_SHA
UPSTREAM_SHA='dc72dfe01fef91eb720c464eae7374c71c3739773c7503492a30f1f0c7c0c35c'
class MixedHandler(Handler):
    def do_GET(self):
        if self.path in ('/','/original.js'):
            self.send_response(200);self.send_header('Content-Type','text/html' if self.path=='/' else 'text/javascript');self.end_headers()
            data=(ROOT/'test/browser/fixture.html').read_text().replace("await import('/bundle.js');",'') if self.path=='/' else self.server.original.read_text()
            self.wfile.write(data.encode());return
        super().do_GET()
def main():
    a=argparse.ArgumentParser();a.add_argument('--bundle',type=Path,required=True);a.add_argument('--original',type=Path,required=True);a.add_argument('--button-card',type=Path,required=True);a.add_argument('--evidence-dir',type=Path,required=True);args=a.parse_args()
    assert hashlib.sha256(args.original.read_bytes()).hexdigest()==UPSTREAM_SHA
    assert hashlib.sha256(args.button_card.read_bytes()).hexdigest()==BUTTON_SHA
    args.evidence_dir.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),MixedHandler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve();server.original=args.original.resolve()
    threading.Thread(target=server.serve_forever,daemon=True).start();count=0
    try:
        with sync_playwright() as pw:
            b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
            for width,height in [(1100,900),(390,844)]:
                for order in [('original',),('ng',),('original','ng'),('ng','original')]:
                    page=b.new_page(viewport={'width':width,'height':height},has_touch=width<500);errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda e:errors.append(e.text) if e.type=='error' else None)
                    page.goto(f'http://127.0.0.1:{server.server_port}');page.wait_for_function('window.ready')
                    assert page.title()=='Honeycomb shared cube test' and page.locator('h1').is_visible()
                    for plugin in order:
                        page.add_script_tag(url='/original.js' if plugin=='original' else '/bundle.js')
                        if plugin=='original':page.evaluate('window.originalAPI=window.honeycomb_menu;window.originalItem=customElements.get("honeycomb-menu-item");window.originalTemplates={station:"upstream"};window.honeycomb_menu_templates=originalTemplates')
                        else:page.evaluate('window.ngAPI=window.honeycombNG;window.ngElement=customElements.get("honeycomb-menu-ng");window.ngTemplates={};honeycombNG.templates=ngTemplates')
                    if 'original' in order:
                        assert page.evaluate('window.honeycomb_menu===originalAPI && customElements.get("honeycomb-menu-item")===originalItem && window.honeycomb_menu_templates===originalTemplates')
                        page.evaluate("honeycomb_menu({entity:'light.zone_a',buttons:[{icon:'mdi:lightbulb',tap_action:{action:'more-info'}}]})")
                        page.locator('honeycomb-menu honeycomb-menu-item').first.wait_for()
                    if 'ng' in order:
                        assert page.evaluate('window.honeycombNG===ngAPI && honeycombNG.apiVersion===1 && honeycombNG.templates===ngTemplates && customElements.get("honeycomb-menu-ng")===ngElement')
                        page.evaluate("honeycombNG.open({entity:'light.zone_a',animate:false,buttons:[{icon:'mdi:lightbulb',tap_action:{action:'more-info'}}]})")
                        page.locator('honeycomb-menu-ng honeycomb-menu-ng-item').first.wait_for()
                        target=page.locator('honeycomb-menu-ng honeycomb-menu-ng-item .interaction-surface').first
                        target.tap() if width<500 else target.click()
                        page.wait_for_function("moreInfo.includes('light.zone_a')")
                        page.evaluate('honeycombNG.close()');page.wait_for_function('!view.querySelector("honeycomb-menu-ng")')
                        page.evaluate("honeycombNG.open({entity:'light.zone_a',animate:false,xy_pad:{on_release:true,x:{service:'light.turn_on',data:{entity_id:'entity',brightness:'{{x}}'}}},buttons:[{icon:'mdi:lightbulb'}]})")
                        page.locator('honeycomb-menu-ng honeycomb-ng-xy-pad').wait_for()
                        page.evaluate("view.querySelector('honeycomb-menu-ng').shadowRoot.querySelector('honeycomb-ng-xy-pad').dispatchEvent(new CustomEvent('honeycomb-ng-drag-end',{detail:{x:123,y:0}}))")
                        page.wait_for_function("calls.some(c=>c[0]==='light' && c[1]==='turn_on' && Number(c[2].brightness)===123)")
                        page.evaluate('honeycombNG.close()');page.wait_for_function('!view.querySelector("honeycomb-menu-ng")')
                        if 'original' in order:assert page.locator('honeycomb-menu').count()==1
                        # Explicit NG event never triggers original, regardless of load order.
                        page.evaluate("document.body.dispatchEvent(new CustomEvent('ll-custom',{detail:{honeycomb_ng_menu:{entity:'light.zone_a',animate:false,buttons:[{icon:'mdi:lightbulb'}]}},bubbles:true}))")
                        page.locator('honeycomb-menu-ng').wait_for()
                        if 'original' in order:assert page.locator('honeycomb-menu').count()==1
                        page.evaluate('honeycombNG.close()');page.wait_for_function('!view.querySelector("honeycomb-menu-ng")')
                        # Legacy YAML stays valid NG-only; in mixed mode only original responds.
                        page.evaluate("document.body.dispatchEvent(new CustomEvent('ll-custom',{detail:{honeycomb_menu:{entity:'light.zone_a',animate:false,buttons:[{icon:'mdi:lightbulb'}]}},bubbles:true}))")
                        if 'original' in order:assert page.locator('honeycomb-menu-ng').count()==0
                        else:
                            page.locator('honeycomb-menu-ng').wait_for();page.evaluate('honeycombNG.close()');page.wait_for_function('!view.querySelector("honeycomb-menu-ng")')
                        page.evaluate("makeHub({logo:false,items:[{type:'light',entity:'light.zone_a'}]})")
                        page.locator('honeycomb-menu-ng .center-item').wait_for()
                        page.evaluate('honeycombNG.disposeContext(hub._menuContext);hub.remove()')
                        page.evaluate("makeControl({module:'sonos',entity:'media_player.player_a'})")
                        target=page.locator('#anchor .interaction-surface');target.wait_for()
                        page.evaluate('control._openMenu()')
                        page.locator('honeycomb-menu-ng').wait_for()
                        page.evaluate('honeycombNG.close()')
                    else:assert page.evaluate('window.honeycombNG===undefined && !customElements.get("honeycomb-menu-ng")')
                    assert not page.locator('hui-error-card').count()
                    page.screenshot(path=str(args.evidence_dir/f'{width}-{"-".join(order)}.png'),full_page=True)
                    assert errors==[],errors;page.close();count+=1;print(f'PASS {width} {order}',flush=True)
            b.close()
    finally:server.shutdown();server.server_close()
    print(f'{count} full-bundle desktop/mobile coexistence scenarios passed')
if __name__=='__main__':main()
