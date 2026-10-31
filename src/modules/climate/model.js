const registry=require('../../core/ha-capability-registry');
const FLAGS={temperature:1,range:2,fan:8,preset:16,swing:32,horizontal:512};
const CHOICES={hvac:['hvac_modes','state','set_hvac_mode','hvac_mode',0],preset:['preset_modes','preset_mode','set_preset_mode','preset_mode',16],fan:['fan_modes','fan_mode','set_fan_mode','fan_mode',8],swing:['swing_modes','swing_mode','set_swing_mode','swing_mode',32],horizontal:['swing_horizontal_modes','swing_horizontal_mode','set_swing_horizontal_mode','swing_horizontal_mode',512]};
const absent=s=>!s||['unknown','unavailable','none',''].includes(String(s.state).toLowerCase());
function numeric(v){if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(v.trim())))return null;return Number.isFinite(Number(v))?Number(v):null;}
function settings(item) {
    if(item.persistent&&item.persistent.entity!==undefined&&item.persistent.entity!==item.entity)throw Error('Climate persistent entity must match its configured climate entity.');
    if(typeof item.entity!=='string'||!/^climate\.[a-z0-9_]+$/.test(item.entity))throw Error('Climate requires an explicit climate.* entity.');
    if(item.defrost_entity!==undefined&&(typeof item.defrost_entity!=='string'||!/^switch\.[a-z0-9_]+$/.test(item.defrost_entity)))throw Error('defrost_entity must be an explicit verified switch.* entity.');
    if(item.discover!==undefined&&typeof item.discover!=='boolean')throw Error('Climate discover must be true or false.');
    return {entity:item.entity,name:item.name||'Climate',discover:item.discover!==false,defrostEntity:item.defrost_entity||null,interactive:item.interactive!==false};
}
function hasService(hass,domain,service){return !!(hass&&typeof hass.callService==='function'&&hass.services&&hass.services[domain]&&hass.services[domain][service]);}
function list(v){return Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x.trim()&&x.length<=128))].slice(0,256):[];}
function state(hass,options) {
    const source=(hass&&hass.states||{})[options.entity],a=source&&source.attributes||{},store=registry.session(hass);
    const online=!(hass&&hass.connection&&hass.connection.connected===false)&&(!store||store.online);
    const available=!absent(source)&&online,features=Number.isInteger(a.supported_features)?a.supported_features:0;
    const reportedUnit=a.temperature_unit===undefined?(hass&&hass.config&&hass.config.unit_system||{}).temperature:a.temperature_unit;
    const unit=['°C','°F'].includes(reportedUnit)?reportedUnit:null;
    const step=a.target_temp_step===undefined?(unit==='°F'?1:unit==='°C'?.5:null):numeric(a.target_temp_step);
    const minimum=numeric(a.min_temp),maximum=numeric(a.max_temp);
    const low=numeric(a.target_temp_low),high=numeric(a.target_temp_high),target=numeric(a.temperature);
    const range=!!(features&FLAGS.range)&&(source&&source.state==='heat_cool'||!(features&FLAGS.temperature)||target===null&&low!==null&&high!==null);
    const choices={};
    for(const [kind,[attribute,current,service,,flag]]of Object.entries(CHOICES))choices[kind]={values:available&&(!flag||features&flag)?list(a[attribute]):[],selected:current==='state'?source&&source.state:a[current],service,writable:available&&options.interactive&&hasService(hass,'climate',service)};
    const nativeDefrost=choices.preset.values.find(v=>v.toLowerCase()==='defrost');
    const discovered=options.defrostEntity?{entity:options.defrostEntity,reason:'explicit_mapping'}:nativeDefrost?{entity:null,reason:'native_preset'}:options.discover?registry.associatedSwitch(hass,options.entity,'defrost'):{entity:null,reason:'disabled'};
    const switchState=(hass&&hass.states||{})[discovered.entity];
    const defrost={...discovered,state:switchState,available:available&&!absent(switchState)&&['on','off'].includes(switchState.state),native:nativeDefrost};
    if(options.defrostEntity)choices.preset.values=choices.preset.values.filter(v=>v.toLowerCase()!=='defrost');
    defrost.writable=options.interactive&&defrost.available&&hasService(hass,'switch','turn_on')&&hasService(hass,'switch','turn_off');
    const validBounds=unit&&step>0&&step<=100&&minimum!==null&&maximum!==null&&minimum<maximum;
    const validTarget=range?low!==null&&high!==null&&low>=minimum&&high<=maximum&&low<=high:!!(features&FLAGS.temperature)&&target!==null&&target>=minimum&&target<=maximum;
    return {options,source,available,features,unit,step,minimum,maximum,low,high,target,range,current:numeric(a.current_temperature),action:source&&source.state==='off'?'off':a.hvac_action||null,mode:source&&source.state,choices,defrost,
        writable:!!(available&&options.interactive&&validBounds&&validTarget&&hasService(hass,'climate','set_temperature'))};
}
function adjustment(value,delta,bound) {
    if(!value.writable||![-1,-.1,.1,1].includes(delta)||value.range&&!['low','high'].includes(bound))return null;
    const current=value.range?value[bound]:value.target;
    const requested=current+delta;
    const next=Number((value.minimum+Math.round((requested-value.minimum)/value.step)*value.step).toFixed(6));
    if(Math.abs(next-requested)>1e-6)return null;
    if(next<value.minimum-1e-6||next>value.maximum+1e-6||Math.abs(next-current)<1e-6||value.range&&(bound==='low'?next>value.high:next<value.low))return null;
    return value.range?{target_temp_low:bound==='low'?next:value.low,target_temp_high:bound==='high'?next:value.high}:{temperature:next};
}
function snapshot(hass,config){
    if(!config._climate)return null;
    const value=state(hass,config._climate),id=value.defrost.entity;
    return JSON.stringify([value.source,id&&(hass&&hass.states||{})[id],hass&&hass.config&&hass.config.unit_system,hass&&hass.services&&hass.services.climate,hass&&hass.services&&hass.services.switch,hass&&hass.connection&&hass.connection.connected,registry.session(hass)&&registry.session(hass).version]);
}
function text(value,unit=''){return value===null?'—':String(Number(value.toFixed(2)))+unit;}
module.exports={FLAGS,CHOICES,absent,numeric,settings,hasService,state,adjustment,snapshot,text};
