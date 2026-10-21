// HA exposes native Kelvin bounds and integer Kelvin commands, but no standard
// hardware Kelvin step. Use 1 K precision; never infer mired/hue capabilities.
function normalizeRange(min,max)
{
    if (typeof min!=='number' || typeof max!=='number' || !Number.isFinite(min) || !Number.isFinite(max) || min<=0 || max<min) return null;
    min=Math.ceil(min);max=Math.floor(max);
    return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min<=max ? {min,max,step:1} : null;
}
function nativeRange(state)
{
    const attrs=state && state.attributes || {};
    return state && !['unknown','unavailable'].includes(state.state) && Array.isArray(attrs.supported_color_modes) && attrs.supported_color_modes.includes('color_temp')
        ? normalizeRange(attrs.min_color_temp_kelvin,attrs.max_color_temp_kelvin) : null;
}
function validPalette(palette,range)
{
    return !!range && Array.isArray(palette) && palette.length===12 && palette.every((value,i)=>
        Number.isSafeInteger(value) && value>=range.min && value<=range.max && (!i || value>=palette[i-1]));
}
function initialPalette(range)
{
    if (!range) return [];
    return Array.from({length:12},(_,i)=>Math.round(range.min+(range.max-range.min)*i/11));
}
function refineKelvinPalette(palette,selected,range)
{
    if (!validPalette(palette,range) || !Number.isInteger(selected) || selected<0 || selected>=12)
        throw new Error('Kelvin zoom requires twelve bounded ordered integer samples and a physical index.');
    const gap=Math.min(...palette.slice(1).map((value,i)=>value-palette[i]));
    if (gap<1) return null; // Narrow original ranges cannot supply twelve unique values.
    const step=Math.max(1,Math.floor(gap/2)),anchor=palette[selected];
    const result=palette.map((_,i)=>anchor+(i-selected)*step);
    // The smaller uniform gap keeps both edges inside the previous/native range.
    if (!validPalette(result,range) || result[0]<palette[0] || result[11]>palette[11]) return null;
    return result.every((value,i)=>value===palette[i]) ? null : result;
}
module.exports={normalizeRange,nativeRange,validPalette,initialPalette,refineKelvinPalette};
