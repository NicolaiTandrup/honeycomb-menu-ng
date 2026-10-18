"""Chromium regression tests using the real, checksum-pinned button-card.

Home Assistant state/services are simulated; no device or backend is contacted.
Install test/requirements.txt and Chromium, then run:
python test/browser-smoke.py --bundle honeycomb-menu-ng.js
"""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import threading
import unittest
from urllib.request import urlopen

import yaml
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


class FixtureHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        resources = {
            '/': (ROOT / 'test/fixtures/visibility.html', 'text/html'),
            '/honeycomb-menu-ng.js': (self.server.bundle, 'text/javascript'),
            '/button-card.js': (self.server.button_card, 'text/javascript')
        }
        if self.path == '/charging.json':
            data = json.dumps(yaml.safe_load((ROOT / 'examples/charging-hub.yaml').read_text())).encode()
            mime = 'application/json'
        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        elif self.path in resources:
            path, mime = resources[self.path]
            data = path.read_bytes()
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


class BrowserContracts(unittest.TestCase):
    def setUp(self):
        self.errors = []
        self.page = self.browser.new_page(viewport=self.viewport)
        self.page.set_default_timeout(7000)
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('console', lambda msg: self.errors.append(msg.text) if msg.type == 'error' else None)
        self.page.goto(self.url)
        self.page.wait_for_function('window.fixtureReady')
        self.assertEqual(self.page.title(), 'Honeycomb visibility regression fixture')
        self.assertTrue(self.page.locator('h1').is_visible())

    def tearDown(self):
        try:
            self.assertEqual(self.errors, [])
            self.assertEqual(self.page.locator('hui-error-card').count(), 0)
        finally:
            self.page.close()

    def states(self, values, same_object=False):
        self.page.evaluate("""({values, same}) => {
            if (!same) { window.liveHass = {...liveHass, states:{...liveHass.states}}; }
            for (const [id, data] of Object.entries(values)) {
                liveHass.states[id] = {entity_id:id, attributes:{}, ...data};
            }
            document.querySelector('home-assistant').hass = liveHass;
            updateHass();
        }""", {'values': values, 'same': same_object})

    def open_menu(self, buttons):
        self.page.evaluate('(buttons) => window.menu = openFixture(buttons)', buttons)
        self.page.wait_for_function('menu.shadowRoot.querySelector("#honeycombs")')

    def allocation(self):
        return self.page.evaluate('Array.from(menu.buttons, b => b?.name || null)')

    def wait_slot(self, slot, name):
        self.page.wait_for_function('(v) => menu.buttons[v.slot]?.name === v.name', arg={'slot': slot, 'name': name})

    def snapshot(self, name):
        if self.evidence:
            self.page.evaluate('''async () => {
                await menu.updateComplete;
                await new Promise(resolve => requestAnimationFrame(resolve));
                await Promise.all(menu.shadowRoot.getAnimations({subtree:true})
                    .map(animation => animation.finished.catch(() => {})));
            }''')
            self.page.screenshot(path=str(self.evidence / f'{self.viewport["width"]}-{name}.png'))

    def test_live_priority_reclaims_and_releases_with_same_hass_identity(self):
        self.states({'binary_sensor.vehicle_a_present': {'state': 'off'}})
        self.open_menu([
            {'name': 'Charger 1', 'slot': 3, 'autoclose': False},
            {'name': 'Vehicle A', 'slot': 3, 'slot_mode': 'priority', 'autoclose': False,
             'visibility': [{'condition': 'state', 'entity': 'binary_sensor.vehicle_a_present', 'state': 'on'}]}
        ])
        self.wait_slot(2, 'Charger 1')
        self.states({'binary_sensor.vehicle_a_present': {'state': 'on'}}, same_object=True)
        self.wait_slot(2, 'Vehicle A')
        self.wait_slot(3, 'Charger 1')
        self.assertTrue(self.page.locator('[data-honeycomb-slot="2"] button-card').is_visible())
        self.states({'binary_sensor.vehicle_a_present': {'state': 'off'}}, same_object=True)
        self.wait_slot(2, 'Charger 1')

    def test_hard_reservation_legacy_show_and_live_numeric_updates(self):
        self.states({'sensor.charger_1_power': {'state': '0'}})
        template = '[[[ return Number(states["sensor.charger_1_power"].state) > 0; ]]]'
        self.open_menu([
            {'name': 'Reserved', 'slot': 1, 'slot_mode': 'hard', 'visibility': [
                {'condition': 'numeric_state', 'entity': 'sensor.charger_1_power', 'above': 0}]},
            {'name': 'Legacy', 'show': template}, {'name': 'Charger 2'}
        ])
        self.wait_slot(1, 'Charger 2')
        self.assertIsNone(self.allocation()[0])
        self.states({'sensor.charger_1_power': {'state': '1200'}}, same_object=True)
        self.wait_slot(0, 'Reserved')
        self.wait_slot(1, 'Legacy')
        self.assertEqual(self.page.evaluate('menu.config.buttons[1][0].show'), template)
        self.states({'sensor.charger_1_power': {'state': '0'}}, same_object=True)
        self.wait_slot(1, 'Charger 2')
        self.assertIsNone(self.allocation()[0])

    def test_live_ring_growth_preserves_the_current_reanchored_center(self):
        self.states({'binary_sensor.vehicle_a_present': {'state': 'off'}})
        self.open_menu([
            {'name': 'Charger 1'},
            {'name': 'Vehicle A', 'slot': 18, 'slot_mode': 'priority',
             'visibility': [{'entity': 'binary_sensor.vehicle_a_present', 'state': 'on'}]}
        ])
        x = min(self.viewport['width']/2, 350)
        self.page.evaluate('(x) => menu.reanchor(x,300)', x)
        self.states({'binary_sensor.vehicle_a_present': {'state': 'on'}})
        self.wait_slot(17, 'Vehicle A')
        center = self.page.evaluate('''() => {
            const pos=menu._computeCenterPosition(), size=menu.sizes.item;
            return {x:parseFloat(menu.style.left)+pos.x*size+size/2,
                    y:parseFloat(menu.style.top)+pos.y*size+size*1.1547/2};
        }''')
        self.assertAlmostEqual(center['x'], x, delta=0.1)
        self.assertAlmostEqual(center['y'], 300, delta=0.1)

    def drag_start(self, name):
        slot = self.allocation().index(name)
        item = self.page.locator(f'[data-honeycomb-slot="{slot}"]')
        box = item.bounding_box()
        x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
        self.page.mouse.move(x - 20, y)
        self.page.mouse.down()
        self.page.mouse.move(x, y, steps=3)
        self.page.wait_for_function('menu._dragPointerActive')
        return slot

    def test_drag_reflow_is_deferred_and_hidden_targets_cannot_execute(self):
        self.states({'binary_sensor.vehicle_a_present': {'state': 'off'}})
        action = {'action': 'perform-action', 'perform_action': 'homeassistant.toggle', 'target': {'entity_id': 'switch.charger_1_charging_allowed'}}
        self.open_menu([
            {'name': 'Charger 1', 'slot': 3, 'autoclose': False, 'tap_action': action},
            {'name': 'Vehicle A', 'slot': 3, 'slot_mode': 'priority', 'autoclose': False,
             'tap_action': action, 'visibility': [{'entity': 'binary_sensor.vehicle_a_present', 'state': 'on'}]}
        ])
        self.drag_start('Charger 1')
        self.states({'binary_sensor.vehicle_a_present': {'state': 'on'}})
        self.page.wait_for_function('menu._visibilityPending')
        self.assertEqual(self.allocation()[2], 'Charger 1')
        self.page.mouse.up()
        self.wait_slot(2, 'Vehicle A')
        self.assertEqual(self.page.evaluate('calls.length'), 1)
        self.drag_start('Vehicle A')
        self.page.evaluate('window.oldItem = menu.shadowRoot.querySelector("[data-honeycomb-slot=\\"2\\"]")')
        self.states({'binary_sensor.vehicle_a_present': {'state': 'off'}})
        self.page.wait_for_function('oldItem.hidden')
        # Exercise a stale event while the hidden target still owns its DOM
        # cell. After reflow Lit may reuse that cell for a different control.
        self.page.evaluate('menu._triggerMenuItemTap(oldItem)')
        self.page.evaluate('oldItem._card.shadowRoot.querySelector("ha-card").dispatchEvent(new CustomEvent("action",{bubbles:true,composed:true,detail:{action:"tap"}}))')
        self.assertEqual(self.page.evaluate('calls.length'), 1)
        self.page.mouse.up()
        self.wait_slot(2, 'Charger 1')
        self.assertEqual(self.page.evaluate('calls.length'), 1)

    def charging_states(self):
        self.states({
            'sensor.charger_1_power': {'state': '1200', 'attributes': {'unit_of_measurement': 'W'}},
            'sensor.charger_2_power': {'state': '1.8', 'attributes': {'unit_of_measurement': 'kW'}},
            'binary_sensor.charger_1_charging': {'state': 'on'},
            'binary_sensor.charger_2_charging': {'state': 'off'},
            'sensor.charger_1_vehicle': {'state': 'Vehicle A'},
            'sensor.charger_2_vehicle': {'state': 'Vehicle B'},
            'switch.charger_1_charging_allowed': {'state': 'on'},
            'binary_sensor.charger_1_online': {'state': 'on'},
            'binary_sensor.charger_2_online': {'state': 'on'},
            'binary_sensor.charger_1_fault': {'state': 'off'},
            'binary_sensor.charger_2_fault': {'state': 'off'},
            'sensor.charger_1_session_energy': {'state': '5.2', 'attributes': {'unit_of_measurement': 'kWh'}},
            'binary_sensor.charger_1_cable_locked': {'state': 'on'},
            'switch.charger_2_charging_allowed': {'state': 'off'},
            'sensor.vehicle_a_battery': {'state': '60'},
            'sensor.vehicle_b_battery': {'state': '80'},
            'binary_sensor.vehicle_a_present': {'state': 'off'},
            'binary_sensor.vehicle_b_present': {'state': 'off'}
        })

    def add_charging_parent(self, zero=False):
        self.page.evaluate("""async zero => {
            const dashboard = await (await fetch('/charging.json')).json();
            window.honeycomb_menu_templates = dashboard.honeycomb_menu_templates;
            const config = dashboard.views[0].cards[0];
            if (zero) {
                config.variables.chargers = [];
                config.menu.variables.chargers = [];
                config.menu.buttons = config.menu.buttons.slice(2);
            }
            window.parentCube = document.createElement('honeycomb-persistent-control');
            parentCube.setConfig(config);
            document.querySelector('home-assistant').provideHass(parentCube);
            Object.assign(parentCube.style, {position:'absolute',left:(innerWidth/2-45)+'px',top:'250px'});
            document.body.append(parentCube);
        }""", zero)
        self.page.wait_for_function('parentCube.shadowRoot.querySelector(".primary")')

    def test_complete_charging_yaml_power_counts_vehicles_permissions_and_updates(self):
        self.charging_states()
        self.add_charging_parent()
        parent = self.page.locator('body > honeycomb-persistent-control')
        self.assertEqual(parent.locator('.primary').inner_text(), '3.0 kW')
        self.assertEqual(parent.locator('.secondary').inner_text(), '1/2 charging')
        self.assertTrue(parent.locator('.secondary').evaluate('(e) => e.scrollWidth <= e.clientWidth'))
        parent.locator('.interaction-surface').click()
        self.page.wait_for_function('view.querySelector("honeycomb-menu")')
        self.page.evaluate('window.menu = view.querySelector("honeycomb-menu")')
        self.page.wait_for_function('menu.buttons.filter(b=>b?.entity).length === 2')
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('1200 W', exact=True).is_visible())
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('Vehicle A', exact=True).is_visible())
        self.assertTrue(self.page.locator('honeycomb-menu .hex-inner[fill="#4caf50"]').first.is_visible())
        self.states({'binary_sensor.vehicle_a_present': {'state': 'on'}})
        self.page.wait_for_function('menu.buttons.some(b=>b?.entity === "sensor.vehicle_a_battery")')
        self.states({'sensor.charger_1_power': {'state': '2400', 'attributes': {'unit_of_measurement': 'W'}}})
        self.page.wait_for_function('parentCube.shadowRoot.querySelector(".primary").textContent.trim() === "4.2 kW"')
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('2400 W', exact=True).is_visible())
        self.snapshot('charging')
        self.states({'binary_sensor.charger_1_fault': {'state': 'on'}}, same_object=True)
        self.page.wait_for_function('menu.shadowRoot.querySelector("honeycomb-menu-item").shadowRoot.querySelector(".hex-inner").getAttribute("fill") === "#f44336"')
        self.states({'binary_sensor.charger_1_online': {'state': 'off'},
                     'binary_sensor.charger_1_fault': {'state': 'off'},
                     'binary_sensor.charger_1_charging': {'state': 'off'},
                     'sensor.charger_1_power': {'state': 'unavailable'}}, same_object=True)
        self.page.wait_for_function('parentCube.shadowRoot.querySelector(".primary").textContent.trim() === "Unavailable"')
        self.page.wait_for_function('menu.shadowRoot.querySelector("honeycomb-menu-item").shadowRoot.querySelector(".hex-inner").getAttribute("fill") === "#6b7280"')
        self.assertEqual(parent.locator('.hex-center').get_attribute('fill'), '#20262d')
        self.assertEqual(self.page.locator('honeycomb-menu').get_by_text('Unavailable', exact=True).count(), 2)

    def test_zero_chargers_and_no_known_vehicles_leave_parent_and_close_accessible(self):
        self.charging_states()
        self.add_charging_parent(zero=True)
        parent = self.page.locator('body > honeycomb-persistent-control')
        self.assertEqual(parent.locator('.primary').inner_text(), '0 W')
        self.assertEqual(parent.locator('.secondary').inner_text(), '0/0 charging')
        parent.locator('.interaction-surface').click()
        self.page.wait_for_function('view.querySelector("honeycomb-menu")')
        self.assertTrue(self.page.locator('honeycomb-menu .interaction-surface').is_visible())
        self.assertEqual(self.page.evaluate('view.querySelector("honeycomb-menu").buttons.filter(b=>b?.entity).length'), 0)
        self.page.locator('honeycomb-menu .interaction-surface').click()
        self.page.wait_for_function('!view.querySelector("honeycomb-menu") && parentCube.style.visibility !== "hidden"')

    def physical_center(self):
        return self.page.evaluate("""() => {
            const pos = menu._computeCenterPosition(), size = menu.sizes.item;
            return [parseFloat(menu.style.left)+pos.x*size+size/2,
                    parseFloat(menu.style.top)+pos.y*size+size*1.1547/2];
        }""")

    def test_charger_tap_hold_details_back_and_reusable_vehicle_template(self):
        self.charging_states()
        self.states({'binary_sensor.vehicle_a_present': {'state': 'on'}})
        self.add_charging_parent()
        self.page.locator('body > honeycomb-persistent-control .interaction-surface').click()
        self.page.wait_for_function('view.querySelector("honeycomb-menu")')
        self.page.evaluate('window.menu = view.querySelector("honeycomb-menu"); window.originalMenu = menu')
        charger = self.page.locator('honeycomb-menu').get_by_text('1200 W', exact=True)
        charger.click()
        self.assertEqual(self.page.evaluate('calls'), [['script', 'turn_on', {}, {'entity_id':'script.request_charger_1_permission'}]])
        center = self.physical_center()
        box = charger.bounding_box()
        self.page.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
        self.page.mouse.down()
        self.page.wait_for_timeout(650)
        self.page.mouse.up()
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('Session energy', exact=True).is_visible())
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('5.2 kWh', exact=True).is_visible())
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('Locked', exact=True).is_visible())
        self.assertEqual(self.page.evaluate('view.querySelectorAll("honeycomb-menu").length'), 1)
        self.assertTrue(self.page.evaluate('originalMenu === view.querySelector("honeycomb-menu")'))
        self.assertEqual(self.physical_center(), center)
        self.page.locator('honeycomb-menu .interaction-surface').click()
        self.assertTrue(charger.is_visible())
        self.page.locator('honeycomb-menu').get_by_text('Vehicle A', exact=True).last.click()
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('Battery', exact=True).is_visible())
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('60 %', exact=True).is_visible())
        nested = self.page.evaluate('menu.buttons.filter(Boolean).map(b=>({name:b.name,entity:b.entity,tap:b.tap_action}))')
        self.assertEqual(self.physical_center(), center)
        self.page.locator('honeycomb-menu .interaction-surface').click()
        self.assertTrue(charger.is_visible())
        self.page.evaluate("""() => {
            window.honeycomb_menu_close();
            window.menu = honeycomb_menu({template:'vehicle_controls', position_mode:'anchored', anchor_x:innerWidth/2,
                anchor_y:300, variables:{vehicle:{battery:'sensor.vehicle_a_battery'}}});
        }""")
        self.page.wait_for_function('menu.buttons.some(b=>b?.name === "Battery")')
        self.assertEqual(self.page.evaluate('menu.buttons.filter(Boolean).map(b=>({name:b.name,entity:b.entity,tap:b.tap_action}))'), nested)
        self.assertEqual(self.page.evaluate('calls.length'), 1)

    def test_local_hub_light_palette_back_and_sonos_keep_one_overlay(self):
        self.page.evaluate("""() => {
            window.hub = document.createElement('honeycomb-persistent-hub');
            hub.setConfig({size:60,logo:true,items:[
                {type:'light',entity:'light.room',name:'Light'},
                {type:'sonos',entity:'media_player.room',name:'Media'}]});
            Object.assign(hub.style,{position:'absolute',left:(innerWidth/2-30)+'px',top:'300px'});
            document.body.append(hub);
        }""")
        self.page.wait_for_function('hub._hubMenu?.shadowRoot.querySelectorAll(".ring-item").length === 2')
        self.page.evaluate('window.menu = hub._hubMenu')
        controls = self.page.locator('honeycomb-menu .ring-item .interaction-surface')
        controls.first.click()
        self.assertEqual(self.page.evaluate('calls[0][0]'), 'homeassistant')
        box = controls.first.bounding_box()
        self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        self.page.mouse.down()
        self.page.wait_for_timeout(650)
        self.page.mouse.up()
        color = self.page.locator('honeycomb-menu').get_by_text('Color',exact=True)
        self.assertTrue(color.is_visible())
        center = self.physical_center()
        color.click()
        self.page.wait_for_function('menu.buttons.filter(b=>b && Object.keys(b).length).length === 18')
        self.assertEqual(self.physical_center(),center)
        self.assertEqual(self.page.evaluate('view.querySelectorAll("honeycomb-menu").length'),1)
        self.page.locator('honeycomb-menu .center-item .interaction-surface').click()
        self.assertTrue(color.is_visible())
        self.page.locator('honeycomb-menu .center-item .interaction-surface').click()
        self.page.wait_for_function('hub._menuContext.stack.length === 0')
        controls.last.click()
        self.assertEqual(self.page.evaluate('calls.at(-1).slice(0,2)'), ['media_player','media_play_pause'])
        box = controls.last.bounding_box()
        self.page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        self.page.mouse.down()
        self.page.wait_for_timeout(650)
        self.page.mouse.up()
        self.assertTrue(self.page.locator('honeycomb-menu').get_by_text('Browse',exact=True).is_visible())
        self.assertEqual(self.page.evaluate('view.querySelectorAll("honeycomb-menu").length'),1)
        self.page.locator('honeycomb-menu .center-item .interaction-surface').click()
        self.page.wait_for_function('hub._menuContext.stack.length === 0')

    def test_native_and_normal_faces_match_and_update_with_safe_text_templates(self):
        self.states({'sensor.charger_1_power': {'state':'0'}})
        self.page.evaluate("""() => {
            const colors = {center:'[[[ return states["sensor.charger_1_power"].state === "0" ? "#20262d" : "#174b32"; ]]]',
                inner_border:'[[[ return states["sensor.charger_1_power"].state === "0" ? "#2196f3" : "#4caf50"; ]]]', outer_border:'#34383d'};
            const border = {outer_width:'[[[ return states["sensor.charger_1_power"].state === "0" ? 2 : 3; ]]]',inner_width:4};
            window.menu = honeycomb_menu({position_mode:'anchored', anchor_x:innerWidth/2, anchor_y:300, size:260,
                animate:false, empty_slots:'hidden', persistent_center:{mode:'hub',colors,border,interactive:false},
                buttons:[{name:'[[[[ return "Vehicle A"; ]]]]',label:'[[[ return states.missing.state; ]]]',show_name:true,show_label:true,
                colors,border,styles:{name:[{'font-size':'10px'}],label:[{'font-size':'8px'}]}}]});
        }""")
        normal = self.page.locator('honeycomb-menu-item')
        self.assertEqual(normal.locator('#name').inner_text(), 'Vehicle A')
        self.assertEqual(normal.locator('#label').inner_text(), 'Unavailable')
        self.page.wait_for_function('menu.shadowRoot.querySelector("honeycomb-menu-item").shadowRoot.querySelector(".hex-inner")')
        paths = self.page.evaluate("""() => [...menu.shadowRoot.querySelectorAll('honeycomb-menu-item,honeycomb-persistent-control')]
            .filter(e=>e.shadowRoot.querySelector('.hex-outer'))
            .map(e=>[e.shadowRoot.querySelector('.hex-outer').getAttribute('d'),e.shadowRoot.querySelector('.hex-inner').getAttribute('d')])""")
        self.assertEqual(paths[0], paths[1])
        self.states({'sensor.charger_1_power': {'state':'1200'}}, same_object=True)
        self.page.wait_for_function("""() => [...menu.shadowRoot.querySelectorAll('honeycomb-menu-item,honeycomb-persistent-control')]
            .filter(e=>e.shadowRoot.querySelector('.hex-inner'))
            .every(e=>e.shadowRoot.querySelector('.hex-inner').getAttribute('fill') === '#4caf50')""")
        updated_paths = self.page.evaluate("""() => [...menu.shadowRoot.querySelectorAll('honeycomb-menu-item,honeycomb-persistent-control')]
            .map(e=>e.shadowRoot.querySelector('.hex-outer').getAttribute('d'))""")
        self.assertEqual(updated_paths[0], updated_paths[1])
        self.assertNotEqual(updated_paths[0], paths[0][0])
        center = self.page.locator('honeycomb-persistent-control .hex-center');
        self.assertEqual(center.get_attribute('fill'),'#174b32')
        self.assertEqual(self.page.evaluate('menu.shadowRoot.querySelector("honeycomb-persistent-control").shadowRoot.querySelector(".hex-center").namespaceURI'), 'http://www.w3.org/2000/svg')
        self.snapshot('matching-rings')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--button-card', type=Path)
    parser.add_argument('--evidence-dir', type=Path)
    args = parser.parse_args()
    dependency = json.loads((ROOT / 'test/button-card.json').read_text())
    button_card = args.button_card or Path('/tmp/honeycomb-button-card-v7.0.1.js')
    if not button_card.exists():
        with urlopen(dependency['url'], timeout=60) as response:
            button_card.write_bytes(response.read())
    if hashlib.sha256(button_card.read_bytes()).hexdigest() != dependency['sha256']:
        raise RuntimeError('button-card artifact digest mismatch; refusing to use it')
    if args.evidence_dir:
        args.evidence_dir.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), FixtureHandler)
    server.bundle = args.bundle.resolve()
    server.button_card = button_card.resolve()
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
            BrowserContracts.browser = browser
            BrowserContracts.url = f'http://127.0.0.1:{server.server_port}'
            BrowserContracts.evidence = args.evidence_dir
            for width, height in [(1100, 900), (390, 844)]:
                BrowserContracts.viewport = {'width': width, 'height': height}
                print(f'Chromium / real button-card: {width}x{height}', flush=True)
                results.append(unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(BrowserContracts)).wasSuccessful())
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    return 0 if all(results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
