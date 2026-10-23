const {merge,persistentLauncher}=require('../shared');
const {settings}=require('./config');
const presentation=require('./presentation');
const {registerActions}=require('./actions');
function face(options) {
    return {entity:options.entity,mode:options.aggregate ? 'charger-summary' : 'charger',_charger:options,
        icon:'mdi:ev-station',show_name:true,show_label:true,show_brightness:'never',show_volume:'never'};
}
function buildMenu({item}) {
    const options=settings(item);
    if (options.aggregate) return null;
    const roles=['enabled','permanent_lock','session_energy','vehicle','current','details'];
    const icons=['mdi:power','mdi:lock','mdi:counter','mdi:car-electric','mdi:current-ac','mdi:information-outline'];
    return {entity:options.entity,nested_expand:true,promote_to_center:true,promoted_center:face(options),empty_slots:'hidden',idle_timeout:8000,
        buttons:roles.map((role,index)=>({...face(options),mode:'charger-field',_charger_field:role,
            slot:index+1,slot_mode:'hard',icon:icons[index],autoclose:false,
            tap_action:index < 2 ? {action:'honeycomb-charger-toggle',role} : role === 'details' ? {action:'more-info'} : {action:'none'}}))};
}
function buildLauncher({item,index,slot,submenu}) {
    const options=settings(item);
    return persistentLauncher({item,index,slot,submenu,mode:options.aggregate ? 'charger-summary' : 'charger',fallbackIcon:'mdi:ev-station',
        tapAction:submenu ? {action:'honeycomb-open-nested',honeycomb_nested_menu:submenu} : {action:'none'},
        extra:{...face(options),name:options.name,autoclose:false}});
}
module.exports={id:'charger',aliases:['charging-hub'],priority:600,launcherKind:'persistent',
    persistentModes:['charger','charger-summary','charger-field'],presentation,registerActions,
    matches:item=>item.type === 'charger' || item.type === 'charging-hub',buildMenu,buildLauncher,settings};
