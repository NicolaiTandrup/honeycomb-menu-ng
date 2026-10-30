const station=require('./station');
const {memberState}=require('./grouping');
function resolve({config,hass,runtime={},evaluate=value=>value}) {
    const options=config._sonos_join,states=hass && hass.states || {},room=states[config.entity];
    const status=memberState(hass,options.coordinator,config.entity,options.script,options.nativeAllowed);
    const attributes=room && room.attributes || {};
    const playback=room && !['unknown','unavailable'].includes(room.state)?room.state:'unavailable';
    const content=[attributes.media_channel,attributes.media_title].filter(v=>typeof v==='string' && v.trim());
    const volume=attributes.volume_level;
    const volumeText=typeof volume==='number' && Number.isFinite(volume)?Math.round(Math.max(0,Math.min(1,volume))*100)+'%':'Volume unavailable';
    const name=evaluate(config.name)||attributes.friendly_name||config.entity;
    const secondary=status.joined?volumeText:[playback,...new Set(content)].join(' · ');
    const source=options.source;
    const visual=status.joined && source?station.resolve({config:source,state:states[source.entity],hass,runtime}):
        {colors:{center:'#202224',inner:'#202224',outer:'#34383d'}};
    return {...visual,...(visual.artwork?{artwork:{...visual.artwork,style:{...visual.artwork.style,top:'12%',height:'28%'}}}:{}),name,secondary,tertiary:status.joined?[playback,...new Set(content)].join(' · '):null,
        visualConfig:status.joined?source:null,sourceIcon:status.joined && source?source.icon:undefined,
        ariaLabel:[name,status.joined?'Joined':'Not joined',playback,...new Set(content),status.joined?volumeText:'',status.enabled?'':status.label,status.enabled?'':status.reason].filter(Boolean).join(', ')};
}
module.exports={resolve};
