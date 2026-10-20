'use strict';
// Publication adapter: create a new tag/release; never delete, replace or force refs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {localArtifact} = require('./check-release');
const {parseVersion, classify, compareCore} = require('./release-retention');
const BASELINE = '7706859016872ee95bde4299b10a07c072fa38b6';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function assertPublication({commit, checkout, master, ref, retention, tagExists, releaseExists}) {
    assert.match(commit, /^[a-f0-9]{40}$/, 'Invalid expected commit');
    assert.equal(ref, 'refs/heads/master', 'Publication must run from master');
    assert.equal(checkout, commit, 'Checkout differs from tested commit');
    assert.equal(master, commit, 'Master moved since validation');
    assert.equal(retention, 'false', 'Retention must remain explicitly false for this release');
    assert.equal(tagExists, false, 'Tag already exists; do not overwrite');
    assert.equal(releaseExists, false, 'Release already exists; do not replace');
}
function assertAssets(release, expected, files) {
    assert.equal(release.tag_name, expected.tag);
    assert.equal(release.target_commitish, expected.commit);
    assert.equal(release.prerelease, false);
    const names = ['honeycomb-menu-ng.js', 'SHA256SUMS.txt', 'release-provenance.json'];
    assert.deepEqual(release.assets.map(a => a.name).sort(), [...names].sort(), 'Unexpected/missing assets');
    for (const name of names) {
        const asset = release.assets.find(a => a.name === name);
        assert.equal(asset.state, 'uploaded', `Incomplete ${name}`);
        assert.equal(asset.size, files[name].length, `Wrong size for ${name}`);
        if (asset.digest) assert.equal(asset.digest, `sha256:${digest(files[name])}`, `Wrong digest for ${name}`);
    }
    assert.equal(digest(files['honeycomb-menu-ng.js']), expected.sha256);
    assert.equal(files['SHA256SUMS.txt'].toString(), `${expected.sha256}  honeycomb-menu-ng.js\n`);
    const provenance = JSON.parse(files['release-provenance.json']);
    for (const key of ['version', 'tag', 'commit', 'sha256', 'bytes', 'filename']) assert.equal(provenance[key], expected[key], `Provenance ${key} mismatch`);
}
function assertRetained(before, after, newId) {
    const signature = release => JSON.stringify({id: release.id, tag: release.tag_name, draft: release.draft, prerelease: release.prerelease,
        published_at: release.published_at, assets: release.assets.map(a => [a.id, a.name, a.size]).sort((a,b)=>a[0]-b[0])});
    assert.equal(after.length, before.length + 1, 'Unexpected inventory change');
    for (const release of before) assert.equal(signature(after.find(r => r.id === release.id) || {assets: []}), signature(release), 'An existing Release changed/disappeared');
    assert.ok(after.some(r => r.id === newId));
}
function backend() {
    const repo = process.env.GITHUB_REPOSITORY;
    assert.match(repo || '', /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/);
    const gh = args => execFileSync('gh', args, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']});
    const api = (route, method = 'GET', data) => JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${route}`, '--method', method,
        ...(data ? ['--input', '-'] : [])], {encoding:'utf8', input: data ? JSON.stringify(data) : undefined, stdio:['pipe','pipe','pipe']}));
    return {
        api, gh,
        git: args => execFileSync('git', args, {encoding: 'utf8'}).trim(),
        list: () => gh(['api', `repos/${repo}/releases`, '--paginate', '--jq', '.[] | @json']).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)),
        tagExists: tag => Boolean(gh(['api', `repos/${repo}/git/matching-refs/tags/${tag}`, '--jq', '.[].ref']).split('\n').includes(`refs/tags/${tag}`)),
    };
}
async function publish(io, expected, output) {
    const before = io.list();
    const currentStable = io.api('releases/latest');
    assert.equal(classify(currentStable).kind, 'stable', 'Latest stable is unknown/conflicting');
    assert.ok(compareCore(parseVersion(currentStable.tag_name), parseVersion(expected.tag)) < 0, 'Refusing a duplicate or older stable version');
    assert.ok(before.every(r => classify(r).kind !== 'ambiguous'), 'Unknown/conflicting release inventory');
    assert.ok(before.some(r => r.id === currentStable.id && r.tag_name === currentStable.tag_name && classify(r).kind === 'stable'), 'Latest stable changed while taking inventory');
    assert.ok(before.every(r => classify(r).kind !== 'stable' || compareCore(parseVersion(r.tag_name),parseVersion(expected.tag)) <= 0), 'Higher stable version exists in inventory');
    assertPublication({commit:expected.commit, checkout:io.git(['rev-parse','HEAD']), master:io.api('branches/master').commit.sha,
        ref:process.env.GITHUB_REF, retention:process.env.RELEASE_RETENTION_ENABLED,
        tagExists:io.tagExists(expected.tag), releaseExists:before.some(r=>{const v=parseVersion(r.tag_name);return v && !v.pre.length && compareCore(v,parseVersion(expected.tag))===0;})});
    io.git(['merge-base', '--is-ancestor', BASELINE, expected.commit]);
    assert.equal(io.git(['diff', BASELINE, expected.commit, '--', 'src']), '', 'Unapproved runtime features; source must match approved baseline');
    let notes = fs.readFileSync('RELEASE_NOTES.md','utf8').split('\n---\n')[0];
    if(process.env.GITHUB_REPOSITORY)notes=notes.replace(/\]\((docs\/[^)]+)\)/g,(_,file)=>`](https://github.com/${process.env.GITHUB_REPOSITORY}/blob/${expected.tag}/${file})`);
    notes+=`\n\nTested master commit: \`${expected.commit}\`. Bundle SHA-256: \`${expected.sha256}\` (${expected.bytes} bytes).`;
    if(process.env.VALIDATED_CI_RUN)notes+=`\nValidated [master CI](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.VALIDATED_CI_RUN}).`; 
    assert.ok(notes.startsWith('# v1.7.0 — Stable'));
    const noteFile = path.join(output,'release-notes.md');fs.writeFileSync(noteFile,notes+'\n');
    io.api('git/refs', 'POST', {ref:`refs/tags/${expected.tag}`,sha:expected.commit});
    assert.equal(io.api(`git/ref/tags/${expected.tag}`).object.sha, expected.commit, 'New tag differs from tested master');
    io.gh(['release','create',expected.tag,'--verify-tag','--target',expected.commit,'--draft','--title','Honeycomb NG v1.7.0 — Stable',
        '--notes-file',noteFile, ...['honeycomb-menu-ng.js','SHA256SUMS.txt','release-provenance.json'].map(name=>path.join(output,name))]);
    let release = io.list().find(r => r.tag_name === expected.tag);
    assert.ok(release, 'New draft release not found in authenticated inventory');
    assert.equal(release.draft,true);
    const verifyDir = path.join(output,'downloaded');fs.mkdirSync(verifyDir,{recursive:true});
    io.gh(['release','download',expected.tag,'--dir',verifyDir]);
    const files=Object.fromEntries(['honeycomb-menu-ng.js','SHA256SUMS.txt','release-provenance.json'].map(name=>[name,fs.readFileSync(path.join(verifyDir,name))]));
    for (const [name,bytes] of Object.entries(files)) assert.deepEqual(bytes,fs.readFileSync(path.join(output,name)),`Downloaded ${name} differs`);
    assertAssets(release,expected,files);
    // Recheck both master and the disabled gate immediately before making public.
    assert.equal(io.api('branches/master').commit.sha,expected.commit,'Master moved before publication');
    assert.equal(process.env.RELEASE_RETENTION_ENABLED,'false');
    assertRetained(before,io.list(),release.id);
    release=io.api(`releases/${release.id}`,'PATCH',{draft:false,prerelease:false,make_latest:'true'});
    assert.equal(release.draft,false);assertAssets(release,expected,files);
    assert.equal(io.api('releases/latest').id,release.id,'Stable release is not latest');
    assert.equal(io.api(`git/ref/tags/${expected.tag}`).object.sha,expected.commit);
    assertRetained(before,io.list(),release.id);
    return release;
}
async function main() {
    const output=process.env.RELEASE_OUTPUT;
    assert.ok(output);
    fs.mkdirSync(output,{recursive:true});
    const artifact=localArtifact(true), commit=process.env.EXPECTED_COMMIT;
    const expected={...artifact,commit};
    const prepared={
        [artifact.filename]:fs.readFileSync(artifact.filename),
        'SHA256SUMS.txt':Buffer.from(`${artifact.sha256}  ${artifact.filename}\n`),
        'release-provenance.json':Buffer.from(JSON.stringify(expected,null,2)+'\n')
    };
    if (process.env.PUBLICATION_MODE === 'prepare') {
        for(const[name,bytes]of Object.entries(prepared))fs.writeFileSync(path.join(output,name),bytes);
        return;
    }
    assert.equal(process.env.PUBLICATION_MODE,'publish','Explicit publication mode required');
    for(const[name,bytes]of Object.entries(prepared))assert.deepEqual(fs.readFileSync(path.join(output,name)),bytes,`Verified artifact ${name} changed; no mutation allowed`);
    const release=await publish(backend(),expected,output);
    fs.writeFileSync(path.join(output,'published.json'),JSON.stringify({id:release.id,url:release.html_url,commit,sha256:artifact.sha256},null,2)+'\n');
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`release_id=${release.id}\nversion=${artifact.version}\nurl=${release.html_url}\n`);
    console.log(`Published ${artifact.tag} at ${commit}; sha256=${artifact.sha256}`);
}
module.exports={assertPublication,assertAssets,assertRetained,publish,digest};
if(require.main===module)main().catch(error=>{
    const status=/HTTP\s+(\d{3})/.exec(String(error.stderr||''));
    console.error(error.code==='ERR_ASSERTION' ? error.message : `GitHub publication command failed${status ? ' HTTP '+status[1] : ''}.`);
    console.error('Stable release stopped. Inspect any new tag/draft; nothing will be removed, forced or overwritten.');process.exitCode=1;
});
