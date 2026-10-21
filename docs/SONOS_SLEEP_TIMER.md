# Native Sonos Sleep Timer — v1.7.1-beta.6 and later

Sonos slot 4 opens Honeycomb choices **15, 30, 45, 60, 90 minutes and Cancel/OFF**
(outer menu slots 7–12). Center Back returns one level. No HA helper, script,
automation, package import or additional integration is needed. The selected
entity must belong to the **official Home Assistant Sonos integration** and its
Sonos actions must be available. Radio's optional favorites/cache setup is unchanged.

Published beta.6 replaces the rejected helper design in the unpublished beta.5.
Beta.5's existing tag, draft and assets stay unchanged; do not install or publish
that draft as the native implementation. Beta.7 retains this native implementation. New beta publication requires an
unused tag, owner authorization and every existing publisher safety gate.

## Supported API and device ownership

- [`sonos.set_sleep_timer`](https://www.home-assistant.io/actions/sonos.set_sleep_timer/):
  `sleep_time` is an integer **in seconds**, with Honeycomb enforcing **0–7200**.
  The five choices send 900, 1800, 2700, 3600 or 5400 seconds. Cancel always uses
  [`sonos.clear_sleep_timer`](https://www.home-assistant.io/actions/sonos.clear_sleep_timer/),
  with no duration, rather than assuming zero means OFF.
- Both calls explicitly target the selected group's current coordinator using
  `target.entity_id`. No broadcast/all-player target and no frontend pause/stop
  action is issued, on expiration or otherwise.
- HA's [Sonos player implementation](https://github.com/home-assistant/core/blob/7bbe85e4bc62bb76e180610f0e8821edb8b3c4c3/homeassistant/components/sonos/media_player.py)
  forwards these actions to `self.coordinator.soco.set_sleep_timer(seconds)` or
  `set_sleep_timer(None)`. The **speaker owns the countdown and expiration**.
- HA's [service definitions](https://github.com/home-assistant/core/blob/7bbe85e4bc62bb76e180610f0e8821edb8b3c4c3/homeassistant/components/sonos/services.yaml)
  expose a 7200-second selector limit. Its Python registration currently permits
  a larger range; Honeycomb deliberately keeps the documented two-hour ceiling.
- No supported standard HA Sonos remaining-time attribute, sensor or readback
  action was found in the audited integration. Honeycomb does not invent one or
  call an undocumented WebSocket/device endpoint.

A complete minimal dashboard example (replace the synthetic entity with yours):

```yaml
type: custom:honeycomb-persistent-hub
logo: false
items:
  - type: sonos
    entity: media_player.player_a
    name: Speaker A
```

There is **no `sleep_timer` configuration object** in this version. The obsolete
beta.5 helper recipe is removed from the current source tree, remaining in Git
history. If you installed it while testing the unpublished draft, disable that
old automation yourself before testing native Sleep so it cannot later pause a
speaker unexpectedly. Honeycomb does not modify or delete your HA configuration.

## Groups, errors and cancellation

Every tap resolves the coordinator again from live `group_members[0]` and verifies
that all reported members agree on the coordinator/member set and are available.
A follower therefore targets its leader. Missing, conflicting or malformed group
metadata disables commands instead of guessing. Setting requires active playback;
Cancel remains available for a consistent paused/stopped group. Missing native
services disable the corresponding choice; no helper installation is suggested.

A timer belongs to the coordinator **device**, not a saved Honeycomb membership
snapshot. Sonos controls what happens if rooms join, leave or elect a new leader.
Honeycomb does not promise automatic group-change cancellation or exact membership
at future expiry. A group change invalidates its estimate and never sends an
extra set/clear/pause command. Cancel targets the selected speaker's **current**
coordinator; if that speaker moved, it does not cancel the former group's timer.
To cancel the old timer, select a speaker still in that old group or use Sonos.
Multiple cubes for one coordinator control the same native timer, not independent
jobs. Distinct coordinators have separate targets.

Pending choices show **Sending…**, suppress duplicate requests to the same leader
in this client, and keep Back usable. Failed/timed-out commands show a notification
and **Check device**: a timed-out action might already have reached the speaker.
Honeycomb neither retries playback nor claims the device timer is OFF. Resolve
connectivity, inspect Sonos, and deliberately retry or Cancel if needed.

## Display estimate versus device timer status

| Display | Meaning |
| --- | --- |
| Status unknown | HA provides no authoritative timer status; this client has no usable estimate. It does **not** mean OFF. |
| Est. 30 min | This browser received a successful set acknowledgement; time remaining is locally estimated from send time. |
| Cancel sent | HA acknowledged the clear action. This is not a live device-state readback. |
| Check device | Estimated time elapsed, or a request failed/timed out. Expiration/cancellation is not confirmed. |
| HA offline / Group unknown / Sonos unavailable | Commands cannot safely be sent with current connectivity, group or service information. |

The estimate exists only in memory, scoped to this connection/coordinator/group.
It clears on reload, HA disconnect/reconnect or an observed group change. Another
client, the Sonos app or another automation can change the timer without Honeycomb
knowing; the estimate never becomes authoritative. Other dashboards show unknown
unless they sent a command themselves. This is an explicit limitation of the
supported API, not shared multi-client timer synchronization.

Minute refreshes change text only. Reaching zero does not send HA actions or mark
the timer OFF. Closing/reloading the dashboard never starts, cancels or expires a
timer. **An HA restart should leave the speaker's countdown running while that
speaker stays powered and operating**, because HA does not own it. This expectation
needs physical HA/Sonos verification. Speaker reboot/power loss, external commands
and native regrouping behavior are not guaranteed by Honeycomb.

## Verification boundaries and owner HA checklist

Unit/service payload tests and desktop/mobile Chromium regressions cover native
calls, followers/coordinators, group changes, missing services, cancel, errors,
Back and honest estimate labels. A separate device-boundary contract model keeps
its clock outside the browser/HA mock. **It is not real HA Core or Sonos hardware**
and does not prove vendor regroup/restart/expiry behavior.

After an approved beta.6 is published:

1. Confirm HA offers both native Sonos actions. No new helpers/scripts should be
   necessary. Check all five durations and Cancel on a coordinator and follower.
2. Set 15 minutes, close every dashboard, and verify native expiry on Sonos while
   an unrelated group continues playing. Reload during a second run: UI must show
   Status unknown without canceling/restarting the actual device timer.
3. Restart HA during an active timer while keeping Sonos powered. Verify the
   countdown still expires on the device; after reconnect Honeycomb shows unknown.
4. Move the selected follower to another group. Check native behavior in Sonos;
   Cancel must target the new current leader, leaving the old leader's timer alone.
5. Check two dashboards and an external Sonos-app timer change: estimates are
   explicitly local, never represented as synchronized device status.
6. Check clear/set failures, paused cancellation, unsupported service and unavailable
   or inconsistent group states. Back must work during and after errors.
7. Recheck station recognition/cache/order/playback, 0/2/42/100% artwork labels,
   playing versus paused logo sizes, repeated Join → Back and recursive Light Zoom.

No stable publication or master merge without owner approval after real HA tests.
