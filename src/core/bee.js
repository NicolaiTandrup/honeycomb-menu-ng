// One mascot pipeline and preset. Context changes the primary action, not the art.
const merge=require('lodash/merge');
const {HONEYCOMB_BEE_PNG}=require('../brand/bee.generated');
const {versionLabel}=require('./version-label');
const {OUTER}=require('./submenu-theme');
const COLORS=Object.freeze({center:'#f2b705',inner_border:'#17191c',outer_border:OUTER,unavailable:'#20262d'});
const version=versionLabel(require('./build-info').version);
const FLIGHT_MS=430,REVEAL_MS=3000,ICON_PERCENT=58,VERSION_ICON_PERCENT=34;
function isBee(config){return !!config && (config.icon==='honeycomb:bee' || config.icon==='');}
function isBrand(config){return isBee(config) && (config.mode==='hub' || config._decorative_logo===true);}
function descriptor(overrides={},options={}) {
    const colors={...COLORS,...overrides.colors};
    for(const key of ['center','inner_border','outer_border'])if(!colors[key]||colors[key]==='auto')colors[key]=COLORS[key];
    const explicit=options.explicitCenter!==undefined?options.explicitCenter:!!(overrides.colors && overrides.colors.center && overrides.colors.center!=='auto');
    if(colors.fill_gradient===undefined)colors.fill_gradient=explicit?false:{type:'radial'};
    return merge({mode:'hub',icon:'honeycomb:bee',_decorative_logo:true,interactive:true,autoclose:false,
        show_name:false,show_label:false,show_brightness:'never',show_volume:'never',face_mode:'cell',
        tap_action:{action:'honeycomb-bee-flap'},hold_action:{action:'honeycomb-bee-flap'}},overrides,{colors,_bee_explicit_center:explicit},
        options.collapse?{tap_action:{action:'honeycomb-hub-collapse'},hold_action:{action:'honeycomb-bee-flap'}}:{});
}
function accessible(config,fallback) {
    if(!isBrand(config))return (fallback || config.name || config.entity || 'Honeycomb')+'. Alt+V inspects installed Honeycomb version.';
    const back=config.tap_action && config.tap_action.action==='honeycomb-hub-collapse';
    return back?'Back / Collapse Hub. Hold or Shift+Enter to inspect installed Honeycomb version.':'Honeycomb Bee. Inspect installed version; hold or Shift+Enter.';
}
function versionFont(){return Math.min(.12,.57/(Math.max(version.base.length,version.stage.length)*.65));}
module.exports={COLORS,asset:HONEYCOMB_BEE_PNG,version,FLIGHT_MS,REVEAL_MS,ICON_PERCENT,VERSION_ICON_PERCENT,isBee,isBrand,descriptor,accessible,versionFont};
