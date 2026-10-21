"""Native service/device contract model; NOT a running HA/Sonos integration.
The independent clock demonstrates the intended device ownership boundary only.
Real HA restart and Sonos regroup/expiry behavior require owner hardware testing.
"""
import unittest

class HA:
    def __init__(self):
        self.time=1800000000;self.calls=[];self.timers={};self.online=True;self.fail=False
        self.states={}
        for suffix,group in [('a',['a','b']),('b',['a','b']),('c',['c','d']),('d',['c','d'])]:
            self.states['media_player.player_'+suffix]={'state':'playing','attributes':{
                'group_members':['media_player.player_'+s for s in group], 'supported_features':524289,
                'volume_level':.02,'media_content_id':'favorite_a'}}
        self.states['sensor.favorites']={'state':'1','attributes':{'items':{'favorite_a':'Station A'}}}
        self.states['sensor.favorites_cache']={'state':'1','attributes':{'items':[{'media_content_id':'favorite_a','thumbnail':'/station-a.svg'}]}}
    def service(self,service,data,target):
        if not self.online or self.fail:raise RuntimeError('synthetic Sonos service failure')
        player=target['entity_id'];coordinator=self.states[player]['attributes']['group_members'][0]
        self.calls.append((service,data.copy(),target.copy()))
        if service=='set_sleep_timer':
            assert set(data)=={'sleep_time'} and type(data['sleep_time']) is int and 0<=data['sleep_time']<=7200
            self.timers[coordinator]=self.time+data['sleep_time']
        elif service=='clear_sleep_timer':
            assert data=={};self.timers.pop(coordinator,None)
        else:raise AssertionError('unexpected service')
    def tick(self,seconds):
        self.time+=seconds
        for player,end in list(self.timers.items()):
            if end<=self.time:
                del self.timers[player]
                # Contract model: current device group, not a HA snapshot automation.
                for member in self.states[player]['attributes']['group_members']:self.states[member]['state']='paused'
    def restart(self):
        self.online=False;self.online=True

class NativeContracts(unittest.TestCase):
    def test_seconds_contract_and_no_helpers(self):
        ha=HA()
        for minutes in [15,30,45,60,90]:
            ha.service('set_sleep_timer',{'sleep_time':minutes*60},{'entity_id':'media_player.player_a'})
            self.assertEqual(ha.timers['media_player.player_a'],ha.time+minutes*60)
        self.assertFalse(any(not e.startswith(('media_player.','sensor.')) for e in ha.states))
    def test_countdown_does_not_require_browser_or_ha_uptime(self):
        ha=HA();ha.service('set_sleep_timer',{'sleep_time':900},{'entity_id':'media_player.player_a'})
        ha.online=False;ha.tick(900)
        self.assertEqual(ha.states['media_player.player_a']['state'],'paused')
        self.assertEqual(ha.states['media_player.player_b']['state'],'paused')
        self.assertEqual(ha.states['media_player.player_c']['state'],'playing')
    def test_ha_restart_does_not_clear_device(self):
        ha=HA();ha.service('set_sleep_timer',{'sleep_time':1800},{'entity_id':'media_player.player_a'})
        before=ha.timers.copy();ha.restart();self.assertEqual(ha.timers,before)
        self.assertEqual(len(ha.calls),1)
    def test_cancel_is_scoped_and_does_not_stop_playback(self):
        ha=HA()
        for suffix in ['a','c']:ha.service('set_sleep_timer',{'sleep_time':900},{'entity_id':'media_player.player_'+suffix})
        ha.service('clear_sleep_timer',{}, {'entity_id':'media_player.player_a'})
        self.assertEqual(list(ha.timers),['media_player.player_c']);ha.tick(900)
        self.assertEqual(ha.states['media_player.player_a']['state'],'playing')
        self.assertEqual(ha.states['media_player.player_c']['state'],'paused')
    def test_native_follower_redirect_and_current_group_expectation(self):
        ha=HA();ha.service('set_sleep_timer',{'sleep_time':900},{'entity_id':'media_player.player_b'})
        self.assertEqual(list(ha.timers),['media_player.player_a'])
        ha.states['media_player.player_a']['attributes']['group_members']=['media_player.player_a']
        ha.states['media_player.player_b']['attributes']['group_members']=['media_player.player_b']
        ha.tick(900);self.assertEqual(ha.states['media_player.player_b']['state'],'playing')
    def test_device_failure_does_not_synthesize_timer_state(self):
        ha=HA();ha.fail=True
        with self.assertRaises(RuntimeError):ha.service('set_sleep_timer',{'sleep_time':900},{'entity_id':'media_player.player_a'})
        self.assertEqual(ha.timers,{})

if __name__=='__main__':unittest.main(verbosity=2)
