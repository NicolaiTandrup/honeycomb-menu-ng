const model=require('./model');
const {recordFor}=require('./actions');
const registry=require('../../core/ha-capability-registry');
const {NAMES}=require('./menus');
const {SUBMENU_FILL,SUBMENU_INNER,OUTER}=require('../../core/submenu-theme');
const neutral='#202224',gray='#858b94';
function label(v){return typeof v==='string'?v.replace(/_/g,' '):'Unknown';}
function resolve({hass,config}) {
    const options=config._climate;if(!options)return {colors:{center:neutral,inner:gray,outer:'#34383d'},name:'Not configured',disabled:true};
    const value=model.state(hass,options),role=config._climate_role,record=recordFor(hass||{},value),pending=!!record&&['sending','pending'].includes(record.phase);
    const color=!value.available||value.mode==='off'?gray:['heating','preheating'].includes(value.action)?'#ef8c2f':value.action==='cooling'?'#42a5f5':value.action==='fan'?'#00bcd4':value.mode==='heat'?'#ba7945':value.mode==='cool'?'#497ca8':gray;
    const active=value.available&&value.mode!=='off'&&['heating','preheating','cooling','drying','fan','defrosting'].includes(value.action);
    let name=model.text(value.current,value.unit||''),secondary=value.range?'Set '+model.text(value.low)+'–'+model.text(value.high,value.unit||''):'Set '+model.text(value.target,value.unit||''),disabled=false;
    if(!value.available){name='Unavailable';secondary=options.name;}
    if(role==='adjust'){
        const delta=config._climate_delta;
        name=(delta>0?'+':'−')+Math.abs(delta).toFixed(1)+(value.unit||'');
        secondary=value.range&&!config._climate_bound?'Select Low/High':config._climate_bound?label(config._climate_bound):delta>0?'Raise':'Lower';
        disabled=pending||!value.writable||!!(config._climate_bound&&!value.range)||!!(!value.range||config._climate_bound)&&!model.adjustment(value,delta,config._climate_bound);
        if(disabled && !pending && value.writable && (!value.range || config._climate_bound))secondary='Step / limit unavailable';
    } else if(role==='hvac'){name=label(value.mode);secondary=value.action?label(value.action):'HVAC modes';disabled=!value.available||!value.choices.hvac.values.length;}
    else if(role==='categories'){name='Modes';secondary='Presets / Fan';disabled=!value.available||!Object.values(value.choices).some(v=>v.values.length)&&!value.defrost.entity;}
    else if(role==='category'){const choice=value.choices[config._climate_kind];name=NAMES[config._climate_kind];secondary=choice&&choice.selected?label(choice.selected):'Choose';disabled=!choice||!choice.values.length;}
    else if(role==='target'){name=label(config._climate_bound);secondary=model.text(value[config._climate_bound],value.unit||'');disabled=!value.available||!value.range;}
    else if(role==='choice'){const choice=value.choices[config._climate_kind];name=label(config._climate_choice);secondary=choice&&choice.selected===config._climate_choice?'Selected':'';disabled=pending||!choice||!choice.writable||!choice.values.includes(config._climate_choice);}
    else if(role==='defrost'){name='Defrost';secondary=!value.defrost.available?'Unavailable':value.defrost.state.state==='on'?'On':'Off';disabled=pending||!value.defrost.writable;}
    if(role&&record){secondary=record.phase==='sending'?'Sending…':record.phase==='pending'?'Awaiting HA':record.phase==='failed'?'Command failed':'Not confirmed';}
    return {name,secondary,disabled:role?disabled:false,active:!role&&active,colors:{center:role?SUBMENU_FILL:active?color:neutral,inner:role?SUBMENU_INNER:color,outer:OUTER},
        ariaLabel:[options.name,name,secondary,label(value.mode),label(value.action)].join(', ')};
}
function diagnostics({hass,config}){const value=model.state(hass,config._climate);return {available:value.available,range:value.range,unit_known:!!value.unit,temperature_writable:value.writable,defrost_source:value.defrost.reason,categories:Object.entries(value.choices).filter(([,v])=>v.values.length).map(([k])=>k)};}
module.exports={resolve,diagnostics,snapshot:model.snapshot,observe:registry.observe};
