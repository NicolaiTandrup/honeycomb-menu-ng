const {persistentLauncher}=require('../shared');
const {settings}=require('./model');
const menus=require('./menus');
const presentation=require('./presentation');
const {registerActions}=require('./actions');
function buildMenu({item}){return menus.main(settings(item));}
function buildLauncher({item,index,slot,submenu}){
    const options=settings(item);
    return persistentLauncher({item,index,slot,submenu,mode:'climate',fallbackIcon:'mdi:thermometer',tapAction:{action:'honeycomb-open-menu'},extra:{...menus.face(options),autoclose:false}});
}
module.exports={id:'climate',priority:500,launcherKind:'persistent',persistentModes:['climate','climate-field'],presentation,registerActions,buildMenu,buildLauncher,matches:item=>item.type==='climate'||item.module==='climate'};
