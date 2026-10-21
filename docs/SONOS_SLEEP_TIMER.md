# Sonos Sleep Timer — v1.7.1-beta.5

Slot **4 Sleep** opens a native Honeycomb submenu: **15, 30, 45, 60, 90 minutes,
Cancel / OFF** in outer menu slots **7–12**. The inner menu controls remain visible;
the promoted center cube returns exactly one level with Back. No HA page opens.
Radio, Play/Pause, Join and volume remain at 1, 2, 3, 5 and 6.

**Optional HA server setup is required. HACS installs only frontend JavaScript.**
Without setup the Sleep submenu says **Setup required** and disables timer actions;
other Sonos controls keep working. This is not a browser-only countdown.

## Verified mechanism and scope

Current HA Sonos really registers `sonos.set_sleep_timer` / `sonos.clear_sleep_timer`
and delegates to the coordinator's hardware timer. However, its public sensor
implementation does not expose a corresponding remaining-time entity, and that
hardware coordinator can change groups. Honeycomb does **not** arm an unobservable
hardware timer and pretend to synchronize its state across dashboards.

The optional [HA package](../examples/packages/sonos-sleep-a.yaml) uses supported
`input_text.set_value`, `input_datetime.set_datetime`, time/state/event automations,
queued scripts and `media_player.media_pause`. It needs **two helpers, one script
and one automation per selected player**. HA owns the deadline and expiry; the
browser only displays remaining minutes from the server's UTC deadline.

