const model=require('./model');
const ICONS={hvac:'mdi:thermostat',preset:'mdi:star',fan:'mdi:fan',swing:'mdi:swap-vertical',horizontal:'mdi:swap-horizontal',defrost:'mdi:snowflake-melt',targets:'mdi:thermometer-lines'};
const NAMES={hvac:'HVAC mode',preset:'Presets',fan:'Fan',swing:'Swing',horizontal:'Horizontal',defrost:'Defrost'};
function face(options,role,extra={}) {
    return {entity:options.entity,mode:role?'climate-field':'climate',_climate:options,_climate_role:role||null,
        ...(role?{border:{inner_width:0}}:{}),icon:ICONS[role]||'mdi:thermometer',show_name:true,show_label:true,show_brightness:'never',show_volume:'never',autoclose:false,...extra};
}
function base(options,view,bound=null) {
    return {entity:options.entity,nested_expand:true,promote_to_center:true,promoted_center:face(options,null,{_climate_bound:bound}),
        empty_slots:'hidden',_climate_frame:{entity:options.entity,view,bound},buttons:[]};
}
function openAction(view){return {action:'honeycomb-climate-open',view};}
function main(options,bound=null) {
    const menu=base(options,'main',bound);menu.idle_timeout=8000;
    menu.promoted_center.hold_action=openAction('targets');
    menu.buttons=[
        face(options,'adjust',{slot:1,slot_mode:'hard',icon:'mdi:chevron-double-up',_climate_multiple:2,_climate_bound:bound,tap_action:{action:'honeycomb-climate-adjust',multiple:2,bound}}),
        face(options,'hvac',{slot:2,slot_mode:'hard',tap_action:openAction('hvac')}),
        face(options,'categories',{slot:3,slot_mode:'hard',icon:'mdi:tune',tap_action:openAction('categories')}),
        face(options,'adjust',{slot:4,slot_mode:'hard',icon:'mdi:chevron-double-down',_climate_multiple:-2,_climate_bound:bound,tap_action:{action:'honeycomb-climate-adjust',multiple:-2,bound}}),
        face(options,'adjust',{slot:5,slot_mode:'hard',icon:'mdi:minus',_climate_multiple:-1,_climate_bound:bound,tap_action:{action:'honeycomb-climate-adjust',multiple:-1,bound}}),
        face(options,'adjust',{slot:6,slot_mode:'hard',icon:'mdi:plus',_climate_multiple:1,_climate_bound:bound,tap_action:{action:'honeycomb-climate-adjust',multiple:1,bound}})
    ];return menu;
}
function build(options,value,view) {
    const menu=base(options,view);
    if(view==='targets') {
        if(!value.range)return null;
        menu.buttons=['low','high'].map((bound,i)=>face(options,'target',{slot:i+1,slot_mode:'hard',_climate_bound:bound,tap_action:{action:'honeycomb-climate-open',view:'main',bound}}));
    } else if(view==='categories') {
        menu.buttons=Object.keys(model.CHOICES).filter(kind=>value.choices[kind].values.length).map(kind=>face(options,'category',{slot:Object.keys(model.CHOICES).indexOf(kind)+1,slot_mode:'hard',_climate_kind:kind,icon:ICONS[kind],tap_action:openAction(kind)}));
        if(value.defrost.entity)menu.buttons.push(face(options,'defrost',{slot:6,slot_mode:'hard',tap_action:{action:'honeycomb-climate-set',kind:'defrost'}}));
    } else if(model.CHOICES[view]) {
        menu.buttons=value.choices[view].values.map((choice,i)=>face(options,'choice',{slot:i+1,slot_mode:'hard',_climate_kind:view,_climate_choice:choice,icon:ICONS[view],tap_action:{action:'honeycomb-climate-set',kind:view,value:choice}}));
    } else return null;
    return menu;
}
module.exports={ICONS,NAMES,face,main,build};
