'use strict';
const {execFileSync}=require('node:child_process');
function buildMetadata(version, revision, dirty=false) {
    if (!/-dev$/.test(version)) return {version,commit:null};
    if (!/^[0-9a-f]{40}$/.test(revision || '')) throw new Error('Development build needs a real Git source commit.');
    return {version:`${version}+${revision.slice(0,12)}${dirty ? '.dirty' : ''}`,commit:revision};
}
function localMetadata(version) {
    if (!/-dev$/.test(version)) return buildMetadata(version);
    const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const dirty=!!execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim();
    return buildMetadata(version,revision,dirty);
}
module.exports={buildMetadata,localMetadata};