Source audit: HA Core commit `f87ac4bdcadf4fea60eca688db604ac3f9215c6b`:
[Sonos services](https://github.com/home-assistant/core/blob/f87ac4bdcadf4fea60eca688db604ac3f9215c6b/homeassistant/components/sonos/services.py),
[coordinator methods](https://github.com/home-assistant/core/blob/f87ac4bdcadf4fea60eca688db604ac3f9215c6b/homeassistant/components/sonos/media_player.py),
[sensors](https://github.com/home-assistant/core/blob/f87ac4bdcadf4fea60eca688db604ac3f9215c6b/homeassistant/components/sonos/sensor.py),
[SHA256 template filter](https://github.com/home-assistant/core/blob/f87ac4bdcadf4fea60eca688db604ac3f9215c6b/homeassistant/helpers/template/extensions/crypto.py).
Do not invent another Sonos timer action or add a Spotify dependency.

## Install in Home Assistant

1. Enable HA packages if not already enabled; merge into the existing
   `homeassistant:` section rather than creating a duplicate:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

2. Copy [sonos-sleep-a.yaml](../examples/packages/sonos-sleep-a.yaml) to
   `/config/packages/sonos-sleep-a.yaml`. Change **`media_player.player_a`** to the
   selected, registry-confirmed Sonos player. It may be a follower; HA resolves its
   reciprocally verified current coordinator. Do not change template function names.
3. For another independent instance, copy the package and consistently rename
   `sonos_sleep_a`, `sonos_sleep_deadline_a`, the automation ID and the selected
   `media_player.player_a`. Never reuse helper/script IDs for different players.
   Do not perform a blanket `_a` replacement: that would corrupt `state_attr`.
4. Run HA's configuration check, then restart HA to load the package. Verify:
   `input_text.sonos_sleep_a`, `input_datetime.sonos_sleep_deadline_a`,
   `script.sonos_sleep_a`, and automation `honeycomb_sonos_sleep_a`. The deadline
   helper must include both date and time; keep the automation enabled.
5. Configure the frontend references below. Existing favorites/cache YAML stays
   unchanged. Reuse the same three references across dashboards for one timer.

```yaml
type: custom:honeycomb-persistent-hub
name: Audio Hub A
size: 82
logo: false
items:
  - type: sonos
    entity: media_player.player_a
    favorites_sensor: sensor.favorites_a
    favorites_cache_sensor: sensor.favorites_cache_a
    sleep_timer:
      state: input_text.sonos_sleep_a
      deadline: input_datetime.sonos_sleep_deadline_a
      script: script.sonos_sleep_a
```

The script is fixed to one selected player and rejects a mismatched `player`;
it never accepts an arbitrary target from the browser. Start requires available,
registry-confirmed Sonos group members, reciprocal membership and playing playback
with pause support. Missing helpers/scripts show **Setup unavailable**; invalid
protocol/player pairing shows **Check setup**. Cancel remains available when a
configured timer's player becomes unavailable. There is no automatic helper creation.

## Group, persistence and restart rules

- **Arm:** capture the current coordinator and membership as a canonical SHA256
  fingerprint, with a persisted UTC deadline, duration and arm timestamp. Re-select
  a duration to restart from now; durations are not added together. Queued commands
  serialize requests from different clients; older expiry tokens cannot consume
  a newer timer. Writes disarm first and arm last.
- **Scope:** any reported membership/coordinator change or unavailable member
  cancels the job. A leave/rejoin also cancels, even if the group looks identical
  when the queued event is handled. Pure follower-order changes do not cancel.
  Re-arm after the new group settles. The timer never automatically follows a
  selected speaker into a new group or pauses rooms that left the recorded group.
  Expiry rechecks the complete current group before targeting its coordinator.
- **Expire:** HA's date/time trigger pauses the unchanged selected group, not all
  Sonos players. A minute trigger catches a missed scheduler event. Duplicate
  expiry events are idempotent. Already inactive playback needs no pause action.
  A failed pause/state confirmation shows **Check HA**; inspect the HA script trace.
  There is no delayed playback retry against a later session.
- **Browser reload/close/sleep:** the HA job continues. All dashboards read the same
  helper state. A frontend-only minute refresh updates labels but never expires,
  cancels or pauses a player. **Due** means HA has not yet confirmed completion.
- **HA restart, automation reload or state-helper reload: timers CANCEL safely.**
  The state helper deliberately has an inactive `initial` value; no armed job is
  restored or executed late on startup. The deadline is retained but cannot act
  without a running record. **This version does not resume a timer after HA restart.**
  Do not disable the guard automation while a timer is active; cancel before
  maintenance. HA must remain running and group state must be reported correctly.
- **Independent instances:** cancel/reset affects only that package's helpers.
  Separate selected-player instances have separate timers, even if configured
  speakers currently share a group. Reuse one instance when a single shared timer
  is desired; there is no cross-instance arbitration of overlapping timers.
  Joining separate groups invalidates their existing group fingerprints.
- **Limits:** the compact helper state is limited to 255 characters. Group size
  is represented by a hash; exceptionally long selected entity identifiers are
  rejected before arming. HACS does not create backend entities. Cancel affects
  this package's job, not unrelated pre-existing Sonos hardware timers.

The helper protocol is `hc1:` plus JSON: `v` version 1, `p` selected player, `s`
phase; running records also contain `g` group fingerprint, `e` UTC end seconds,
`m` chosen minutes and `a` arm timestamp. The prefix prevents HA native-template
conversion from treating the helper's JSON text as service-data dictionaries.
Do not edit these managed values manually.

## Test boundaries and real HA checklist

CI executes the shipped YAML/Jinja with deterministic HA state/service contracts,
including expiry, reset, Cancel, partial-write errors, failed pause, stale events,
group transitions, independent instances and restart cancellation. Browser tests
use that contract outside the page to test multiple tabs and reload. These are
**not tests running a full HA Core server or physical Sonos hardware**.

After installing the package and cumulative beta:

1. Check all five durations, remaining minutes, reset and Cancel on two dashboards.
2. Close/reload the kiosk while a timer runs; verify expiry pauses the selected
   group while an unrelated room continues playing.
3. Test follower selection, group joins/leaves/coordinator changes and leave/rejoin.
   Confirm cancellation; re-arm for the new group. Check independent instances.
4. Restart HA / reload automations with an active timer: expect cancellation and
   no late pause. Check request failures, unavailable players and HA script traces.
5. Check Radio recognition/cache, Play/Pause/volume, repeated Join → Back, larger
   paused artwork, readable 0/2/42/100% labels and recursive Light Color Zoom.

Stable publication and master promotion still require explicit owner approval.
