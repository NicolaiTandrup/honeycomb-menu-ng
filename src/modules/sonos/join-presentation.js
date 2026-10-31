const station=require('./station');
const {memberState}=require('./grouping');
// HA Sonos exposes coordinator transport metadata through each room entity,
// but volume_level is the individual speaker's volume. Never substitute the
// opening cube's entity (or its group volume) for either room field.
function roomDetails(hass,entity) {
    const room=(hass && hass.states || {})[entity],attributes=room && room.attributes || {};
    const available=!!room && !['unknown','unavailable'].includes(room.state);
    const playback=available?({playing:'Playing',paused:'Paused',idle:'Idle',off:'Idle',standby:'Idle',buffering:'Buffering'}[room.state] || 'Unknown'):'Unavailable';
    const content=available?[...new Set([attributes.media_channel,attributes.media_title].filter(v=>typeof v==='string' && v.trim()).map(v=>v.trim()))]:[];
    const volume=attributes.volume_level;
    const volumeText=available && typeof volume==='number' && Number.isFinite(volume) && volume>=0 && volume<=1?Math.round(volume*100)+'%':null;
    return {playback,content,volumeText,available};
}
function resolve({config,hass,runtime={},evaluate=value=>value}) {
    const options=config._sonos_join,states=hass && hass.states || {},room=states[config.entity];
    const status=memberState(hass,options.coordinator,config.entity,options.script,options.nativeAllowed);
    const details=roomDetails(hass,config.entity);
    const name=evaluate(config.name)||(room && room.attributes || {}).friendly_name||config.entity;
    // Each room is recognized by the existing Favorites/native Browse pipeline,
    // which verifies coordinator membership. Volume always stays individual.
    const roomConfig={...config,_sonos:config._sonos || options.source && options.source._sonos};
    const roomVisual=station.resolve({config:roomConfig,state:room,hass,runtime});
    const roomFavorite=station.recognizedFavorite(hass,roomConfig);
    const source=options.source;
    const sourceVisual=status.joined && source?station.resolve({config:source,state:states[source.entity],hass,runtime}):null;
    const sourceFavorite=sourceVisual && station.recognizedFavorite(hass,source);
    const visual=sourceVisual || roomVisual;
    // Opening-source styling is inherited, but an independently verified room
    // station wins over conflicting opening-source artwork during transitions.
    const sameGroup=source && room && Array.isArray((room.attributes || {}).group_members) &&
        room.attributes.group_members.includes(source.entity) &&
        Array.isArray((states[source.entity] && states[source.entity].attributes || {}).group_members) &&
        states[source.entity].attributes.group_members.includes(config.entity);
    let artwork=roomVisual.artwork;
    if(sourceVisual && sameGroup && sourceFavorite && roomFavorite && sourceFavorite.id===roomFavorite.id)artwork=sourceVisual.artwork;
    if(!details.available || sourceVisual && (source.show_icon===false || source.icon===false || source.custom_fields || ((source.styles || {}).card || []).some(rule=>Object.prototype.hasOwnProperty.call(rule,'background-image'))))artwork=null;
    const secondary=details.available?(details.volumeText || '—'):'Unavailable';
    return {...visual,artwork:artwork?{...artwork,style:{...artwork.style,top:'12%',height:'28%'}}:null,
        name:(status.joined?'✓ ':'')+name,secondary,tertiary:artwork?null:details.content[0]||null,
        visualConfig:status.joined?source:null,sourceIcon:status.joined && source?source.icon:undefined,
        ariaLabel:[name,status.joined?'Joined':'Not joined',details.playback,...details.content,details.volumeText || 'Volume unavailable',status.enabled?'':status.label,status.enabled?'':status.reason].filter(Boolean).join(', ')};
}
module.exports={resolve,roomDetails};
