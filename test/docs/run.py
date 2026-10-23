"""Validate current documentation/examples against YAML, core contracts and Chromium.
Uses the existing synthetic HA browser shell; never connects to a real HA server.
"""
import argparse
import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.parse import unquote
import yaml
from jinja2.nativetypes import NativeEnvironment
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
SPEC=importlib.util.spec_from_file_location('cube_browser',ROOT/'test/browser/run.py')
BROWSER=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(BROWSER)

class Loader(yaml.SafeLoader):
    pass
Loader.add_constructor('!include',lambda loader,node:loader.construct_scalar(node))
Loader.add_constructor('!include_dir_named',lambda loader,node:loader.construct_scalar(node))
# Reject duplicate keys, including accidental duplicate template:/script: wrappers.
def mapping(loader,node,deep=False):
    explicit=set()
    for key,_ in node.value:
        if key.tag=='tag:yaml.org,2002:merge':continue
        k=loader.construct_object(key,deep=deep)
        assert k not in explicit,f'duplicate YAML key: {k}'
        explicit.add(k)
    # YAML merge aliases deliberately allow explicit keys to override inherited
    # defaults. Check actual duplicate source keys before flattening those merges.
    loader.flatten_mapping(node)
    return {loader.construct_object(key,deep=deep):loader.construct_object(value,deep=deep) for key,value in node.value}
Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,mapping)
def load(text): return yaml.load(text,Loader=Loader)
def blocks(text):
    return re.findall(r'^(?:```|~~~)yaml\s*\n(.*?)^(?:```|~~~)\s*$',text,re.M|re.S)

SHARED=set('entity name label icon show_name show_label show_icon energy_wave background foreground colors border styles variables custom_fields interactive off active_color show_brightness show_volume tap_action hold_action double_tap_action hold_time autoclose audio menu presets'.split())
SONOS=set('favorites_sensor toggle_member_script members group_volume_down_script group_volume_up_script'.split())
CHARGER=set('provider entities device_id discover max_age association chargers'.split())
ITEM=SHARED|SONOS|CHARGER|set('type module slot slot_mode visibility show persistent'.split())
def known(value,allowed,where):
    assert isinstance(value,dict),where
    assert not set(value)-allowed,f'{where}: unsupported example keys {set(value)-allowed}'
def actions(obj):
    if isinstance(obj,list):
        for value in obj: actions(value)
    elif isinstance(obj,dict):
        for key,value in obj.items():
            if key in ('tap_action','hold_action','double_tap_action'):
                known(value,set('action perform_action service data service_data target navigation_path url_path honeycomb_menu'.split()),key)
                assert value['action'] in ('none','toggle','more-info','perform-action','call-service','navigate','url','fire-dom-event')
                if value['action']=='perform-action': assert re.fullmatch(r'\w+\.\w+',value['perform_action'])
            actions(value)
def item(value,where):
    known(value,ITEM,where)
    module=value.get('module',value.get('type'))
    assert module in ('light','sonos','media','generic','charger','charging-hub'),where
    if module=='charging-hub':
        assert isinstance(value.get('chargers'),list),where
        for member in value['chargers']:item(member,where+' aggregate member')
    elif module!='generic' or 'entity' in value:assert re.fullmatch(r'\w+\.\w+',value['entity']),where
    if module=='charger':
        assert value.get('provider','generic') in ('easee','generic'),where
        if 'entities' in value:known(value['entities'],set('status power enabled online connected session_energy physical_lock permanent_lock current limit'.split()),where)
        if 'association' in value:known(value['association'],{'entity','charger_key','max_age'},where)
    if 'slot_mode' in value: assert value['slot_mode'] in ('hard','soft','priority')
    if value.get('slot_mode')=='priority': assert 'slot' in value
    if 'slot' in value: assert type(value['slot']) is int and 0<=value['slot']<=216
    if 'presets' in value:
        known(value['presets'],{'brightness','kelvin','color'},where)
        for key,preset in value['presets'].items():
            known(preset,{'hue_entity','saturation_entity'} if key=='color' else {'entity','default'},where)
            for k,v in preset.items():
                if k!='default': assert re.fullmatch(r'(number|input_number)\.\w+',v)
    if 'members' in value:
        for member in value['members']: known(member,{'entity','name','icon'},where)
    if 'colors' in value: known(value['colors'],{'center','inner_border','outer_border','unavailable','fill_gradient'},where)
    if 'border' in value: known(value['border'],{'inner_width','outer_width'},where)
