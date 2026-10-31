const model=require('./model');
const registry=require('../../core/ha-capability-registry');
const ACK_MS=15000;
function notifyUser(message){if(typeof document==='undefined')return;const root=document.querySelector('home-assistant');if(root)root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message},bubbles:true,composed:true}));}
function recordFor(hass,value,now=Date.now()) {
    const store=registry.session(hass);if(!store)return null;
    for(const id of [value.options.entity,value.defrost.entity].filter(Boolean)) {
        const record=store.commands.get(id);if(!record)continue;
        const source=(hass.states||{})[id];
        if(!model.absent(source)&&Object.entries(record.expected).every(([field,wanted])=>field==='state'?source.state===wanted:typeof wanted==='number'?model.numeric((source.attributes||{})[field])!==null&&Math.abs(model.numeric((source.attributes||{})[field])-wanted)<1e-6:(source.attributes||{})[field]===wanted)) {
            record.confirmed=true;clearTimeout(record.timer);store.commands.delete(id);continue;
        }
        if(record.deadline<=now&&record.phase!=='failed'){record.phase='unconfirmed';clearTimeout(record.timer);}
        return record;
    }
    return null;
}
function open(context) {
    const {itemConfig,actionConfig,openNested,isCurrent=()=>true,getHass=()=>context.hass}=context;
    const options=itemConfig&&itemConfig._climate;if(!options||!isCurrent()||!openNested)return false;
    const value=model.state(getHass(),options),view=actionConfig.view;
    if(!value.available)return false;
    if(view==='main'&&(!value.range||!['low','high'].includes(actionConfig.bound)))return false;
    const frame=(context.menuConfig||{})._climate_frame;
    if(frame&&frame.entity===options.entity&&frame.view===view&&(frame.bound||null)===(actionConfig.bound||null))return false;
    const menus=require('./menus');
    const menu=view==='main'?menus.main(options,actionConfig.bound):menus.build(options,value,view);
    if(!menu||!menu.buttons.length)return false;
    openNested(menu);return true;
}
async function command(context) {
    const {itemConfig,actionConfig,isCurrent=()=>true,getHass=()=>context.hass,notify=notifyUser}=context;
    const options=itemConfig&&itemConfig._climate;if(!['honeycomb-climate-adjust','honeycomb-climate-set'].includes(actionConfig.action))return false;
    if(!options||!options.interactive||itemConfig.interactive===false||!isCurrent())return false;
    const hass=getHass(),value=model.state(hass,options),store=registry.session(hass);
    if(!store||!value.available)return false;
    const prior=recordFor(hass,value);if(prior&&['sending','pending'].includes(prior.phase))return false;
    let domain='climate',service,data={},target=options.entity,expected={};
    if(actionConfig.action==='honeycomb-climate-adjust') {
        if(itemConfig._climate_role!=='adjust'||actionConfig.delta!==itemConfig._climate_delta||actionConfig.bound!==itemConfig._climate_bound)return false;
        if(value.range&&!actionConfig.bound)return open({...context,actionConfig:{view:'targets'}});
        if(!value.range&&actionConfig.bound)return false;
        data=model.adjustment(value,actionConfig.delta,actionConfig.bound);if(!data)return false;
        service='set_temperature';expected={...data};
    } else {
        const kind=actionConfig.kind;
        if(kind==='defrost'){
            if(itemConfig._climate_role!=='defrost'||!value.defrost.writable)return false;
            domain='switch';target=value.defrost.entity;const desired=value.defrost.state.state==='on'?'off':'on';service='turn_'+desired;expected={state:desired};
        } else {
            const choice=value.choices[kind];
            if(itemConfig._climate_role!=='choice'||kind!==itemConfig._climate_kind||actionConfig.value!==itemConfig._climate_choice||!choice||!choice.writable||!choice.values.includes(actionConfig.value))return false;
            service=choice.service;const field=model.CHOICES[kind][3];data={[field]:actionConfig.value};expected={[kind==='hvac'?'state':field]:actionConfig.value};
            if(choice.selected===actionConfig.value)return false;
        }
    }
    if(store.commands.size>=128&&!store.commands.has(target)){
        for(const [key,r]of store.commands)if(!['sending','pending'].includes(r.phase)){clearTimeout(r.timer);store.commands.delete(key);break;}
        if(store.commands.size>=128){notify('Too many pending Climate controls. Wait for Home Assistant confirmation.');return false;}
    }
    if(prior)clearTimeout(prior.timer);
    const record={phase:'sending',expected,deadline:Date.now()+ACK_MS};store.commands.set(target,record);
    record.timer=setTimeout(()=>{if(store.commands.get(target)===record){record.phase='unconfirmed';registry.notify(store);}},ACK_MS);registry.notify(store);
    let requestTimer;
    try {
        await Promise.race([hass.callService(domain,service,data,{entity_id:target}),new Promise((_,reject)=>{requestTimer=setTimeout(()=>reject(Error('timeout')),ACK_MS);})]);
        record.phase='pending';recordFor(getHass(),model.state(getHass(),options));registry.notify(store);return true;
    } catch(_){if(record.confirmed)return true;record.phase='failed';clearTimeout(record.timer);registry.notify(store);notify('Climate command failed or timed out. Check Home Assistant before retrying; no automatic retry.');return false;}
    finally{clearTimeout(requestTimer);}
}
function registerActions(actions){actions.register('honeycomb-climate-open',open);for(const name of ['honeycomb-climate-adjust','honeycomb-climate-set'])actions.register(name,c=>{void command(c);return true;});}
module.exports={ACK_MS,recordFor,open,command,registerActions};
