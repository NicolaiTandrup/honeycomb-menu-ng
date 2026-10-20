const { sonosButtonStyles } = require('./presentation.js');

// Self-contained because the same decision is embedded in live presentation
// templates and rechecked against fresh HA state immediately before an action.
function memberState(hass, coordinator, member, script)
{
    const states = hass.states || {};
    const player = states[coordinator];
    const candidate = states[member];
    const group = player && player.attributes && player.attributes.group_members;
    const otherGroup = candidate && candidate.attributes && candidate.attributes.group_members;
    const joined = Array.isArray(group) && group.includes(member);
    const result = (label, enabled, reason = label) => ({ joined, label, enabled, reason });
    const unavailable = state => !state || ['unknown', 'unavailable'].includes(state.state);

    if (coordinator === member) return result('Selected player', false);
    if (unavailable(player)) return result('Player unavailable', false);
    if (unavailable(candidate)) return result('Unavailable', false);
    if (!Array.isArray(group) || !group.includes(coordinator)) return result('Group unknown', false);
    // The configured external script is bound to this selected coordinator.
    // Do not accidentally regroup its actual leader or another room's group.
    if (group[0] !== coordinator) return result('Use group leader', false, 'Open the group leader to change its members.');
    if (Array.isArray(otherGroup) && otherGroup.length > 1 && !otherGroup.includes(coordinator))
        return result('Other group', false, 'Ungroup this room in Home Assistant before adding it here.');
    if (!joined && (!Array.isArray(otherGroup) || !otherGroup.includes(member)))
        return result('Group unknown', false);
    if (!joined && otherGroup.includes(coordinator)) return result('Updating group', false);
    if (typeof script !== 'string' || !/^script\.[a-z0-9_]+$/.test(script))
        return result('Configure script', false, 'Configure toggle_member_script with the selected player\'s Join toggle script.');
    const scriptState = states[script];
    const service = script.slice(7);
    if (typeof hass.callService !== 'function' || unavailable(scriptState) || !hass.services || !hass.services.script || !hass.services.script[service])
        return result('Script unavailable', false, 'Load the configured toggle_member_script in Home Assistant and check its service is available.');
    return result(joined ? 'Joined' : 'Not joined', true);
}

function memberTemplate(item, member, expression)
{
    return `[[[ const status = (${memberState.toString()})(hass, ${JSON.stringify(item.entity)}, ${JSON.stringify(member.entity)}, ${JSON.stringify(item.toggle_member_script || '')}); return ${expression}; ]]]`;
}

function buildJoinMenu(item)
{
    // Explicit candidates are the source of truth. A media_player domain or an
    // area name alone is insufficient evidence that a player supports Sonos.
    const configured = Array.isArray(item.members) ? item.members : [];
    const seen = new Set([item.entity]);
    const members = configured.filter(member => {
        if (!member || typeof member.entity !== 'string' ||
            !/^media_player\.[a-z0-9_]+$/.test(member.entity) || seen.has(member.entity)) return false;
        seen.add(member.entity);
        return true;
    }).slice(0, 12);

    return {
        entity: item.entity,
        nested_expand: true,
        inherit_inner: true,
        empty_slots: 'hidden',
        idle_timeout: 0,
        buttons: members.length ? members.map((member, index) => ({
            slot: index + 7,
            slot_mode: 'hard',
            entity: member.entity,
            icon: member.icon || (member.entity.includes('tv') ? 'mdi:television-speaker' : 'mdi:speaker'),
            name: member.name || `[[[ return entity?.attributes?.friendly_name || ${JSON.stringify(member.entity)}; ]]]`,
            label: memberTemplate(item, member, 'status.label'),
            show_name: true,
            show_label: true,
            autoclose: false,
            styles: sonosButtonStyles({background: memberTemplate(item, member,
                "status.joined ? 'rgba(45, 105, 116, 0.96)' : !status.enabled ? 'rgba(70, 74, 80, 0.92)' : 'rgba(52, 66, 78, 0.92)'")}),
            tap_action: {
                action: 'honeycomb-sonos-toggle-member',
                coordinator: item.entity,
                member: member.entity,
                script: item.toggle_member_script || ''
            }
        })) : [{
            slot: 7,
            slot_mode: 'hard',
            icon: 'mdi:information-outline',
            name: 'No rooms',
            label: configured.length ? 'Check members' : 'Configure members',
            show_name: true,
            show_label: true,
            interactive: false,
            styles: sonosButtonStyles()
        }]
    };
}

function notifyUser(message)
{
    if (typeof document === 'undefined') return;
    const root = document.querySelector('home-assistant');
    if (root) root.dispatchEvent(new CustomEvent('hass-notification', {
        detail: { message }, bubbles: true, composed: true
    }));
}

const pending = new WeakMap();
async function toggleMember({ hass, actionConfig, notify = notifyUser })
{
    const { coordinator, member, script } = actionConfig;
    const status = memberState(hass, coordinator, member, script);
    if (!status.enabled) { notify(status.reason); return false; }
    // Suppress repeat taps while this request is outstanding. Membership itself
    // is never optimistic: only HA group_members updates change the cube.
    const connection = hass.connection || hass.callService;
    if (!pending.has(connection)) pending.set(connection, new Set());
    const requests = pending.get(connection);
    const key = `${coordinator}:${member}`;
    if (requests.has(key)) return false;
    requests.add(key);
    try {
        await hass.callService('script', script.slice(7), { member }, {});
        return true;
    } catch (_) {
        notify('Could not update Sonos group. Check the configured toggle script in Home Assistant.');
        return false;
    } finally { requests.delete(key); }
}

function registerActions(registry)
{
    registry.register('honeycomb-sonos-toggle-member', context => {
        void toggleMember(context);
        return true;
    });
}

module.exports = { buildJoinMenu, memberState, toggleMember, registerActions };
