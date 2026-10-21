'use strict';
// Manual beta publication only. Never force refs, overwrite assets or delete state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {isBetaVersion} = require('./beta-version');
const {localBetaArtifact} = require('./check-beta');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const ASSETS = ['honeycomb-menu-ng.js', 'SHA256SUMS.txt', 'release-provenance.json'];
const encodeRef = branch => branch.split('/').map(encodeURIComponent).join('/');

function context(env) {
    assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch', 'Manual workflow dispatch required');
    assert.match(env.GITHUB_REF || '', /^refs\/heads\/.+$/, 'Select a Git branch, never a tag');
    assert.match(env.EXPECTED_COMMIT || '', /^[a-f0-9]{40}$/, 'Full tested commit SHA required');
    assert.equal(env.GITHUB_SHA, env.EXPECTED_COMMIT, 'Workflow source differs from tested commit');
    assert.match(env.GITHUB_REPOSITORY || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    const version = (env.EXPECTED_TAG || '').replace(/^v/, '');
    assert.ok(isBetaVersion(version) && env.EXPECTED_TAG === `v${version}`, 'Expected tag must be a SemVer vMAJOR.MINOR.PATCH-beta.N');
    return {repository: env.GITHUB_REPOSITORY, branch: env.GITHUB_REF.slice('refs/heads/'.length), commit: env.EXPECTED_COMMIT, tag: env.EXPECTED_TAG};
}
function assertRun(run, expected, event, pr) {
    assert.equal(run.path, '.github/workflows/build.yml', 'Wrong CI workflow');
    assert.equal(run.head_sha, expected.commit, 'CI commit mismatch');
    assert.equal(run.head_branch, expected.branch, 'CI branch mismatch');
    assert.equal(run.head_repository && run.head_repository.full_name, expected.repository, 'CI repository mismatch');
    assert.equal(run.event, event, 'Wrong CI event');
    assert.equal(run.status, 'completed', 'CI is not completed');
    assert.equal(run.conclusion, 'success', 'CI is not green');
    assert.ok(Number.isSafeInteger(run.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, 'Invalid CI identity');
    if (pr) assert.ok((run.pull_requests || []).some(p => p.number === pr.number && p.head.sha === expected.commit), 'CI does not match open PR');
}
function latestRun(io, expected, event, pr) {
    const runs = io.list(`actions/workflows/build.yml/runs?head_sha=${expected.commit}&branch=${encodeURIComponent(expected.branch)}&event=${event}&per_page=100`, '.workflow_runs[]');
    const matching = runs.filter(r => r.head_sha === expected.commit && r.head_branch === expected.branch && r.event === event &&
        r.path === '.github/workflows/build.yml' && r.head_repository && r.head_repository.full_name === expected.repository &&
        (!pr || (r.pull_requests || []).some(p => p.number === pr.number)));
    matching.sort((a,b) => b.id - a.id);
    assert.ok(matching.length, `No matching ${event} CI${pr ? ` for PR #${pr.number}` : ''}`);
    // Never fall back to an older success when the newest run failed or is pending.
    const run = io.api(`actions/runs/${matching[0].id}`);
    assert.equal(run.id, matching[0].id);
    assertRun(run, expected, event, pr);
    const jobs = io.list(`actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`, '.jobs[]');
    for (const name of ['build', 'workflow-lint']) assert.ok(jobs.some(j => j.name === name), `Missing required CI job ${name}`);
    assert.ok(jobs.every(j => j.status === 'completed' && j.conclusion === 'success'), 'Unsuccessful or skipped CI jobs');
    return {id: run.id, attempt: run.run_attempt};
}
function branchHead(io, expected) {
    const ref = io.api(`git/ref/heads/${encodeRef(expected.branch)}`);
    assert.equal(ref.ref, `refs/heads/${expected.branch}`, 'Branch reference mismatch');
    assert.equal(ref.object.type, 'commit');
    assert.equal(ref.object.sha, expected.commit, 'Branch head moved; test the new commit first');
}
function verify(io, env, artifact) {
    const expected = context(env);
    assert.equal(artifact.tag, expected.tag, 'Requested tag/package metadata mismatch');
    assert.ok(isBetaVersion(artifact.version), 'Stable publication is forbidden');
    assert.equal(io.git(['rev-parse', 'HEAD']), expected.commit, 'Checkout differs from tested commit');
    io.git(['check-ref-format', `refs/heads/${expected.branch}`]);
    branchHead(io, expected);
    const push = latestRun(io, expected, 'push');
    const prs = io.list('pulls?state=open&per_page=100').filter(p => p.head.repo && p.head.repo.full_name === expected.repository && p.head.ref === expected.branch);
    const pullRequests = prs.sort((a,b) => a.number - b.number).map(pr => {
        assert.equal(pr.head.sha, expected.commit, 'Open PR differs from tested branch head');
        return {number: pr.number, ...latestRun(io, expected, 'pull_request', pr)};
    });
    return {...artifact, ...expected, ci: {push, pullRequests}};
}
function assertUnused(io, expected, releases) {
    const refs = io.list(`git/matching-refs/tags/${encodeURIComponent(expected.tag)}?per_page=100`);
    assert.ok(!refs.some(r => r.ref === `refs/tags/${expected.tag}`), 'Tag already exists; beta tags are immutable');
    assert.ok(!releases.some(r => r.tag_name.replace(/^v/, '') === expected.version), 'Release already exists; do not reuse tags/releases');
}
function inventoryUnchanged(before, after, id) {
    const signature = r => JSON.stringify({id:r.id,tag:r.tag_name,draft:r.draft,prerelease:r.prerelease,published_at:r.published_at,
        assets:r.assets.map(a => [a.id,a.name,a.size,a.digest || null]).sort((a,b) => a[0]-b[0])});
    assert.equal(after.length, before.length + 1, 'Unexpected release inventory change');
    for (const old of before) {
        const retained = after.find(r => r.id === old.id);
        assert.ok(retained, 'Existing release disappeared');
        assert.equal(signature(retained), signature(old), 'Existing release changed');
    }
    assert.ok(after.some(r => r.id === id));
}
function filesFor(expected, bundle) {
    return {'honeycomb-menu-ng.js':bundle, 'SHA256SUMS.txt':Buffer.from(`${expected.sha256}  honeycomb-menu-ng.js\n`),
        'release-provenance.json':Buffer.from(JSON.stringify(expected,null,2)+'\n')};
}
function assertAssets(release, expected, files) {
    assert.equal(release.tag_name, expected.tag);
    assert.equal(release.target_commitish, expected.commit);
    assert.equal(release.prerelease, true, 'Beta must remain a prerelease');
    assert.deepEqual(release.assets.map(a => a.name).sort(), [...ASSETS].sort(), 'Unexpected/missing beta assets');
    for (const name of ASSETS) {
        const asset = release.assets.find(a => a.name === name);
        assert.equal(asset.state, 'uploaded', `Incomplete ${name}`);
        assert.equal(asset.size, files[name].length, `Wrong size ${name}`);
        if (asset.digest) assert.equal(asset.digest, `sha256:${digest(files[name])}`, `Wrong digest ${name}`);
    }
    assert.equal(digest(files['honeycomb-menu-ng.js']), expected.sha256);
    assert.equal(files['honeycomb-menu-ng.js'].length, expected.bytes);
    assert.equal(files['SHA256SUMS.txt'].toString(), `${expected.sha256}  honeycomb-menu-ng.js\n`);
    assert.deepEqual(JSON.parse(files['release-provenance.json']), expected);
}
function verifyTag(io, expected) {
    const ref = io.api(`git/ref/tags/${encodeURIComponent(expected.tag)}`);
    assert.equal(ref.ref, `refs/tags/${expected.tag}`);
    assert.equal(ref.object.type, 'commit');
    assert.equal(ref.object.sha, expected.commit, 'Tag differs from tested source');
}
// Only a NEW release created in this invocation may enter this lookup. A 404
// can be transient; retry reads only. Authentication/other failures fail closed.
async function newDraft(io, expected) {
    for (let attempt=0;attempt<4;attempt++) {
        let release;
        try { release=io.api(`releases/tags/${encodeURIComponent(expected.tag)}`); }
        catch(error) {
            const status=error.status || /HTTP\s+(\d{3})/.exec(String(error.stderr || error.message || ''))?.[1];
            if (Number(status)!==404) throw error;
            if (attempt===3) throw new Error('New beta draft still unavailable by exact tag after 4 reads; preserve the tag/draft for inspection.');
            await (io.wait || (ms=>new Promise(resolve=>setTimeout(resolve,ms))))(1000*(attempt+1));
            continue;
        }
        assert.ok(Number.isSafeInteger(release.id) && release.id>0,'Invalid new beta draft ID');
        assert.equal(release.tag_name,expected.tag,'New beta draft tag mismatch');
        assert.equal(release.target_commitish,expected.commit,'New beta draft target mismatch');
        assert.equal(release.draft,true,'New beta release is not a draft');
        assert.equal(release.prerelease,true,'New beta draft is not a prerelease');
        return release;
    }
}
async function publish(io, expected, output, env, artifact) {
    assert.equal(env.BETA_PUBLICATION_AUTHORIZED, 'true', 'Explicit manual publish=true required');
    assert.ok(typeof env.APPROVED_NOTES === 'string' && env.APPROVED_NOTES.trim().length > 20, 'Approved release notes required');
    assert.deepEqual(verify(io, env, artifact), expected, 'Tested provenance changed');
    const prepared = filesFor(expected, fs.readFileSync(artifact.filename));
    for (const name of ASSETS) assert.deepEqual(fs.readFileSync(path.join(output,name)), prepared[name], `Verified artifact ${name} changed`);
    const before = io.list('releases?per_page=100');
    const stable = io.api('releases/latest');
    assert.equal(stable.prerelease, false, 'Unknown latest stable state');
    assert.equal(stable.draft, false);
    assert.ok(before.some(r => r.id === stable.id && r.tag_name === stable.tag_name), 'Latest stable inventory mismatch');
    assertUnused(io, expected, before);
    branchHead(io, expected);
    io.api('git/refs','POST',{ref:`refs/tags/${expected.tag}`,sha:expected.commit});
    verifyTag(io, expected);
    const notes = `${env.APPROVED_NOTES.trim()}\n\nTested branch: \`${expected.branch}\`; commit: \`${expected.commit}\`.\nBundle SHA-256: \`${expected.sha256}\` (${expected.bytes} bytes).\n\nThis is a beta. An unmerged branch does not require promotion to master. Owner real Home Assistant testing and explicit approval are required before merge or stable publication.\n`;
    const notesFile = path.join(output,'release-notes.md');fs.writeFileSync(notesFile,notes);
    io.gh(['release','create',expected.tag,'--verify-tag','--target',expected.commit,'--draft','--prerelease','--latest=false',
        '--title',JSON.parse(fs.readFileSync('release.json')).title,'--notes-file',notesFile,...ASSETS.map(name=>path.join(output,name))]);
    let release = await newDraft(io,expected);
    const downloaded = path.join(output,'downloaded');fs.mkdirSync(downloaded,{recursive:true});
    io.gh(['release','download',expected.tag,'--dir',downloaded]);
    const files = Object.fromEntries(ASSETS.map(name=>[name,fs.readFileSync(path.join(downloaded,name))]));
    for (const name of ASSETS) assert.deepEqual(files[name],prepared[name],`Downloaded ${name} differs`);
    assertAssets(release,expected,files);
    // Repeat CI and branch gates immediately before making the verified draft public.
    assert.deepEqual(verify(io,env,artifact),expected,'Branch/CI changed during staging');
    verifyTag(io,expected);
    assert.equal(io.api('releases/latest').id,stable.id,'Latest stable changed during staging');
    inventoryUnchanged(before,io.list('releases?per_page=100'),release.id);
    const fresh=io.api(`releases/${release.id}`);
    assert.equal(fresh.id,release.id);assert.equal(fresh.draft,true,'Draft changed during staging');
    assertAssets(fresh,expected,files);
    release = io.api(`releases/${release.id}`,'PATCH',{draft:false,prerelease:true,make_latest:'false'});
    assert.equal(release.draft,false);assertAssets(release,expected,files);
    verifyTag(io,expected);
    assert.equal(io.api('releases/latest').id,stable.id,'Beta changed latest stable');
    inventoryUnchanged(before,io.list('releases?per_page=100'),release.id);
    return release;
}
function backend(repo) {
    const gh = args => execFileSync('gh',args[0] === 'release' ? [...args,'--repo',repo] : args,{encoding:'utf8',stdio:['pipe','pipe','pipe']});
    const api = (route,method='GET',data) => JSON.parse(execFileSync('gh',['api',`repos/${repo}/${route}`,'--method',method,...(data?['--input','-']:[])],
        {encoding:'utf8',input:data?JSON.stringify(data):undefined,stdio:['pipe','pipe','pipe']}));
    return {api,gh,git:args=>execFileSync('git',args,{encoding:'utf8'}).trim(),
        list:(route,selector='.[]')=>gh(['api',`repos/${repo}/${route}`,'--paginate','--jq',`${selector} | @json`]).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line))};
}
async function main() {
    const env = process.env, source = context(env), io = backend(source.repository), artifact = localBetaArtifact();
    const expected = verify(io,env,artifact), output = env.RELEASE_OUTPUT;
    assert.ok(output,'RELEASE_OUTPUT required');fs.mkdirSync(output,{recursive:true});
    if (env.PUBLICATION_MODE === 'prepare') {
        assertUnused(io,expected,io.list('releases?per_page=100'));
        for (const [name,bytes] of Object.entries(filesFor(expected,fs.readFileSync(artifact.filename)))) fs.writeFileSync(path.join(output,name),bytes);
        if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,`commit=${expected.commit}\ntag=${expected.tag}\nci_run=${expected.ci.push.id}\n`);
        console.log(`Verified beta ${expected.tag} on ${expected.branch} at ${expected.commit}; push CI ${expected.ci.push.id}`);
        return;
    }
    assert.equal(env.PUBLICATION_MODE,'publish','Explicit preparation/publication mode required');
    const release = await publish(io,expected,output,env,artifact);
    fs.writeFileSync(path.join(output,'published.json'),JSON.stringify({id:release.id,url:release.html_url,...expected},null,2)+'\n');
    if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,`url=${release.html_url}\n`);
    console.log(`Published prerelease ${release.html_url}; commit=${expected.commit}; SHA256=${expected.sha256}`);
}
module.exports = {context,assertRun,verify,assertUnused,inventoryUnchanged,filesFor,assertAssets,newDraft,publish,backend,digest};
if(require.main===module)main().catch(error=>{
    const status=/HTTP\s+(\d{3})/.exec(String(error.stderr || ''));
    console.error(error.code==='ERR_ASSERTION' ? error.message : `Beta verification/publication failed${status?' HTTP '+status[1]:''}.`);
    console.error('Stopped. Inspect any new tag/draft; no state will be deleted, forced or overwritten.');process.exitCode=1;
});
