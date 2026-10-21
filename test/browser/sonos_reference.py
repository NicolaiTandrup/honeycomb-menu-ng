"""Before evidence and Radio render contract from the verified v1.7.0 tag.
Synthetic HA only. Screenshots/reports go to the existing CI evidence artifact.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import threading
from http.server import ThreadingHTTPServer

BASELINE = '7d27afbc33e1b9589c30e79cd7a5defc553bb187'

def capture_reference(cubes, handler, button, evidence):
    commit=subprocess.check_output(['git','rev-parse','v1.7.0^{commit}'],text=True).strip()
    assert commit==BASELINE,'Do not silently replace the Sonos/Radio visual reference'
    bundle=subprocess.check_output(['git','show',f'{BASELINE}:honeycomb-menu-ng.js'])
    assert hashlib.sha256(bundle).hexdigest()=='8443047faf0425ff1e357b55d1526692252d7a3abf0835ba11a040bda9211b58'
    before=evidence/'before';before.mkdir(parents=True,exist_ok=True)
    original_url,original_evidence=cubes.url,cubes.evidence
    with tempfile.TemporaryDirectory() as directory:
        file=Path(directory)/'baseline.js';file.write_bytes(bundle)
        server=ThreadingHTTPServer(('127.0.0.1',0),handler);server.bundle=file;server.button=button
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            cubes.url=f'http://127.0.0.1:{server.server_port}';cubes.evidence=before
            for width,height in [(1100,900),(390,844)]:
                cubes.viewport={'width':width,'height':height}
                case=cubes();case.setUp()
                try:
                    case.sonos_open();case.capture('issue90-controls')
                    case.activate(case.sonos_slot(3).locator('.interaction-surface'));case.capture('issue90-join')
                    case.back();case.sonos_radio_data()
                    case.activate(case.page.locator('honeycomb-menu [aria-label="Radio"]'));case.settle()
                    (before/f'{width}-radio-state.json').write_text(json.dumps(case.sonos_radio_state(),indent=2)+'\n')
                    case.capture('issue90-radio')
                finally:case.tearDown()
                case=cubes();case.setUp()
                try:
                    case.sonos_open({'type':'sonos','entity':'media_player.player_a'})
                    case.activate(case.sonos_slot(3).locator('.interaction-surface'));case.capture('issue90-empty')
                    assert case.page.evaluate('moreInfo')==['media_player.player_a']
                finally:case.tearDown()
            # Additional before evidence preserves the already-approved PR #91 work.
            expanded=evidence/'before-expanded';expanded.mkdir(parents=True,exist_ok=True)
            previous='630aeb4c47878ef8bd67e368eec3dce11b7ca391'
            previous_bundle=subprocess.check_output(['git','show',f'{previous}:honeycomb-menu-ng.js'])
            assert hashlib.sha256(previous_bundle).hexdigest()=='e8a59256d97e3cc425a270933910b0f0506e894f577e95e8329919f2e6f3f681'
            file.write_bytes(previous_bundle);cubes.evidence=expanded
            for width,height in [(1100,900),(390,844)]:
                cubes.viewport={'width':width,'height':height}
                case=cubes();case.setUp()
                try:
                    case.station_hub();case.capture('issue90-station-playing')
                    case.hold_input(case.page.locator('honeycomb-menu .center-item .interaction-surface'))
                    case.activate(case.sonos_slot(1).locator('.interaction-surface'))
                    case.capture('issue90-station-radio-accents')
                finally:case.tearDown()
            # Exact immutable cumulative beta.3: reproduce the remaining defect
            # with FV IDs, distinct streams and cache/map label differences.
            beta3='b61374e6589111642768b305724d52c385eccfa6'
            beta3_bundle=subprocess.check_output(['git','show',f'{beta3}:honeycomb-menu-ng.js'])
            assert hashlib.sha256(beta3_bundle).hexdigest()=='86047b72c5c05edb6ff0325f6f2b8acdb0650b084cc0a30cc6e086293e69960d'
            file.write_bytes(beta3_bundle)
            before_beta4=evidence/'before-beta4';before_beta4.mkdir(parents=True,exist_ok=True)
            cubes.evidence=before_beta4
            for width,height in [(1100,900),(390,844)]:
                cubes.viewport={'width':width,'height':height}
                case=cubes();case.setUp()
                try:
                    case.beta4_radio_hub()
                    launcher=case.page.locator('honeycomb-menu [data-honeycomb-id="items[1]"]')
                    assert launcher.locator('.station-artwork').count()==0
                    assert launcher.locator('.hex-fill').get_attribute('fill')=='#00bcd4'
                    case.capture('beta4-parent-playing')
                    case.hold_input(launcher.locator('.interaction-surface'))
                    case.page.wait_for_function('hub._menuContext.stack.length===1')
                    center=case.page.locator('honeycomb-menu .center-item')
                    assert center.locator('.station-artwork').count()==0
                    case.capture('beta4-promoted-playing')
                    # Prove suppression independently, even with exact ID match.
                    case.page.evaluate("pushState('media_player.player_a','playing',{media_content_id:'FV:2/57',group_members:['media_player.player_a']})")
                    center.locator('.station-artwork').wait_for(state='visible')
                    case.activate(case.sonos_slot(1).locator('.interaction-surface'))
                    case.page.wait_for_function('hub._menuContext.stack.length===2');case.settle()
                    assert center.evaluate('(el)=>el._model.icon')=='mdi:arrow-left'
                    assert center.locator('.station-artwork').count()==0
                    case.capture('beta4-radio-center-playing')
                finally:case.tearDown()
            beta4='7f00dd9193c70c837dcbb71fd1c705539498800f'
            beta4_bundle=subprocess.check_output(['git','show',f'{beta4}:honeycomb-menu-ng.js'])
            assert hashlib.sha256(beta4_bundle).hexdigest()=='bc009fcf437191a5dbff52d89596b9342cd82abbc9b641fe7a82afc523b7543d'
            file.write_bytes(beta4_bundle)
            before_beta5=evidence/'before-beta5';before_beta5.mkdir(parents=True,exist_ok=True);cubes.evidence=before_beta5
            depths=[]
            for width,height in [(1100,900),(390,844)]:
                cubes.viewport={'width':width,'height':height}
                case=cubes();case.setUp()
                try:
                    case.beta4_radio_hub();launcher=case.page.locator('honeycomb-menu [data-honeycomb-id="items[1]"]')
                    for promoted in [False,True]:
                        if promoted:case.hold_input(launcher.locator('.interaction-surface'));case.settle()
                        for state in ['playing','paused']:
                            case.page.evaluate("state=>pushState('media_player.player_a',state,{...hass.states['media_player.player_a'].attributes,volume_level:state==='playing'?1:.02})",state)
                            case.capture(f'beta5-artwork-{ "center" if promoted else "module" }-{state}')
                        case.page.evaluate("pushState('media_player.player_a','playing',{...hass.states['media_player.player_a'].attributes,volume_level:.02})")
                finally:case.tearDown()
                case=cubes();case.setUp()
                try:
                    case.sonos_open();case.activate(case.sonos_slot(3).locator('.interaction-surface'));case.settle()
                    case.activate(case.sonos_slot(3).locator('.interaction-surface'));case.settle()
                    duplicate=case.page.evaluate('hub._menuContext.stack.length');assert duplicate==3
                    case.activate(case.page.locator('honeycomb-menu .center-item .interaction-surface'));case.settle()
                    after_back=case.page.evaluate('hub._menuContext.stack.length');assert after_back==2
                    depths.append({'viewport':width,'duplicate_join_depth':duplicate,'after_one_back':after_back})
                    case.capture('beta5-join-duplicate-back')
                finally:case.tearDown()
            # Frozen unpublished beta.5: native services alone could not enable it.
            beta5='74c3b166088242965c7e8270062d99511f70597f'
            beta5_bundle=subprocess.check_output(['git','show',f'{beta5}:honeycomb-menu-ng.js'])
            assert hashlib.sha256(beta5_bundle).hexdigest()=='25ec7a1d6490497285a8906c12575cf3507cd17a7e2c63018e81340d4544c901'
            file.write_bytes(beta5_bundle)
            before_beta6=evidence/'before-beta6';before_beta6.mkdir(parents=True,exist_ok=True);cubes.evidence=before_beta6
            for width,height in [(1100,900),(390,844)]:
                cubes.viewport={'width':width,'height':height}
                case=cubes();case.setUp()
                try:
                    case.sleep_backend_setup();case.sleep_hub()
                    case.activate(case.sonos_slot(4).locator('.interaction-surface'));case.settle()
                    assert case.sonos_slot(7).locator('.secondary').inner_text()=='Setup required'
                    assert case.sonos_slot(7).locator('.interaction-surface').get_attribute('aria-disabled')=='true'
                    case.capture('beta6-before-helper-required')
                finally:case.tearDown()
            (before_beta6/'provenance.json').write_text(json.dumps({'tag':'v1.7.1-beta.5','commit':beta5,'sha256':hashlib.sha256(beta5_bundle).hexdigest(),'release':'unpublished immutable draft','entities':'synthetic'},indent=2)+'\n')
            (before_beta5/'provenance.json').write_text(json.dumps({'tag':'v1.7.1-beta.4','commit':beta4,'sha256':hashlib.sha256(beta4_bundle).hexdigest(),'entities':'synthetic','navigation':depths},indent=2)+'\n')
            (before_beta4/'provenance.json').write_text(json.dumps({'tag':'v1.7.1-beta.3','commit':beta3,'sha256':hashlib.sha256(beta3_bundle).hexdigest(),'entities':'synthetic','video':'owner written findings only; no video frames claimed'},indent=2)+'\n')
            (expanded/'provenance.json').write_text(json.dumps({'commit':previous,'sha256':hashlib.sha256(previous_bundle).hexdigest(),'entities':'synthetic'},indent=2)+'\n')
            (before/'provenance.json').write_text(json.dumps({'tag':'v1.7.0','commit':commit,'sha256':hashlib.sha256(bundle).hexdigest(),'viewports':[[1100,900],[390,844]],'entities':'synthetic','missing_join_setup':'more-info fallback; no outer candidates'},indent=2)+'\n')
        finally:
            cubes.url,cubes.evidence=original_url,original_evidence
            server.shutdown();server.server_close()
