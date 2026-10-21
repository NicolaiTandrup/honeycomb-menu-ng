// Renderer capability prototype: receives normalized semantics, no vendor logic.
(function(root){
 function enabled(state){return state.enabled!==false && state.active===true && state.available===true && state.fault!==true && typeof state.powerW==='number' && Number.isFinite(state.powerW) && state.powerW>0;}
 function attach(host,state){
  host.dataset.wave=String(enabled(state));
  const visibility=()=>host.dataset.pageVisible=String(!document.hidden);
  visibility();document.addEventListener('visibilitychange',visibility);
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)host.dataset.visible=String(e.isIntersecting);}):null;
  if(observer)observer.observe(host);else host.dataset.visible='false'; // Fail to static, not busy offscreen motion.
  return {update:next=>host.dataset.wave=String(enabled(next)),dispose:()=>{if(observer)observer.disconnect();document.removeEventListener('visibilitychange',visibility);host.dataset.wave='false';}};
 }
 if(typeof module!=='undefined')module.exports={enabled};else root.wavePrototype={enabled,attach};
})(typeof window!=='undefined'?window:globalThis);
