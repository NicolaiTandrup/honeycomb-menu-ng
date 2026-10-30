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
    // Keep transport/own volume separate from content: a long radio title must
    // not push the room volume or station name off the end of the same line.
    const secondary=details.playback+(details.available && (details.volumeText || status.joined)?' · '+(details.volumeText || '—'):'');
    const source=options.source;
    const visual=status.joined && source?station.resolve({config:source,state:states[source.entity],hass,runtime}):
        {colors:{center:'#202224',inner:'#202224',outer:'#34383d'}};
    return {...visual,...(visual.artwork?{artwork:{...visual.artwork,style:{...visual.artwork.style,top:'12%',height:'28%'}}}:{}),
        name:(status.joined?'✓ ':'')+name,secondary,tertiary:details.content.join(' · ')||null,
        visualConfig:status.joined?source:null,sourceIcon:status.joined && source?source.icon:undefined,
        ariaLabel:[name,status.joined?'Joined':'Not joined',details.playback,...details.content,details.volumeText || 'Volume unavailable',status.enabled?'':status.label,status.enabled?'':status.reason].filter(Boolean).join(', ')};
}
module.exports={resolve,roomDetails};
