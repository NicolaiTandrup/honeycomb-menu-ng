// Use HA's registry platform, never entity names, areas or group_members alone.
function platformPlayers(entries)
{
    return entries.filter(entry=>entry && entry.platform==='sonos' && !entry.disabled_by && !entry.hidden && !entry.hidden_by &&
        /^media_player\.[a-z0-9_]+$/.test(entry.entity_id)).map(entry=>entry.entity_id).sort();
}
async function discoverSonos(hass)
{
    if (hass.entities && Object.values(hass.entities).some(entry=>entry && entry.platform))
        return {players:platformPlayers(Object.values(hass.entities)),status:'available'};
    const call=hass.callWS ? request=>hass.callWS(request) : hass.connection && hass.connection.sendMessagePromise
        ? request=>hass.connection.sendMessagePromise(request) : null;
    if (!call) return {players:[],status:'unavailable'};
    try {
        const result=await call({type:'config/entity_registry/list_for_display'});
        if (!result || !Array.isArray(result.entities) || result.entities.some(entry=>!entry || typeof entry.ei!=='string' || typeof entry.pl!=='string'))
            return {players:[],status:'unavailable'};
        return {players:platformPlayers(result.entities.map(entry=>({entity_id:entry.ei,platform:entry.pl,hidden:entry.hb}))),status:'available'};
    } catch (_) { return {players:[],status:'unavailable'}; }
}
module.exports={platformPlayers,discoverSonos};
