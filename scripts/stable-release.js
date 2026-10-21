'use strict';
// Manual stable publication: new immutable tag/draft only; never replace/delete.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {localArtifact,isStableVersion}=require('./check-release');
const {validateApproval,verifyApprovedSource}=require('./stable-approval');
const {parseVersion,classify,compareCore,fingerprint}=require('./release-retention');
const beta=require('./beta-release');
const {digest}=beta;
const ASSETS=['honeycomb-menu-ng.js','SHA256SUMS.txt','release-provenance.json'];
function validateInventory(records) {
    assert.ok(Array.isArray(records),'Incomplete release inventory');
    assert.ok(records.every(r=>r && Number.isSafeInteger(r.id) && r.id>0 && Array.isArray(r.assets)),'Invalid release inventory');
    assert.equal(new Set(records.map(r=>r.id)).size,records.length,'Duplicate release IDs');
}
function assertPublication({commit,checkout,master,ref,retention,tagExists,releaseExists}) {
    assert.match(commit,/^[a-f0-9]{40}$/,'Invalid expected commit');
    assert.equal(ref,'refs/heads/master','Publication must run from master');
    assert.equal(checkout,commit,'Checkout differs from tested commit');
    assert.equal(master,commit,'Master moved since validation');
    assert.equal(retention,'false','Retention must remain explicitly false for this release');
    assert.equal(tagExists,false,'Tag already exists; do not overwrite');
    assert.equal(releaseExists,false,'Release already exists; do not replace');
}
function context(env) {
    assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch','Manual workflow dispatch required');
    assert.equal(env.GITHUB_REF,'refs/heads/master','Publication must run from master');
    assert.match(env.EXPECTED_COMMIT || '',/^[a-f0-9]{40}$/,'Exact tested master SHA required');
    assert.equal(env.GITHUB_SHA,env.EXPECTED_COMMIT,'Workflow source differs from tested master');
    assert.equal(env.RELEASE_RETENTION_ENABLED,'false','Retention must remain explicitly false');
    assert.match(env.GITHUB_REPOSITORY || '',/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    return {repository:env.GITHUB_REPOSITORY,branch:'master',commit:env.EXPECTED_COMMIT};
}
function verifyTag(io,tag,commit) {
    const ref=io.api(`git/ref/tags/${encodeURIComponent(tag)}`);
    assert.equal(ref.ref,`refs/tags/${tag}`);assert.equal(ref.object.type,'commit');assert.equal(ref.object.sha,commit,'Tag source mismatch');
}
function verify(io,env,artifact) {
    const source=context(env);
    assert.ok(isStableVersion(artifact.version) && artifact.tag===`v${artifact.version}`,'Stable metadata required');
    assert.equal(io.git(['rev-parse','HEAD']),source.commit,'Checkout differs from tested master');
    const master=io.api('git/ref/heads/master');
    assert.equal(master.ref,'refs/heads/master');assert.equal(master.object.type,'commit');assert.equal(master.object.sha,source.commit,'Master moved since validation');
    const approval=validateApproval(JSON.parse(fs.readFileSync('release-approval.json')),artifact.version,source.repository);
    verifyApprovedSource(io,artifact,approval);
    const approved=approval.approved_beta;
    verifyTag(io,approved.tag,approved.commit);
    const record=io.api(`releases/tags/${encodeURIComponent(approved.tag)}`);
    assert.equal(record.tag_name,approved.tag);assert.equal(record.target_commitish,approved.commit);
    assert.equal(record.draft,false);assert.equal(record.prerelease,true,'Approved beta must be public prerelease');
    assert.ok(record.published_at && Number.isFinite(Date.parse(record.published_at)),'Approved beta publication date missing');
    const asset=record.assets.find(a=>a.name===artifact.filename);
    assert.ok(asset && record.assets.filter(a=>a.name===artifact.filename).length===1,'Approved beta asset missing/ambiguous');
    assert.equal(asset.state,'uploaded');assert.equal(asset.size,approved.bytes);assert.equal(asset.digest,`sha256:${approved.sha256}`,'Public approved beta checksum mismatch');
    const push=beta.latestRun(io,source,'push');
    if(env.VALIDATED_CI_RUN)assert.equal(String(push.id),env.VALIDATED_CI_RUN,'Validated master CI changed');
    return {...artifact,...source,approval,ci:{push}};
}
function assertAssets(release,expected,files) {
    assert.equal(release.tag_name,expected.tag);assert.equal(release.target_commitish,expected.commit);assert.equal(release.prerelease,false);
    assert.deepEqual(release.assets.map(a=>a.name).sort(),[...ASSETS].sort(),'Unexpected/missing assets');
    for (const name of ASSETS) {
        const asset=release.assets.find(a=>a.name===name);
        assert.equal(asset.state,'uploaded');assert.equal(asset.size,files[name].length,`Wrong size for ${name}`);
        assert.equal(asset.digest,`sha256:${digest(files[name])}`,`Wrong digest for ${name}`);
    }
    assert.equal(digest(files[expected.filename]),expected.sha256);assert.equal(files[expected.filename].length,expected.bytes);
    assert.equal(files['SHA256SUMS.txt'].toString(),`${expected.sha256}  ${expected.filename}\n`);
    assert.deepEqual(JSON.parse(files['release-provenance.json']),expected,'Provenance mismatch');
}
function assertRetained(before,after,newId) {
    validateInventory(before);validateInventory(after);
    assert.equal(after.length,before.length+1,'Unexpected inventory change');
    for(const old of before) {
        const retained=after.find(r=>r.id===old.id);assert.ok(retained,'Existing Release disappeared');
        assert.equal(fingerprint(retained),fingerprint(old),'Existing Release/assets changed');
    }
    assert.ok(after.some(r=>r.id===newId));
}
function inventory(io,expected) {
    const before=io.list('releases?per_page=100'),stable=io.api('releases/latest');
    validateInventory(before);
    assert.equal(classify(stable).kind,'stable','Latest stable is unknown/conflicting');
    assert.ok(before.every(r=>classify(r).kind!=='ambiguous'),'Unknown/conflicting release inventory');
    const versions=before.filter(r=>!r.draft).map(r=>parseVersion(r.tag_name).normalized);
    assert.equal(new Set(versions).size,versions.length,'Duplicate normalized release versions');
    assert.equal(fingerprint(before.find(r=>r.id===stable.id) || {}),fingerprint(stable),'Latest stable inventory mismatch');
    const current=parseVersion(expected.tag);
    assert.ok(compareCore(parseVersion(stable.tag_name),current)<0,'Refusing duplicate or older stable version');
    assert.ok(before.every(r=>classify(r).kind!=='stable' || compareCore(parseVersion(r.tag_name),current)<0),'Higher stable version or duplicate stable exists');
    const refs=io.list(`git/matching-refs/tags/${encodeURIComponent(expected.tag)}?per_page=100`);
    assertPublication({commit:expected.commit,checkout:io.git(['rev-parse','HEAD']),master:io.api('git/ref/heads/master').object.sha,
        ref:'refs/heads/master',retention:'false',tagExists:refs.some(r=>r.ref===`refs/tags/${expected.tag}`),
        releaseExists:before.some(r=>{const v=parseVersion(r.tag_name);return v && !v.pre.length && compareCore(v,current)===0;})});
    return {before,stable};
}
async function newDraft(io,expected) {
    for(let attempt=0;attempt<4;attempt++) {
        const matches=io.list('releases?per_page=100').filter(r=>r.tag_name===expected.tag);
        assert.ok(matches.length<=1,'Conflicting new stable draft inventory');
        if(!matches.length) {
            if(attempt===3)assert.fail('New stable draft still unavailable after 4 reads; preserve tag/draft for inspection');
            await (io.wait || (ms=>new Promise(resolve=>setTimeout(resolve,ms))))(1000*(attempt+1));continue;
        }
        const id=matches[0].id;assert.ok(Number.isSafeInteger(id) && id>0);
        const release=io.api(`releases/${id}`);
        assert.equal(release.id,id);assert.equal(release.tag_name,expected.tag);assert.equal(release.target_commitish,expected.commit);
        assert.equal(release.draft,true);assert.equal(release.prerelease,false);return release;
    }
}
function filesFor(expected,bundle) {
    return {[expected.filename]:bundle,'SHA256SUMS.txt':Buffer.from(`${expected.sha256}  ${expected.filename}\n`),
        'release-provenance.json':Buffer.from(JSON.stringify(expected,null,2)+'\n')};
}
async function publish(io,expected,output,env,artifact) {
    assert.equal(env.STABLE_PUBLICATION_AUTHORIZED,'true','Explicit manual publish=true required');
    const prepared=filesFor(expected,fs.readFileSync(artifact.filename));
    for(const name of ASSETS)assert.deepEqual(fs.readFileSync(path.join(output,name)),prepared[name],`Verified artifact ${name} changed`);
    assert.deepEqual(verify(io,env,artifact),expected,'Tested provenance changed');
    const {before,stable}=inventory(io,expected);
    let notes=fs.readFileSync('RELEASE_NOTES.md','utf8').split('\n---\n')[0];
    assert.ok(notes.startsWith(`# v${artifact.version} — Stable\n`),'Stable release notes/version mismatch');
    assert.equal(JSON.parse(fs.readFileSync('release.json')).title,`Honeycomb NG ${expected.tag} — Stable`);
    notes=notes.replace(/\]\((docs\/[^)]+)\)/g,(_,file)=>`](https://github.com/${expected.repository}/blob/${expected.tag}/${file})`);
    notes+=`\n\nTested master commit: \`${expected.commit}\`. Approved beta: \`${expected.approval.approved_beta.tag}\` at \`${expected.approval.approved_beta.commit}\`.\nBundle SHA-256: \`${expected.sha256}\` (${expected.bytes} bytes).\nValidated [master CI](https://github.com/${expected.repository}/actions/runs/${expected.ci.push.id}).\n`;
    const noteFile=path.join(output,'release-notes.md');fs.writeFileSync(noteFile,notes);
    io.api('git/refs','POST',{ref:`refs/tags/${expected.tag}`,sha:expected.commit});verifyTag(io,expected.tag,expected.commit);
    io.gh(['release','create',expected.tag,'--verify-tag','--target',expected.commit,'--draft','--latest=false','--title',`Honeycomb NG ${expected.tag} — Stable`,
        '--notes-file',noteFile,...ASSETS.map(name=>path.join(output,name))]);
    let release=await newDraft(io,expected);
    const dir=path.join(output,'downloaded');fs.mkdirSync(dir,{recursive:true});
    io.gh(['release','download',expected.tag,'--dir',dir]);
    const files=Object.fromEntries(ASSETS.map(name=>[name,fs.readFileSync(path.join(dir,name))]));
    for(const name of ASSETS)assert.deepEqual(files[name],prepared[name],`Downloaded ${name} differs`);
    assertAssets(release,expected,files);
    assert.deepEqual(verify(io,env,artifact),expected,'Master/CI/approval changed during staging');
    verifyTag(io,expected.tag,expected.commit);
    assert.equal(fingerprint(io.api('releases/latest')),fingerprint(stable),'Latest stable changed during staging');
    assertRetained(before,io.list('releases?per_page=100'),release.id);
    const fresh=io.api(`releases/${release.id}`);assert.equal(fresh.id,release.id);assert.equal(fresh.draft,true);assertAssets(fresh,expected,files);
    release=io.api(`releases/${release.id}`,'PATCH',{draft:false,prerelease:false,make_latest:'true'});
    assert.equal(release.draft,false);assertAssets(release,expected,files);
    assert.equal(io.api('releases/latest').id,release.id,'Stable release is not latest');
    verifyTag(io,expected.tag,expected.commit);assertRetained(before,io.list('releases?per_page=100'),release.id);
    return release;
}
function backend(repo) {
    return {...beta.backend(repo),readGit:(commit,file)=>execFileSync('git',['show',`${commit}:${file}`],{stdio:['pipe','pipe','pipe']})};
}
async function main() {
    const env=process.env,source=context(env),artifact=localArtifact(true),output=env.RELEASE_OUTPUT;
    assert.ok(output);fs.mkdirSync(output,{recursive:true});
    const io=backend(source.repository);
    if(env.PUBLICATION_MODE==='prepare') {
        const expected=verify(io,env,artifact);inventory(io,expected);
        for(const [name,bytes]of Object.entries(filesFor(expected,fs.readFileSync(artifact.filename))))fs.writeFileSync(path.join(output,name),bytes);
        if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,`commit=${expected.commit}\nrun_id=${expected.ci.push.id}\n`);
        console.log(`Verified ${artifact.tag} from approved ${expected.approval.approved_beta.tag}; master CI ${expected.ci.push.id}`);return;
    }
    assert.equal(env.PUBLICATION_MODE,'publish','Explicit publication mode required');
    const expected=JSON.parse(fs.readFileSync(path.join(output,'release-provenance.json')));
    assert.equal(expected.commit,source.commit);for(const key of Object.keys(artifact))assert.equal(expected[key],artifact[key],`Verified artifact ${key} changed`);
    const release=await publish(io,expected,output,env,artifact);
    fs.writeFileSync(path.join(output,'published.json'),JSON.stringify({id:release.id,url:release.html_url,...expected},null,2)+'\n');
    if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,`release_id=${release.id}\nversion=${artifact.version}\nurl=${release.html_url}\n`);
    console.log(`Published ${artifact.tag} at ${source.commit}; sha256=${artifact.sha256}`);
}
module.exports={assertPublication,assertAssets,assertRetained,context,verify,inventory,newDraft,filesFor,publish,backend,digest};
if(require.main===module)main().catch(error=>{
    const status=/HTTP\s+(\d{3})/.exec(String(error.stderr || ''));
    console.error(error.code==='ERR_ASSERTION' ? error.message : `Stable verification/publication failed${status?' HTTP '+status[1]:''}.`);
    console.error('Stopped. Inspect any new tag/draft; no state will be deleted, forced or overwritten.');process.exitCode=1;
});
