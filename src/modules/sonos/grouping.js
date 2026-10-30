const { sonosButtonStyles } = require('./presentation.js');
const { discoverSonos } = require('./discovery.js');

// Self-contained because the same decision is embedded in live presentation
// templates and rechecked against fresh HA state immediately before an action.
function memberState(hass, coordinator, member, script, nativeAllowed = false)
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
    if (!script && nativeAllowed) {
        if (!(Number(player.attributes.supported_features) & 524288) || !(Number(candidate.attributes.supported_features) & 524288))
            return result('Grouping unsupported',false,'Both players must expose Home Assistant grouping support.');
        const services=hass.services && hass.services.media_player;
        if (typeof hass.callService!=='function' || !services || !services.join || !services.unjoin)
            return result('Grouping unavailable',false,'Home Assistant media_player.join and unjoin services are required.');
        return result(joined ? 'Joined' : 'Not joined',true);
    }
    if (typeof script !== 'string' || !/^script\.[a-z0-9_]+$/.test(script))
        return result('Configure script', false, 'Configure toggle_member_script, or enable native grouping on verified Sonos players.');
    const scriptState = states[script];
    const service = script.slice(7);
    if (typeof hass.callService !== 'function' || unavailable(scriptState) || !hass.services || !hass.services.script || !hass.services.script[service])
        return result('Script unavailable', false, 'Load the configured toggle_member_script in Home Assistant and check its service is available.');
    return result(joined ? 'Joined' : 'Not joined', true);
}

function memberTemplate(item, member, expression, nativeAllowed)
{
    return `[[[ const status = (${memberState.toString()})(hass, ${JSON.stringify(item.entity)}, ${JSON.stringify(member.entity)}, ${JSON.stringify(item.toggle_member_script || '')}, ${!!nativeAllowed}); return ${expression}; ]]]`;
}

function buildJoinMenu(item, discovery = null, source = null)
{
    // Explicit candidates override discovery. Domain/area names alone never
    // establish platform identity; native automatic choices come from registry.
    const manual = Array.isArray(item.members);
    const unverified=!manual && discovery && discovery.status==='available' && !discovery.players.includes(item.entity);
    const configured = manual ? item.members : discovery && !unverified ? discovery.players.map(entity=>({entity})) : [];
    const nativeAllowed = manual || !!(discovery && discovery.players.includes(item.entity));
    const seen = new Set([item.entity,item._selected_entity]);
    const members = configured.filter(member => {
        if (!member || typeof member.entity !== 'string' ||
            !/^media_player\.[a-z0-9_]+$/.test(member.entity) || seen.has(member.entity)) return false;
        seen.add(member.entity);
        return true;
    }).slice(0, 12);

    return {
        entity: item.entity,
        _sonos_join_entity: item._selected_entity || item.entity,
        nested_expand: true,
        inherit_inner: true,
        empty_slots: 'hidden',
        _navigation_sibling: {group: `sonos:${item._selected_entity || item.entity}`, id: 'join'},
        buttons: members.length ? members.map((member, index) => ({
            slot: index + 7,
            slot_mode: 'hard',
            entity: member.entity,
            mode:'sonos-join',
            _sonos_join:{coordinator:item.entity,script:item.toggle_member_script || '',nativeAllowed,source},
            icon: member.icon || (member.entity.includes('tv') ? 'mdi:television-speaker' : 'mdi:speaker'),
            name: member.name || `[[[ return entity?.attributes?.friendly_name || ${JSON.stringify(member.entity)}; ]]]`,
            show_name: true,
            show_label: true,
            autoclose: false,

            tap_action: {
                action: 'honeycomb-sonos-toggle-member',
                coordinator: item.entity,
                member: member.entity,
                native_allowed: nativeAllowed,
                script: item.toggle_member_script || ''
            }
        })) : [{
            slot: 7,
            slot_mode: 'hard',
            icon: 'mdi:information-outline',
            name: 'No rooms',
            label: manual ? 'Check members' : !discovery ? 'Configure members' : discovery.status!=='available' ? 'Metadata unavailable' : unverified ? 'Selected not Sonos' : 'No other Sonos',
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
    const { coordinator, member, script, native_allowed } = actionConfig;
    const status = memberState(hass, coordinator, member, script, native_allowed);
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
        if (script) await hass.callService('script', script.slice(7), { member }, {});
        else if (status.joined) await hass.callService('media_player','unjoin',{}, {entity_id:member});
        else await hass.callService('media_player','join',{group_members:[member]}, {entity_id:coordinator});
        return true;
    } catch (_) {
        notify('Could not update Sonos group. Check Home Assistant permissions, grouping support or the configured toggle script.');
        return false;
    } finally { requests.delete(key); }
}

function registerActions(registry)
{
    registry.register('honeycomb-sonos-open-join', context => { void openJoin(context); return true; });
    registry.register('honeycomb-sonos-toggle-member', context => {
        void toggleMember(context);
        return true;
    });
}

const joinRequests=new WeakMap();
async function openJoin({hass,actionConfig,openNested,isCurrent=()=>true,getHass=()=>hass,requestScope,menuConfig})
{
    const original=actionConfig.sonos_item;
    // Inherited inner controls remain visible in Join. Re-entering the same
    // view must not push duplicate levels that look like a stuck Back control.
    if (menuConfig && menuConfig._sonos_join_entity===original.entity) return false;
    const scope=requestScope || openNested;
    const previous=joinRequests.get(scope);
    if (previous && previous.isCurrent()) return false;
    const request={isCurrent};joinRequests.set(scope,request);
    let timeout;
    try {
        const discovery=Array.isArray(original.members) ? null : await Promise.race([
            discoverSonos(hass),new Promise(resolve=>{timeout=setTimeout(()=>resolve({players:[],status:'unavailable'}),5000);})
        ]);
        if (!isCurrent() || joinRequests.get(scope)!==request) return false;
        const live=getHass(),item={...original};
        if (!item.toggle_member_script) {
            const state=(live.states || {})[item.entity],group=state && state.attributes.group_members;
            const leader=Array.isArray(group) && group[0],leaderState=(live.states || {})[leader];
            if (leader && leader!==item.entity && leaderState && Array.isArray(leaderState.attributes.group_members) &&
                leaderState.attributes.group_members[0]===leader && leaderState.attributes.group_members.includes(item.entity) &&
                (Array.isArray(original.members) || discovery && discovery.players.includes(leader))) {
                item._selected_entity=item.entity;item.entity=leader;
            }
        }
        openNested(buildJoinMenu(item,discovery,menuConfig && menuConfig.persistent_center || null));
        return true;
    } finally {
        clearTimeout(timeout);
        if (joinRequests.get(scope)===request) joinRequests.delete(scope);
    }
}

module.exports = { buildJoinMenu, memberState, toggleMember, openJoin, registerActions };
