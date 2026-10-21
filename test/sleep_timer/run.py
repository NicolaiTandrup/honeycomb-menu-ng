"""Execute the shipped HA package's actual YAML/Jinja against a deterministic HA
service/state contract. This is NOT a running HA integration or hardware test.
"""
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
import unittest
import yaml
from jinja2.nativetypes import NativeEnvironment

ROOT=Path(__file__).resolve().parents[2]
SOURCE=(ROOT/'examples/packages/sonos-sleep-a.yaml').read_text()
class Halt(Exception): pass
class Rejected(Exception): pass

def from_json(value,default=None):
    try:return json.loads(value)
    except (ValueError,TypeError):return default

class HA:
    def __init__(self,two=False,source=SOURCE):
        self.time=1800000000;self.calls=[];self.events=[];self.packages={}
        self.states={}
        for suffix,group in [('a',['a','b']),('b',['a','b']),('c',['c','d']),('d',['c','d'])]:
            self.states['media_player.player_'+suffix]={'state':'playing','attributes':{'group_members':['media_player.player_'+s for s in group],'supported_features':1}}
        for suffix in (['a','c'] if two else ['a']):
            package=yaml.safe_load(source.replace('sonos_sleep_deadline_a','sonos_sleep_deadline_'+suffix).replace('sonos_sleep_a','sonos_sleep_'+suffix).replace('media_player.player_a','media_player.player_'+suffix));self.packages[suffix]=package
            for entity,config in package['input_text'].items():self.states['input_text.'+entity]={'state':config['initial'],'attributes':{}}
            for entity in package['script']:self.states['script.'+entity]={'state':'off','attributes':{}}
            for entity in package['input_datetime']:self.states['input_datetime.'+entity]={'state':'2027-01-15 08:00:00','attributes':{'timestamp':0,'has_date':True,'has_time':True}}
        self.env=NativeEnvironment()
        self.env.filters.update(from_json=from_json,to_json=lambda v:json.dumps(v,separators=(',',':')),sha256=lambda v:hashlib.sha256(v.encode()).hexdigest(),bitwise_and=lambda a,b:int(a)&int(b))
        self.env.globals.update(states=lambda e:self.states.get(e,{}).get('state','unknown'),state_attr=lambda e,k:self.states.get(e,{}).get('attributes',{}).get(k),
            is_state=lambda e,s:self.states.get(e,{}).get('state')==s,has_value=lambda e:self.states.get(e,{}).get('state') not in (None,'unknown','unavailable'),
            integration_entities=lambda domain:[e for e in self.states if e.startswith('media_player.')] if domain=='sonos' else [],
            now=lambda:datetime.fromtimestamp(self.time,timezone.utc),as_timestamp=lambda dt:dt.timestamp())
    def render(self,value,context):
        if isinstance(value,str):return self.env.from_string(value).render(**context)
        if isinstance(value,dict):return {k:self.render(v,context) for k,v in value.items()}
        if isinstance(value,list):return [self.render(v,context) for v in value]
        return value
    def condition(self,value,context):
        if isinstance(value,dict):
            assert value['condition']=='template';value=value['value_template']
        return self.render(value,context) is True
    def execute(self,steps,context):
        for step in steps:
            if 'variables' in step:
                for k,v in step['variables'].items():context[k]=self.render(v,context)
            elif 'if' in step:
                if self.condition(step['if'],context):self.execute(step['then'],context)
            elif 'choose' in step:
                for option in step['choose']:
                    if self.condition(option['conditions'],context):self.execute(option['sequence'],context);break
            elif 'condition' in step:
                if not self.condition(step,context):raise Halt()
            elif 'wait_template' in step:
                assert step['timeout']=='00:00:05' and step['continue_on_timeout'] is True
                if not self.condition(step['wait_template'],context):self.time+=5
            elif 'stop' in step:
                if step.get('error'):raise Rejected(step['stop'])
                raise Halt()
            elif 'action' in step:
                service=step['action'];data=self.render(step.get('data',{}),context);target=self.render(step.get('target',{}),context)
                if service.startswith('script.'):
                    suffix=service.rsplit('_',1)[1];self.command(suffix,**data);continue
                if service=='media_player.media_pause' and getattr(self,'fail_pause',False):
                    assert step.get('continue_on_error') is True;continue
                self.calls.append((service,copy.deepcopy(data),copy.deepcopy(target)))
                entity=target['entity_id']
                if service=='input_text.set_value':
                    assert isinstance(data['value'],str) and len(data['value'])<=255
                    self.change(entity,data['value'],{})
                elif service=='input_datetime.set_datetime':self.change(entity,str(data['timestamp']),{'timestamp':data['timestamp'],'has_date':True,'has_time':True})
                elif service=='media_player.media_pause':
                    assert entity.startswith('media_player.')
                    for member in self.states[entity]['attributes']['group_members']:self.change(member,'paused',self.states[member]['attributes'])
                else:raise AssertionError('Unverified HA service '+service)
            else:raise AssertionError(step)
    def command(self,suffix='a',**fields):
        script=self.packages[suffix]['script']['sonos_sleep_'+suffix]
        assert script['mode']=='queued'
        context=dict(fields)
        try:self.execute(script['sequence'],context)
        except Halt:pass
    def request(self,operation,minutes=0,suffix='a',**extra):
        self.command(suffix,operation=operation,minutes=minutes,player='media_player.player_'+suffix,**extra)
    def record(self,suffix='a'):return json.loads(self.states['input_text.sonos_sleep_'+suffix]['state'][4:])
    def change(self,entity,state,attributes):
        old=copy.deepcopy(self.states.get(entity));new={'state':state,'attributes':copy.deepcopy(attributes)};self.states[entity]=new
        self.events.append(SimpleNamespace(id='state',event=SimpleNamespace(time_fired=datetime.fromtimestamp(self.time,timezone.utc),data=SimpleNamespace(entity_id=entity,old_state=SimpleNamespace(**old) if old else None,new_state=SimpleNamespace(**copy.deepcopy(new))))))
    def trigger(self,suffix,trigger):
        automation=self.packages[suffix]['automation'][0];assert automation['mode']=='queued'
        context={'trigger':trigger}
        for k,v in automation['variables'].items():context[k]=self.render(v,context)
        if all(self.condition(c,context) for c in automation['conditions']):
            try:self.execute(automation['actions'],context)
            except Halt:pass
    def drain(self):
        iterations=0
        while self.events:
            trigger=self.events.pop(0)
            for suffix in self.packages:self.trigger(suffix,trigger)
            iterations+=1;assert iterations<1000,'No helper feedback loop'
    def tick(self,seconds=0):
        self.time+=seconds
        for suffix in self.packages:self.trigger(suffix,SimpleNamespace(id='due'))
        self.drain()
    def restart(self):
        for suffix,package in self.packages.items():
            for entity,config in package['input_text'].items():self.change('input_text.'+entity,config['initial'],{})
            self.trigger(suffix,SimpleNamespace(id='restart'))
        self.drain()
    def pauses(self):return [call for call in self.calls if call[0]=='media_player.media_pause']

