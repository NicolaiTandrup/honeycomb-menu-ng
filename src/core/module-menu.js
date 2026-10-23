// A nested module descriptor uses the same module/entity keys as Hub/Control.
// The shared controller still owns anchors, entity inheritance and real Back depth.
function expandModuleMenu(config,hass) {
    if(!config||!config.module||config.buttons!==undefined)return config;
    const {moduleRegistry}=require('../modules');
    const selected=moduleRegistry.get(config.module);
    if(!selected||typeof selected.buildMenu!=='function')throw Error('Nested module is not supported.');
    const launcher=require('./cube-config').buildCubeConfig(config,hass);
    const {menu,...face}=launcher;
    if(!menu)throw Error('Nested module has no menu.');
    // An explicit child module can enter from an ordinary/classic parent too.
    // Give the controller a real native center so it applies the same promotion
    // and one-level Back policy as an existing persistent parent.
    const center=menu.promoted_center && {...menu.promoted_center,...face};
    return {...menu,nested_expand:true,...(center ? {promoted_center:center,persistent_center:{...center,interactive:true,tap_action:{action:'honeycomb-back'}}} : {})};
}
module.exports={expandModuleMenu};