def card(config,where):
    assert isinstance(config,dict),where
    if config['type']=='custom:honeycomb-persistent-hub':
        known(config,{'type','name','size','logo','items','auto_open','menu','style','auto_reference_width'},where)
        for i,value in enumerate(config['items']): item(value,f'{where} item {i}')
    elif config['type']=='custom:honeycomb-persistent-control':
        known(config,SHARED|SONOS|CHARGER|{'type','module','size','style','auto_reference_width'},where)
        item({k:v for k,v in config.items() if k not in ('type','size','style','auto_reference_width')},where)
    elif config['type']=='button':
        known(config,{'type','entity','name','hold_action'},where)
        menu=config['hold_action']['honeycomb_menu']
        known(menu,{'entity','size','empty_slots','center_button','buttons'},where)
        for button in menu['buttons']: known(button,{'slot','slot_mode','icon','tap_action'},where)
    else: raise AssertionError(f'Unsupported card {where}')
    actions(config)

def fragment(config,where):
    """Give reference fragments their documented context before checking contracts."""
    if isinstance(config,list):
        if config and all(isinstance(v,dict) and v.get('type') in ('custom:honeycomb-persistent-hub','custom:honeycomb-persistent-control') for v in config):
            for i,value in enumerate(config):card(value,f'{where} picture element {i}')
            return None
        if all(isinstance(v,dict) and v.get('type') in ('light','sonos','media','generic') for v in config):
            return {'type':'custom:honeycomb-persistent-hub','items':config}
        for value in config:known(value,SHARED|{'slot','slot_mode','position','active','show'},where)
    elif 'homeassistant' in config:
        assert config=={'homeassistant':{'packages':'packages'}},where
    elif 'type' in config:
        if config['type'] in ('light','sonos','media','generic','charger','charging-hub'):
            return {'type':'custom:honeycomb-persistent-hub','items':[config]}
        if config['type']=='picture-elements':
            known(config,{'type','image','elements'},where)
            for element in config['elements']:

                if element.get('type') in ('custom:honeycomb-persistent-hub','custom:honeycomb-persistent-control'):card(element,where+' picture element')
                else:known(element,{'type','entity','style','tap_action','hold_action'},where)
            actions(config)
        else:raise AssertionError(f'{where}: unrecognized card type')
    elif set(config)<={'presets'} or set(config)<=SONOS:
        return {'type':'custom:honeycomb-persistent-control','module':'light' if 'presets' in config else 'sonos',
                'entity':'light.zone_a' if 'presets' in config else 'media_player.player_a',**config}
    elif 'visibility' in config:
        return {'type':'custom:honeycomb-persistent-hub','items':[{'type':'generic','entity':'sensor.value_a',**config}]}
    elif 'input_number' in config:
        for helper in config['input_number'].values():
            known(helper,{'name','min','max','step','initial'},where)
            assert helper['min']<=helper['initial']<=helper['max'] and helper['step']>0
    elif 'resources' in config:
        for resource in config['resources']:
            known(resource,{'url','type'},where);assert resource['type']=='module'
    elif 'supported_color_modes' in config:
        assert config=={'supported_color_modes':['onoff']},where
    elif 'template' in config and isinstance(config['template'],str):
        assert config=={'template':'templates.yaml'},where
    else:
        # Classic menu/button/service-data/template fragments use the documented
        # boundary, not Hub item visibility or the standalone Control schema.
        known(config,{'honeycomb_menu','layout_envelope','empty_slots','center_button',
                      'center_brightness','buttons','active','name','brightness_step_pct',
                      'light','hold_action'},where)
        if 'layout_envelope' in config:assert config['layout_envelope'] in ('auto','inner','outer')
        if 'empty_slots' in config:assert config['empty_slots'] in ('visible','hidden')
        actions(config)
    return None