class PackageTests(unittest.TestCase):
    def test_supported_actions_schema_and_no_browser_or_hardware_timer(self):
        package=yaml.safe_load(SOURCE)
        self.assertEqual(set(package),{'input_text','input_datetime','script','automation'})
        self.assertEqual(package['input_text']['sonos_sleep_a']['max'],255)
        self.assertIn('restart_cancelled',package['input_text']['sonos_sleep_a']['initial'])
        self.assertNotIn('delay:',SOURCE);self.assertNotIn('action: sonos.',SOURCE)
        triggers=package['automation'][0]['triggers'];self.assertTrue(any(t['trigger']=='time' for t in triggers));self.assertTrue(any(t['trigger']=='homeassistant' for t in triggers))
    def test_all_choices_pause_only_same_group_at_server_deadline(self):
        for minutes in [15,30,45,60,90]:
            ha=HA();ha.request('start',minutes);ha.drain();self.assertEqual(ha.record()['m'],minutes)
            ha.tick(minutes*60-1);self.assertEqual(ha.pauses(),[])
            ha.tick(1);self.assertEqual(ha.record()['s'],'expired');self.assertEqual(len(ha.pauses()),1)
            self.assertEqual(ha.pauses()[0][2],{'entity_id':'media_player.player_a'})
            self.assertEqual(ha.states['media_player.player_b']['state'],'paused');self.assertEqual(ha.states['media_player.player_c']['state'],'playing')
            ha.tick(60);self.assertEqual(len(ha.pauses()),1)
    def test_reselect_cancel_stale_expiry_and_queue_order(self):
        ha=HA();ha.request('start',15);old=ha.record()['e'];ha.tick(10);ha.request('start',30);new=ha.record()['e'];self.assertGreater(new,old)
        ha.time=old;ha.request('expire',expected_end=old);self.assertEqual(ha.record()['e'],new);self.assertEqual(ha.pauses(),[])
        ha.request('cancel');ha.time=new;ha.request('expire',expected_end=new);self.assertEqual(ha.pauses(),[])
        ha.request('start',45);ha.request('cancel');ha.request('start',60);ha.drain();self.assertEqual(ha.record()['m'],60)
    def test_browser_absence_changes_nothing_and_restart_cancels_safely(self):
        ha=HA();ha.request('start',15);snapshot=copy.deepcopy(ha.states)
        # New tabs/reloaded browsers read this persisted state; no browser owns a job.
        self.assertEqual(ha.states,snapshot);ha.tick(60);self.assertEqual(ha.record()['s'],'running')
        ha.restart();self.assertEqual(ha.record()['s'],'restart_cancelled');ha.tick(3600);self.assertEqual(ha.pauses(),[])
    def test_independent_instances_and_wrong_script_scope(self):
        ha=HA(two=True);ha.request('start',15);ha.request('start',30,suffix='c');other=copy.deepcopy(ha.record('c'))
        with self.assertRaises(Rejected):ha.command('a',operation='cancel',player='media_player.player_c')
        self.assertEqual(ha.record('c'),other);ha.request('cancel');ha.tick(1800)
        self.assertEqual([p[2]['entity_id'] for p in ha.pauses()],['media_player.player_c']);self.assertEqual(ha.states['media_player.player_a']['state'],'playing')
    def test_group_leave_rejoin_even_before_event_processing_cancels(self):
        ha=HA();ha.request('start',15);ha.drain()
        original=copy.deepcopy(ha.states['media_player.player_b']['attributes'])
        ha.change('media_player.player_b','playing',{'group_members':['media_player.player_b'],'supported_features':1})
        ha.change('media_player.player_b','playing',original);ha.drain()
        self.assertEqual(ha.record()['s'],'group_changed');ha.tick(900);self.assertEqual(ha.pauses(),[])
    def test_group_event_queued_before_rearm_cannot_cancel_the_new_timer(self):
        ha=HA();ha.request('start',15);ha.drain()
        before=copy.deepcopy(ha.states['media_player.player_b']['attributes'])
        ha.change('media_player.player_b','playing',{'group_members':['media_player.player_b'],'supported_features':1})
        ha.change('media_player.player_b','playing',before)
        ha.time+=1;ha.request('start',30);ha.drain()
        self.assertEqual(ha.record()['s'],'running');self.assertEqual(ha.record()['m'],30)
    def test_group_join_coordinator_move_unavailability_and_inconsistent_metadata(self):
        changes=[('media_player.player_a',{'group_members':['media_player.player_a','media_player.player_b','media_player.player_c'],'supported_features':1},'playing'),
                 ('media_player.player_a',{'group_members':['media_player.player_b','media_player.player_a'],'supported_features':1},'playing'),
                 ('media_player.player_b',{'group_members':['media_player.player_a','media_player.player_b'],'supported_features':1},'unavailable')]
        for entity,attrs,state in changes:
            ha=HA();ha.request('start',15);ha.drain();ha.change(entity,state,attrs);ha.drain();ha.tick(900);self.assertEqual(ha.pauses(),[]);self.assertEqual(ha.record()['s'],'group_changed')
        ha=HA();ha.request('start',15);ha.states['media_player.player_b']['attributes']['group_members']=['media_player.player_b'];ha.tick(900);self.assertEqual(ha.pauses(),[])
    def test_invalid_start_no_playback_pause_support_and_too_long_identifier(self):
        for minutes in [0,1,120,-1]:
            ha=HA()
            with self.assertRaises(Rejected):ha.request('start',minutes)
            self.assertNotEqual(ha.record()['s'],'running')
        for state,feature in [('unavailable',1),('paused',1),('playing',0)]:
            ha=HA();ha.states['media_player.player_a']['state']=state;ha.states['media_player.player_a']['attributes']['supported_features']=feature
            with self.assertRaises(Rejected):ha.request('start',15)
            self.assertEqual(ha.pauses(),[])
    def test_failed_pause_is_reported_and_never_retried_against_later_playback(self):
        ha=HA();ha.request('start',15);ha.fail_pause=True;ha.tick(900)
        self.assertEqual(ha.record()['s'],'action_failed');self.assertEqual(ha.pauses(),[])
        ha.fail_pause=False;ha.tick(60);self.assertEqual(ha.pauses(),[])
    def test_interrupted_reselect_disarms_before_partial_deadline_write(self):
        ha=HA();ha.request('start',15);original=ha.change
        def fail(entity,state,attrs):
            if entity.startswith('input_datetime.'):raise RuntimeError('synthetic service failure')
            original(entity,state,attrs)
        ha.change=fail
        with self.assertRaises(RuntimeError):ha.request('start',30)
        ha.change=original;ha.tick(1800);self.assertEqual(ha.record()['s'],'off');self.assertEqual(ha.pauses(),[])
    def test_long_selected_identifier_fails_before_arming(self):
        selected='media_player.'+'p'*120
        ha=HA(source=SOURCE.replace('media_player.player_a',selected))
        members=[selected,'media_player.player_b']
        ha.states[selected]={'state':'playing','attributes':{'group_members':members,'supported_features':1}}
        ha.states['media_player.player_b']['attributes']['group_members']=members
        with self.assertRaisesRegex(Rejected,'capacity'):
            ha.command('a',operation='start',minutes=15,player=selected)
        self.assertEqual(ha.record()['s'],'restart_cancelled');self.assertEqual(ha.pauses(),[])
    def test_paused_at_expiry_no_action_and_missed_scheduler_tick(self):
        ha=HA();ha.request('start',15);ha.drain();ha.change('media_player.player_a','paused',ha.states['media_player.player_a']['attributes']);ha.drain();ha.tick(900)
        self.assertEqual(ha.record()['s'],'expired');self.assertEqual(ha.pauses(),[])
        ha=HA();ha.request('start',15);ha.time+=920;ha.tick();self.assertEqual(len(ha.pauses()),1)

if __name__=='__main__':unittest.main(verbosity=2)
