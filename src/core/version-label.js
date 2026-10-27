// A readable release label, separate from exact build/provenance diagnostics.
function versionLabel(version) {
    const match=typeof version==='string' && /^v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:-beta\.(0|[1-9]\d*)(?:-dev)?|-dev)?(?:\+[0-9A-Za-z.-]+)?$/.exec(version);
    if(!match)return {base:'Version',stage:'unavailable',text:'Version unavailable'};
    const base=`v${match[1]}`,stage=match[2]===undefined ? '' : `beta ${match[2]}`;
    return {base,stage,text:stage ? `${base} ${stage}` : base};
}
module.exports={versionLabel};
