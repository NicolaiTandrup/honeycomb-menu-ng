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
            (before/'provenance.json').write_text(json.dumps({'tag':'v1.7.0','commit':commit,'sha256':hashlib.sha256(bundle).hexdigest(),'viewports':[[1100,900],[390,844]],'entities':'synthetic','missing_join_setup':'more-info fallback; no outer candidates'},indent=2)+'\n')
        finally:
            cubes.url,cubes.evidence=original_url,original_evidence
            server.shutdown();server.server_close()
