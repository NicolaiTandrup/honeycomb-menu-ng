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
            (before_beta4/'provenance.json').write_text(json.dumps({'tag':'v1.7.1-beta.3','commit':beta3,'sha256':hashlib.sha256(beta3_bundle).hexdigest(),'entities':'synthetic','video':'owner written findings only; no video frames claimed'},indent=2)+'\n')
            (expanded/'provenance.json').write_text(json.dumps({'commit':previous,'sha256':hashlib.sha256(previous_bundle).hexdigest(),'entities':'synthetic'},indent=2)+'\n')
            (before/'provenance.json').write_text(json.dumps({'tag':'v1.7.0','commit':commit,'sha256':hashlib.sha256(bundle).hexdigest(),'viewports':[[1100,900],[390,844]],'entities':'synthetic','missing_join_setup':'more-info fallback; no outer candidates'},indent=2)+'\n')
        finally:
            cubes.url,cubes.evidence=original_url,original_evidence
            server.shutdown();server.server_close()
