const media = require('../media/presentation.js');
const { buildColorPaletteButtons } = require('../light/controls.js');

// Reuse the actual Light wheel; IDs, never favorite-list positions, select a hue.
const PALETTE = buildColorPaletteButtons().map(b => b.styles.card[0].background);
function accentColor(id, ids = [], palette = PALETTE)
{
    const indexFor = key => {
        let hash = 2166136261;
        for (const character of String(key)) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
        return hash % palette.length;
    };
    const keys = [...new Set(ids)].sort();
    if (keys.length > palette.length) return palette[indexFor(id)];
    const used = new Set(), assignments = new Map();
    for (const key of keys) {
        let index = indexFor(key);
        while (used.has(index)) index = (index + 1) % palette.length;
        used.add(index); assignments.set(key, palette[index]);
    }
    return assignments.get(id) || palette[indexFor(id)];
}
function accentTemplate(sensor, index)
{
    return `[[[ const items = states[${JSON.stringify(sensor)}]?.attributes?.items || {};
        const id = Object.keys(items)[${index}];
        return id ? (${accentColor.toString()})(id, Object.keys(items), ${JSON.stringify(PALETTE)}) : '#34383d'; ]]]`;
}
function settings(item)
{
    return {favorites:item.favorites_sensor || 'sensor.sonos_favorites',cache:item.favorites_cache_sensor || 'sensor.sonos_favorites_cache',activeOverride:(item.persistent || {}).active_color || item.active_color || item.color || null};
}
function validThumbnail(value)
{
    // Browser loading still verifies availability; reject executable/ambiguous URLs.
    if (typeof value !== 'string' || /[\s"'<>\\]/.test(value)) return false;
    return /^https?:\/\/[^/]+/i.test(value) || /^\/(?!\/)/.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value);
}
function recognizedFavorite(hass, config)
{
    const states=hass && hass.states || {}, options=config._sonos || settings({});
    const selected=states[config.entity];
    if (!selected || ['unknown','unavailable'].includes(selected.state)) return null;
    let effective=selected;
    const group=(selected.attributes || {}).group_members;
    if (Array.isArray(group) && group[0] && group[0]!==config.entity) {
        const leader=states[group[0]], members=(leader && leader.attributes || {}).group_members;
        if (!leader || ['unknown','unavailable'].includes(leader.state) || !Array.isArray(members) || members[0]!==group[0] || !members.includes(config.entity)) return null;
        effective=leader;
    }
    const id=(effective.attributes || {}).media_content_id;
    if (typeof id!=='string' || !id) return null;
    if (['unknown','unavailable'].includes((states[options.favorites] || {}).state) || ['unknown','unavailable'].includes((states[options.cache] || {}).state)) return null;
    const favorites=(states[options.favorites] && states[options.favorites].attributes || {}).items;
    const cache=(states[options.cache] && states[options.cache].attributes || {}).items;
    if (!favorites || Array.isArray(favorites) || typeof favorites!=='object' || !Array.isArray(cache)) return null;
    const candidates=cache.filter(entry=>entry && Object.prototype.hasOwnProperty.call(favorites,entry.media_content_id) &&
        (entry.media_content_id===id || (typeof entry.uri==='string' && entry.uri===id)));
    // Duplicate IDs/URI mappings are ambiguous. Do not pick the first thumbnail.
    if (candidates.length!==1 || !validThumbnail(candidates[0].thumbnail)) return null;
    const favorite=candidates[0];
    return {id:favorite.media_content_id,url:favorite.thumbnail,color:accentColor(favorite.media_content_id,Object.keys(favorites)),
        key:JSON.stringify([options.cache,cache,favorite.media_content_id]),playing:selected.state==='playing' && effective.state==='playing'};
}
function stationForeground(color)
{
    const hue=Number(color.match(/hsl\((\d+)/)[1])/60, chroma=.765;
    const x=chroma*(1-Math.abs(hue%2-1)), m=.55-chroma/2;
    const channels=[[chroma,x,0],[x,chroma,0],[0,chroma,x],[0,x,chroma],[x,0,chroma],[chroma,0,x]][Math.floor(hue)];
    const linear=channels.map(c=>{const v=c+m;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
    const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    return (luminance+.05)/.064 >= .98/(luminance+.05) ? '#14202b' : '#f6f7f9';
}
function resolve({config,state,hass,runtime={}})
{
    const base=media.resolve({config,state});
    const unavailable=!state || ['unknown','unavailable'].includes(state.state);
    if (unavailable) return {...base,forceColors:{center:(config.colors || {}).unavailable || '#555b63',inner:(config.colors || {}).unavailable || '#555b63',outer:(config.colors || {}).unavailable || '#555b63'}};
    const favorite=recognizedFavorite(hass,config);
    const usable=favorite && favorite.key!==runtime.failedArtworkKey;
    const active=(config._sonos || {}).activeOverride || (usable && favorite.color);
    const forceColors=state.state!=='playing' || (usable && !favorite.playing)
        ? {center:(config.off || {}).center_color || '#202224'} : undefined;
    const colors={...base.colors};
    if (active) {
        colors.inner=active;
        colors.center=state.state==='playing' ? active : colors.center;
    }
    const customImage=((config.styles || {}).card || []).some(rule=>Object.prototype.hasOwnProperty.call(rule,'background-image'));
    const artwork=usable && !config.custom_fields && config.show_icon!==false && config.icon!==false && config.icon!=='mdi:arrow-left' && !customImage
        ? {url:favorite.url,key:favorite.key} : null;
    const foreground=usable && !forceColors && !(config._sonos || {}).activeOverride && (!config.colors || !config.colors.center || config.colors.center==='auto') ? stationForeground(favorite.color) : undefined;
    return {...base,colors,forceColors,artwork,foreground};
}
module.exports={PALETTE,accentColor,accentTemplate,settings,validThumbnail,recognizedFavorite,stationForeground,resolve};
