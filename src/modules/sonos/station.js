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
    return {favorites:item.favorites_sensor || 'sensor.sonos_favorites',cache:item.favorites_cache_sensor || 'sensor.sonos_favorites_cache',activeFallback:(item.persistent || {}).active_color || item.active_color || item.color || null};
}
function validThumbnail(value)
{
    // Browser loading still verifies availability; reject executable/ambiguous URLs.
    if (typeof value !== 'string' || /[\s"'<>\\]/.test(value)) return false;
    return /^https?:\/\/[^/]+/i.test(value) || /^\/(?!\/)/.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value);
}
// Compare metadata, never arbitrary track titles. Preserve punctuation and
// diacritics; case/Unicode composition/whitespace carry no station identity.
function channelName(value)
{
    return typeof value==='string' ? value.normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase() : '';
}
function inspectFavorite(hass, config)
{
    const states=hass && hass.states || {}, options=config._sonos || settings({});
    const selected=states[config.entity];
    const diagnostics={player_state:selected && ['playing','paused','idle','off','unknown','unavailable'].includes(selected.state) ? selected.state : 'other',
        grouped:false,radio_transport:false,favorites_present:false,cache_present:false,
        favorite_count:0,cache_count:0,candidate_count:0,channel_present:false,
        map_channel_candidates:0,cache_channel_candidates:0,programme_map_candidates:0,programme_cache_candidates:0,programme_channel:false,match_stage:'none',artwork_valid:false};
    const done=(reason,favorite=null)=>({favorite,diagnostics:{...diagnostics,reason}});
    if (!selected || ['unknown','unavailable'].includes(selected.state)) return done('player_unavailable');
    let effective=selected;
    const group=(selected.attributes || {}).group_members;
    if (Array.isArray(group) && group[0] && group[0]!==config.entity) {
        diagnostics.grouped=true;
        const leader=states[group[0]], members=(leader && leader.attributes || {}).group_members;
        if (!leader || ['unknown','unavailable'].includes(leader.state) || !Array.isArray(members) || members[0]!==group[0] || !members.includes(config.entity)) return done('group_not_verified');
        effective=leader;
    }
    const id=(effective.attributes || {}).media_content_id;
    if (typeof id!=='string' || !id) return done('playback_id_missing');
    diagnostics.radio_transport=/^(x-sonosapi-(?:hls|radio|stream):|x-rincon-mp3radio:)/i.test(id);
    if (['unknown','unavailable'].includes((states[options.favorites] || {}).state) || ['unknown','unavailable'].includes((states[options.cache] || {}).state)) return done('favorites_or_cache_unavailable');
    const favorites=(states[options.favorites] && states[options.favorites].attributes || {}).items;
    const cache=(states[options.cache] && states[options.cache].attributes || {}).items;
    diagnostics.favorites_present=!!favorites && !Array.isArray(favorites) && typeof favorites==='object';
    diagnostics.cache_present=Array.isArray(cache);
    if (!diagnostics.favorites_present || !diagnostics.cache_present) return done('favorites_or_cache_missing');
    diagnostics.favorite_count=Object.keys(favorites).length;diagnostics.cache_count=cache.length;
    const configured=cache.filter(entry=>entry && Object.prototype.hasOwnProperty.call(favorites,entry.media_content_id));
    let candidates=configured.filter(entry=>entry.media_content_id===id ||
        [entry.uri,entry.playback_uri].some(uri=>typeof uri==='string' && uri===id));
    if (candidates.length) diagnostics.match_stage='identifier';
    if (!candidates.length && diagnostics.radio_transport) {
        const name=channelName((effective.attributes || {}).media_channel);
        diagnostics.channel_present=!!name;
        const mapIds=Object.keys(favorites).filter(key=>name && channelName(favorites[key])===name);
        const cacheIds=configured.filter(entry=>name && entry.media_content_type==='favorite_item_id' && channelName(entry.title)===name).map(entry=>entry.media_content_id);
        // HA Sonos combines station and radio-show metadata with a spaced bullet;
        // the owner's HA also exposes a spaced middle dot. Parse only these
        // explicit formats, never arbitrary prefixes/suffixes or track titles.
        const parts=name.split(/\s+[·•]\s+/);
        diagnostics.programme_channel=parts.length>1 && !!parts[0] && parts.slice(1).every(Boolean);
        const prefix=diagnostics.programme_channel ? parts[0] : '';
        const programmeMap=Object.keys(favorites).filter(key=>prefix && channelName(favorites[key])===prefix);
        const programmeCache=configured.filter(entry=>prefix && entry.media_content_type==='favorite_item_id' && channelName(entry.title)===prefix).map(entry=>entry.media_content_id);
        diagnostics.map_channel_candidates=mapIds.length;diagnostics.cache_channel_candidates=cacheIds.length;
        diagnostics.programme_map_candidates=programmeMap.length;diagnostics.programme_cache_candidates=programmeCache.length;
        // The HA favorite map and browse cache can use different station labels.
        // Either exact label identifies an ID, but conflicting labels/duplicate
        // records must never be resolved by list order or a fuzzy score.
        const ids=[...new Set([...mapIds,...cacheIds,...programmeMap,...programmeCache])];
        if (ids.length>1) return done('channel_ambiguous');
        if (ids.length===1 && (mapIds.length || cacheIds.length ||
            (programmeMap.length===1 && programmeCache.length===1 && programmeMap[0]===programmeCache[0]))) {
            candidates=configured.filter(entry=>entry.media_content_id===ids[0] && entry.media_content_type==='favorite_item_id');
            diagnostics.match_stage=mapIds.length || cacheIds.length ? 'radio_channel' : 'radio_station_programme';
        }
    }
    diagnostics.candidate_count=candidates.length;
    if (!candidates.length) return done(diagnostics.radio_transport ? 'channel_or_mapping_missing' : 'identifier_not_mapped');
    if (candidates.length!==1) return done('mapping_ambiguous');
    const favorite=candidates[0];diagnostics.artwork_valid=validThumbnail(favorite.thumbnail);
    if (!diagnostics.artwork_valid) return done('artwork_missing_or_invalid');
    return done('recognized',{id:favorite.media_content_id,url:favorite.thumbnail,color:accentColor(favorite.media_content_id,Object.keys(favorites)),
        key:JSON.stringify([options.cache,cache,favorite.media_content_id]),playing:selected.state==='playing' && effective.state==='playing'});
}
function recognizedFavorite(hass, config)
{
    return inspectFavorite(hass,config).favorite;
}
// Explicit inspection only: no automatic console logs, network calls, raw
// entity IDs, station names, URLs, cache contents or token-bearing identifiers.
function diagnostics({hass,config,runtime={}})
{
    const inspected=inspectFavorite(hass,config), favorite=inspected.favorite;
    const result=resolve({hass,config,state:(hass && hass.states || {})[config.entity],runtime});
    return {...inspected.diagnostics,artwork_load_failed:!!favorite && favorite.key===runtime.failedArtworkKey,
        presentation:result.artwork ? (favorite.playing ? 'station_playing' : 'station_inactive') : 'standard_or_override',
        explicit_center_color:!!(config.colors && config.colors.center && config.colors.center!=='auto'),
        explicit_inner_color:!!(config.colors && config.colors.inner_border && config.colors.inner_border!=='auto')};
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
// Percentages refer to the usable clipped cube fill, never the whole cell.
function artworkStyle(playing, primary, secondary)
{
    const text=primary || secondary;
    const width=playing || text ? 62 : 80;
    return {width:`${width}%`,left:`${(100-width)/2}%`,
        top:text ? '10%' : playing ? '19%' : '13%',
        height:primary && secondary ? '36%' : text ? '48%' : playing ? '62%' : '74%'};
}
function resolve({config,state,hass,runtime={}})
{
    const base=media.resolve({config,state});
    const unavailable=!state || ['unknown','unavailable'].includes(state.state);
    if (unavailable) return {...base,forceColors:{center:(config.colors || {}).unavailable || '#555b63',inner:(config.colors || {}).unavailable || '#555b63',outer:(config.colors || {}).unavailable || '#555b63'}};
    const favorite=recognizedFavorite(hass,config);
    const usable=favorite && favorite.key!==runtime.failedArtworkKey;
    const active=usable ? favorite.color : (config._sonos || {}).activeFallback;
    const forceColors=state.state!=='playing' || (usable && !favorite.playing)
        ? {center:(config.off || {}).center_color || '#202224'} : undefined;
    const colors={...base.colors};
    if (active) {
        colors.inner=active;
        colors.center=state.state==='playing' ? active : colors.center;
    }
    const customImage=((config.styles || {}).card || []).some(rule=>Object.prototype.hasOwnProperty.call(rule,'background-image'));
    const artwork=usable && !config.custom_fields && config.show_icon!==false && config.icon!==false && !customImage
        ? {url:favorite.url,key:favorite.key,style:artworkStyle(favorite.playing,config.show_name && !!config.name,
            config.label!==undefined && config.show_label!==false ? !!config.label : !!base.secondary)} : null;
    const foreground=usable && !forceColors && (!config.colors || !config.colors.center || config.colors.center==='auto') ? stationForeground(favorite.color) : undefined;
    return {...base,colors,forceColors,artwork,foreground};
}
module.exports={PALETTE,accentColor,accentTemplate,settings,validThumbnail,channelName,inspectFavorite,recognizedFavorite,diagnostics,stationForeground,artworkStyle,resolve};