def links():
    count=0
    files=[ROOT/'README.md',ROOT/'RELEASE_NOTES.md',*sorted((ROOT/'docs').glob('*.md'))]
    for file in files:
        for target in re.findall(r'\]\(([^\s)]+)\)',file.read_text()):
            if re.match(r'[a-z]+://|mailto:',target): continue
            target=unquote(target).strip('<>'); path,_,anchor=target.partition('#')
            dest=(file.parent/path).resolve() if path else file
            assert dest.exists(),f'{file.relative_to(ROOT)}: missing {target}'
            if anchor and dest.suffix=='.md':
                headings=re.findall(r'^#{1,6}\s+(.+)$',dest.read_text(),re.M)
                slugs={re.sub(r'[^\w\- ]','',h.lower()).replace(' ','-') for h in headings}
                assert anchor in slugs,f'{file.relative_to(ROOT)}: missing anchor {target}'
            count+=1
    return count

def external_recipes():
    env=NativeEnvironment()
    script=load((ROOT/'examples/sonos-toggle-member.yaml').read_text())['script']['player_a_toggle_member']
    assert script['fields']['member']['required'] is True and script['mode']=='queued'
    variables=script['sequence'][0]['variables'];assert variables['coordinator']=='media_player.player_a'
    grouped=env.from_string(variables['current_members']).render(coordinator='media_player.player_a',state_attr=lambda *_:['media_player.player_a','media_player.player_b'])
    choice=script['sequence'][1]['choose'][0]
    predicate=env.from_string(choice['conditions'][0]['value_template'])
    assert predicate.render(member='media_player.player_b',current_members=grouped) is True
    assert predicate.render(member='media_player.player_c',current_members=grouped) is False
    assert choice['sequence'][0]['action']=='media_player.unjoin'
    join=script['sequence'][1]['default'][0]; assert join['action']=='media_player.join'
    assert env.from_string(join['data']['group_members']).render(member='media_player.player_c')==['media_player.player_c']
    return []

STATES={
 'light.white_a':{'state':'on','attributes':{'brightness':128,'color_temp_kelvin':3000,'supported_color_modes':['color_temp'],'min_color_temp_kelvin':1800,'max_color_temp_kelvin':6535}},
 'light.zone_a':{'state':'on','attributes':{'brightness':128,'hs_color':[30,80],'rgb_color':[255,128,0],'color_temp_kelvin':2700,'supported_color_modes':['hs','color_temp']}},
 'light.zone_b':{'state':'on','attributes':{'brightness':200,'supported_color_modes':['brightness']}},
 'light.switch_a':{'state':'on','attributes':{'supported_color_modes':['onoff']}},
 'person.person_a':{'state':'home','attributes':{}},
 'media_player.player_a':{'state':'playing','attributes':{'volume_level':.42,'group_members':['media_player.player_a','media_player.player_b']}},
 'media_player.player_b':{'state':'idle','attributes':{'volume_level':.2}},
 'media_player.player_c':{'state':'idle','attributes':{'volume_level':.2}},
 'script.player_a_toggle_member':{'state':'off','attributes':{}},
 'number.relay_a_brightness':{'state':'60','attributes':{}},
 'number.relay_a_kelvin':{'state':'2700','attributes':{}},
 'input_number.preset_a_hue':{'state':'30','attributes':{}},
 'input_number.preset_a_saturation':{'state':'80','attributes':{}},
 'sensor.favorites_a':{'state':'2','attributes':{'items':{'favorite_a':'Station A','favorite_b':'Station B'}}},
}
for entity,state in STATES.items():state['entity_id']=entity

class Examples(BROWSER.Cubes):
    def setUp(self):
        super().setUp()
        self.page.evaluate('hass.services={script:{player_a_toggle_member:{}}}')
        self.page.evaluate('states=>pushStates(Object.entries(states).map(([id,s])=>[id,s.state,s.attributes]))',STATES)
    def control_example(self,name):
        self.page.evaluate('config=>makeControl(config)',self.examples[name]);self.settle()
    def test_docs_presentation_example_live_colors_and_action(self):
        config=load((ROOT/'examples/presentation-light.yaml').read_text())
        self.hub(config)
        fills=self.controls().evaluate_all('(els)=>els.map(e=>e._model.fill)')
        self.assertEqual(fills[0]['type'],'radial')
        self.assertEqual(fills[1],{'type':'solid','center':'#203040'})
        self.activate(self.controls().first.locator('.interaction-surface'))
        self.assertEqual(self.page.evaluate('calls'),[['homeassistant','toggle',{}, {'entity_id':'light.zone_a'}]])
        self.page.evaluate("pushState('light.zone_a','off',{supported_color_modes:['hs']})")
        self.assertEqual(self.controls().first.evaluate('(e)=>e._model.fill.type'),'solid')
        self.capture('docs-shared-presentation-example')
    def test_docs_basic_hub_and_auto_tables(self):
        self.hub(self.examples['hub.yaml']);self.assert_visible_unique_cells(3)
        for count,without,with_logo in self.auto:
            actual=self.page.evaluate('([n,logo])=>hub._hubSlots(n,logo)',[count,False]);self.assertEqual(actual,without)
            self.assertEqual(self.page.evaluate('n=>hub._shouldShowLogo.call({config:{items:Array.from({length:n},()=>({})),logo:"auto"}})',count),2<=count<=6)
            if with_logo:self.assertEqual(self.page.evaluate('n=>hub._hubSlots(n,true)',count),with_logo)
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="1"] .interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['homeassistant','toggle',{}, {'entity_id':'light.zone_a'}])
        self.capture('docs-basic-hub')
    def test_docs_dynamic_hub(self):
        self.hub(self.examples['dynamic-hub.yaml']);self.assert_visible_unique_cells(3)
        self.assertEqual(self.page.evaluate('[...hub._placements.values()].sort()'),[0,1,2])
        self.page.evaluate("pushState('person.person_a','not_home')")
        self.page.wait_for_function('hub._placements.has("items[3]")')
        self.assert_visible_unique_cells(3)
        self.page.evaluate("pushState('light.zone_b','on',{brightness:127})")
        self.page.wait_for_function('!hub._placements.has("items[2]")')
        self.assert_visible_unique_cells(2)
        self.capture('docs-dynamic-hub')
    def test_docs_control_light(self):
        self.control_example('control-light.yaml')
        launcher=self.page.locator('#anchor .interaction-surface');self.assertEqual(launcher.evaluate('(el)=>el.getBoundingClientRect().width'),82)
        self.hold_input(launcher)
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")?.buttons?.length===6')
        # DOM ring indices are zero-based: physical preset slot 2 is data slot 1.
        preset=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="1"] .interaction-surface')
        self.activate(preset);self.assertEqual(self.page.evaluate('calls.at(-1)'),['light','turn_on',{'brightness_pct':60},{'entity_id':'light.zone_a'}])
        self.hold_input(preset);self.assertEqual(self.page.evaluate('calls.at(-1)'),['number','set_value',{'value':50},{'entity_id':'number.relay_a_brightness'}])
        color=self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="3"] .interaction-surface')
        self.hold_input(color);self.assertEqual(self.page.evaluate('calls.slice(-2).map(c=>c[0])'),['input_number','input_number'])
        self.capture('docs-control-light')
    def test_docs_kelvin_example(self):
        self.control_example('kelvin-light.yaml')
        self.hold_input(self.page.locator('#anchor .interaction-surface'));self.settle()
        self.zoom_tap(3);self.settle()
        original=self.kelvin_palette();self.assertEqual((original[0],original[-1]),(1800,6535))
        self.assertEqual(self.sonos_slot(7).locator('ha-icon,.primary,.secondary').count(),0)
        self.hold_input(self.zoom_cell(8));self.settle();self.assertEqual(self.kelvin_palette()[1],original[1])
        self.assertEqual(self.page.evaluate('calls.length'),0)
        self.zoom_tap(8);self.assertEqual(self.page.evaluate('calls.at(-1)'),['light','turn_on',{'color_temp_kelvin':original[1]},{'entity_id':'light.white_a'}])
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .center-item .interaction-surface'));self.settle();self.assertEqual(self.kelvin_palette(),original)
        self.capture('docs-kelvin-control')
    def test_docs_sonos(self):
        self.hub(self.examples['sonos.yaml']);self.assert_visible_unique_cells(1)
        self.hold_input(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) .interaction-surface'))
        self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Join"]'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="6"] .interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['script','player_a_toggle_member',{'member':'media_player.player_b'},{}])
        self.back();self.page.wait_for_function('hub._menuContext.stack.length===1')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [aria-label="Radio"]'))
        self.page.wait_for_function('hub._menuContext.stack.length===2')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="6"] .interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['media_player','play_media',{'media_content_id':'favorite_a','media_content_type':'favorite_item_id'},{'entity_id':'media_player.player_a'}])
        self.capture('docs-sonos')
    def test_docs_onoff_light(self):
        self.control_example('onoff-light.yaml')
        launcher=self.page.locator('#anchor .interaction-surface')
        self.activate(launcher);self.hold_input(launcher)
        self.assertEqual(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu)').count(),0)
        self.assertEqual(self.page.evaluate('calls[0]'),['homeassistant','toggle',{}, {'entity_id':'light.switch_a'}])
        self.capture('docs-onoff')
    def test_docs_classic_popup(self):
        config=self.examples['classic-popup.yaml']
        self.page.evaluate('config=>{const el=document.createElement("button");el.textContent="Light A";el.style.cssText="position:absolute;left:120px;top:280px";el.addEventListener("click",()=>el.dispatchEvent(new CustomEvent("ll-custom",{detail:config.hold_action,bubbles:true,composed:true})));document.body.append(el);}',config)
        self.activate(self.page.locator('button',has_text='Light A'))
        self.page.wait_for_function('view.querySelector(":is(honeycomb-menu-ng,honeycomb-menu)")')
        self.activate(self.page.locator(':is(honeycomb-menu-ng,honeycomb-menu) [data-honeycomb-slot="0"] .interaction-surface'))
        self.assertEqual(self.page.evaluate('calls.at(-1)'),['light','turn_on',{}, {'entity_id':'light.zone_a'}])
        self.capture('docs-classic')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',type=Path,required=True);parser.add_argument('--button-card',type=Path,required=True)
    parser.add_argument('--evidence-dir',type=Path,required=True);args=parser.parse_args()
    os.chdir(ROOT);args.evidence_dir.mkdir(parents=True,exist_ok=True)
    examples={p.name:load(p.read_text()) for p in sorted((ROOT/'examples/v1.7').glob('*.yaml'))}
    cards=[{'source':f'examples/v1.7/{name}','config':config} for name,config in examples.items()]
    for name in ('persistent-hub.yaml','light-presets.yaml','presentation-light.yaml','sonos-native-favorites.yaml','energy-wave.yaml','energy-wave-power.yaml','energy-wave-color.yaml'):
        cards.append({'source':f'examples/{name}','config':load((ROOT/'examples'/name).read_text())})
    for name,count in [('charger-easee.yaml',1),('charger-multi.yaml',2)]:
        dashboard=load((ROOT/'examples'/name).read_text())
        assert dashboard['views'][0]['panel'] is True
        picture=dashboard['views'][0]['cards'][0]
        assert picture['type']=='picture-elements' and picture['image'].startswith('data:image/svg+xml,')
        hub=picture['elements'][0]
        assert len(hub['items'])==count+1 and hub['items'][0]['type']=='charging-hub'
        assert len(hub['items'][0]['chargers'])==count
        assert all(a=={k:v for k,v in b.items() if k!='slot'} for a,b in zip(hub['items'][0]['chargers'],hub['items'][1:]))
        cards.append({'source':f'examples/{name} (complete dashboard)','config':hub})
    for i,element in enumerate(load((ROOT/'examples/charger-elements.yaml').read_text())):
        cards.append({'source':f'examples/charger-elements.yaml element {i}','config':element})
    yaml_count=0
    for file in [ROOT/'README.md',*sorted((ROOT/'docs').glob('*.md'))]:
        for index,block in enumerate(blocks(file.read_text())):
            config=load(block);yaml_count+=1
            source=f'{file.name} YAML {index+1}'
            if isinstance(config,dict) and config.get('type','').startswith(('custom:honeycomb','button')):
                cards.append({'source':source,'config':config})
            else:
                contextual=fragment(config,source)
                if contextual:cards.append({'source':source+' (reference context)','config':contextual})
    guide=(ROOT/'docs/AI_SETUP.md').read_text()
    for name,config in examples.items():
        embedded=guide.split(f'<!-- example:{name} -->')[1]
        assert load(blocks(embedded)[0])==config,f'AI guide drift: {name}'
    for example in cards:card(example['config'],example['source'])
    # The example checker must reject unsupported fields instead of silently ignoring them.
    for key in ('visible_when','placement','onoff','menu_size'):
        invalid={**examples['control-light.yaml'],key:True}
        try:card(invalid,'negative schema check')
        except AssertionError:pass
        else:raise AssertionError(f'Accepted unsupported key {key}')
    external_recipes()
    link_count=links()
    payload={'cards':cards,'examples':examples,'states':STATES}
    with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as output:
        json.dump(payload,output);output.flush()
        subprocess.run(['node','test/docs/contracts.js',output.name],check=True)
    complete=sum('(reference context)' not in card['source'] for card in cards)
    print(f'Documentation validation: {yaml_count} YAML blocks parsed, {complete} complete cards + {len(cards)-complete} contextual fragments checked, {link_count} local links/anchors resolved, optional Join Jinja exercised; native-only favorites contract checked',flush=True)
    table=(ROOT/'README.md').read_text().split('<!-- auto-slots:start -->')[1].split('<!-- auto-slots:end -->')[0]
    Examples.auto=[]
    for count,without,with_logo in re.findall(r'^\| (\d+) \| `([\d,]+)` \| ([^\n]+)',table,re.M):
        Examples.auto.append((int(count),list(map(int,without.split(','))),list(map(int,with_logo.split('`')[1].split(','))) if with_logo.startswith('`') else None))
    assert len(Examples.auto)==7
    assert hashlib.sha256(args.button_card.read_bytes()).hexdigest()==BROWSER.BUTTON_SHA
    server=ThreadingHTTPServer(('127.0.0.1',0),BROWSER.Handler);server.bundle=args.bundle.resolve();server.button=args.button_card.resolve()
    threading.Thread(target=server.serve_forever,daemon=True).start();success=True
    try:
        with sync_playwright() as p:
            Examples.browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
            Examples.url=f'http://127.0.0.1:{server.server_port}';Examples.evidence=args.evidence_dir;Examples.examples=examples
            for width,height in [(1100,900),(390,844)]:
                Examples.viewport={'width':width,'height':height}
                names=[name for name in unittest.defaultTestLoader.getTestCaseNames(Examples) if name.startswith('test_docs_')]
                result=unittest.TextTestRunner(verbosity=2,resultclass=BROWSER.CheckResult).run(unittest.TestSuite(Examples(name) for name in names));success=result.wasSuccessful() and success
            Examples.browser.close()
    finally:server.shutdown();server.server_close()
    report={'passed':success,'yaml_blocks':yaml_count,'complete_cards':complete,'contextual_fragments':len(cards)-complete,'local_links':link_count,'canonical_browser_checks':12}
    (args.evidence_dir/'documentation-results.json').write_text(json.dumps(report,indent=2)+'\n')
    return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
