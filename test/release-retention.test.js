'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const retention = require('../scripts/release-retention');
const {parseVersion, classify, planRetention, fingerprint, GitHubAPI, inventory, authorizeApply, applyPlan, markdown, main} = retention;
const REPO = 'example/honeycomb';
const clone = value => JSON.parse(JSON.stringify(value));
function release(id, tag, extra = {}) {
    return {id, tag_name: tag, name: 'Synthetic release', body: 'Synthetic notes', draft: false,
        prerelease: Boolean(parseVersion(tag)?.pre.length), published_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', target_commitish: 'synthetic', assets: [], ...extra};
}
function policy(tags, basis) {
    const records = tags.map((tag, index) => typeof tag === 'string' ? release(index + 1, tag) : tag);
    const latest = records.find(r => r.tag_name === basis);
    return planRetention(records, latest, REPO);
}
const row = (plan, tag) => plan.rows.find(r => r.tag === tag);
const env = {GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'release', RELEASE_RETENTION_ENABLED: 'true'};
function event(latest) { return {action: 'published', release: clone(latest), repository: {full_name: REPO}}; }
function response(status, data, headers = {}) {
    return new Response(status === 204 ? null : JSON.stringify(data), {status, headers: {'content-type': 'application/json', ...headers}});
}
function fakeGitHub(records, basis, hook) {
    const fake = {records: clone(records), latestId: records.find(r => r.tag_name === basis)?.id, calls: [], waits: []};
    fake.api = new GitHubAPI({repository: REPO, token: 'synthetic-token', wait: async ms => fake.waits.push(ms), fetchImpl: async (url, options) => {
        assert.equal(options.redirect, 'error');
        assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
        assert.equal(options.headers['X-GitHub-Api-Version'], '2022-11-28');
        const suffix = url.replace(`https://api.github.com/repos/${REPO}`, '');
        assert.ok(suffix.startsWith('/releases') || (options.method === 'GET' && /^\/actions\/runs\/\d+$/.test(suffix)), 'Only Release records and read-only publisher metadata are reachable');
        const call = {method: options.method, suffix};fake.calls.push(call);
        const intercepted = hook && await hook(fake, call);
        if (intercepted) return intercepted;
        if (suffix.startsWith('/actions/runs/')) return response(200, fake.publisher);
        if (suffix.startsWith('/releases?')) {
            const page = Number(new URL(url).searchParams.get('page'));
            const batch = fake.records.slice((page - 1) * 100, page * 100);
            const headers = page * 100 < fake.records.length ? {link: `<https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page + 1}>; rel="next"`} : {};
            return response(200, batch, headers);
        }
        const record = suffix === '/releases/latest' ? fake.records.find(r => r.id === fake.latestId)
            : fake.records.find(r => r.id === Number(suffix.split('/').at(-1)));
        if (!record) return response(404, {});
        if (options.method === 'DELETE') {fake.records = fake.records.filter(r => r.id !== record.id);return response(204);}
        return response(200, record);
    }});
    return fake;
}
function scenario(hook) {
    const records = [release(1, 'v1.7.0'), release(2, 'v1.6.9'), release(3, 'v0.1.0'),
        release(4, 'v1.5.0-beta.1'), release(5, 'v1.4.0-rc.1'), release(6, 'v1.8.0-alpha.1'),
        release(7, 'v0.0.1-beta.1', {draft: true, published_at: null})];
    const fake = fakeGitHub(records, 'v1.7.0', hook);
    return {...fake, fake, plan: planRetention(records, records[0], REPO), event: event(records[0])};
}
function mutations(fake) { return fake.calls.filter(c => c.method === 'DELETE'); }

test('strict SemVer accepts prefix/case, patches, labels and build metadata; rejects ambiguous tags', () => {
    for (const tag of ['v1.7.0', 'V2.0.12-rc.1+build.01', '0.0.0', 'v1.10.3-BETA.2', 'v1.0.0-0']) assert.ok(parseVersion(tag), tag);
    for (const tag of ['release-1.7.0', 'v01.7.0', 'v1.07.0', 'v1.7', 'v1.7.0.1', 'v1.7.0-beta.01', 'v1.0.0-', ' v1.7.0', 'v1.7.0\n', 'v9007199254740992.0.0', '', null])
        assert.equal(parseVersion(tag), null, String(tag));
});
for (const [basis, kept, removed] of [
    ['v1.7.0', ['v0.1.0', 'v0.9.0', 'v1.2.11', 'v1.5.1'], []],
    ['v2.0.0', ['v1.2.11', 'v1.9.0', 'v2.0.0'], ['v0.1.0', 'v0.9.0']],
    ['v3.0.0', ['v2.0.0', 'v2.9.0', 'v3.0.0'], ['v0.1.0', 'v1.5.1']],
]) test(`stable retention uses MAJOR, anchored at ${basis}`, () => {
    const plan = policy([...new Set([...kept, ...removed, basis])], basis);
    for (const tag of kept) assert.equal(row(plan, tag).status, 'keep');
    for (const tag of removed) assert.equal(row(plan, tag).status, 'delete');
    assert.equal(row(plan, basis).status, 'keep');assert.deepEqual(plan.blocked, []);
});
for (const [basis, previous, kept, removed] of [
    ['v1.7.0', '1.6', ['v1.7.0-beta.1', 'v1.6.9-rc.2'], ['v1.5.9-beta.1']],
    ['v1.8.0', '1.7', ['v1.8.1-beta.1', 'v1.7.0-alpha.1'], ['v1.6.9-rc.1']],
    ['v2.0.0', '1.9', ['v2.0.0-beta.1', 'v1.9.9-rc.1'], ['v1.8.9-beta.1']],
    ['v2.1.0', '2.0', ['v2.1.0-beta.1', 'v2.0.9-rc.1'], ['v1.9.9-beta.1']],
]) test(`prerelease current/previous MINOR policy at ${basis}`, () => {
    const plan = policy([basis, 'v1.9.0', ...kept, ...removed], basis);
    assert.equal(plan.previousTrain, previous);
    for (const tag of kept) assert.equal(row(plan, tag).status, 'keep');
    for (const tag of removed) assert.equal(row(plan, tag).status, 'delete');
});
test('v1.5 stable never prunes v1.7 betas or v0 stable records', () => {
    const plan = policy(['v1.5.1', 'v0.1.0', 'v1.7.0-beta.3', 'v2.0.0-alpha.1'], 'v1.5.1');
    assert.equal(plan.counts.keep, 4);assert.equal(plan.counts.delete, 0);
});
test('major zero, zero minor and patch updates use the same policy', () => {
    const zero = policy(['v0.0.0', 'v0.0.0-beta.1', 'v0.1.0-alpha.1'], 'v0.0.0');
    assert.equal(zero.previousTrain, null);assert.deepEqual(zero.blocked, []);assert.equal(zero.counts.keep, 3);
    const patch = policy(['v0.2.13', 'v0.0.1', 'v0.1.9-beta.1', 'v0.0.9-beta.1'], 'v0.2.13');
    assert.equal(patch.previousTrain, '0.1');assert.equal(row(patch, 'v0.0.1').status, 'keep');assert.equal(row(patch, 'v0.0.9-beta.1').status, 'delete');
});
test('missing intermediate minor is not substituted with an older train', () => {
    const plan = policy(['v1.8.0', 'v1.6.9-beta.1', 'v1.6.0'], 'v1.8.0');
    assert.equal(plan.previousTrain, '1.7');assert.equal(row(plan, 'v1.6.9-beta.1').status, 'delete');
});
test('rollover uses evidence, permits missing minors and unbounded minor numbers', () => {
    for (const minor of [5, 9, 10, 104]) {
        const plan = policy(['v2.0.0', `v1.${minor}.4`, `v1.${minor}.9-beta.1`], 'v2.0.0');
        assert.equal(plan.previousTrain, `1.${minor}`);assert.deepEqual(plan.blocked, []);
    }
});
test('missing or ambiguous rollover evidence blocks every destructive operation', () => {
    for (const tags of [['v2.0.0', 'v0.1.0'], ['v2.0.0', 'v1.9.0', 'v1.10.0-beta.1'], ['v2.0.0', 'v1.9.0', 'unknown-tag']])
        assert.ok(policy(tags, 'v2.0.0').blocked.length, tags.join(','));
});
test('flags are authoritative, titles ignored, suffix/flag conflict skipped and drafts always kept', () => {
    const records = [release(1, 'v1.7.0', {name: 'Beta preview title is not parsed'}),
        release(2, 'v1.2.0', {prerelease: true, name: 'Stable'}), release(3, 'v1.1.0-beta.1', {prerelease: false}),
        release(4, 'unknown-tag', {draft: true}), release(5, 'v0.0.1-beta.1', {draft: true}), release(6, 'unknown-tag', {prerelease: true})];
    const plan = planRetention(records, records[0], REPO);
    assert.equal(row(plan, 'v1.2.0').kind, 'prerelease');assert.equal(row(plan, 'v1.2.0').status, 'delete');
    assert.equal(row(plan, 'v1.1.0-beta.1').status, 'skipped');
    assert.equal(plan.rows.find(r => r.id === 4).status, 'keep');assert.equal(plan.rows.find(r => r.id === 5).status, 'keep');
    assert.equal(plan.rows.find(r => r.id === 6).status, 'skipped');
});
test('malformed flags/dates are skipped; latest is preserved even when the plan blocks', () => {
    const latest = release(1, 'v1.7.0');
    const plan = planRetention([latest, release(2, 'v1.0.0-beta.1', {published_at: null}), release(3, 'v1.0.1', {prerelease: 'false'})], latest, REPO);
    assert.equal(plan.counts.skipped, 2);
    const invalid = release(1, 'unknown-tag');
    const blocked = planRetention([invalid], invalid, REPO);
    assert.ok(blocked.blocked.length);assert.equal(blocked.rows[0].status, 'keep');
});
test('case/prefix and build variations compare numerically; duplicate aliases are skipped', () => {
    const plan = policy(['V1.10.0+build.01', 'v1.9.1-RC.1', '1.8.0-beta.1'], 'V1.10.0+build.01');
    assert.equal(plan.previousTrain, '1.9');assert.equal(row(plan, '1.8.0-beta.1').status, 'delete');
    const duplicate = policy(['v1.7.0', 'v1.0.0-beta.1', 'V1.0.0-beta.1'], 'v1.7.0');
    assert.equal(duplicate.counts.skipped, 2);
    assert.ok(policy(['v1.7.0', 'V1.7.0'], 'v1.7.0').blocked.length);
});
test('no latest, a beta latest, mismatched inventory or older designated latest blocks', () => {
    const stable = release(1, 'v1.5.1'), beta = release(2, 'v1.7.0-beta.3');
    for (const [records, latest] of [[[stable, beta], null], [[stable, beta], beta], [[stable], {...stable, updated_at: '2026-02-01T00:00:00Z'}], [[stable, release(3, 'v1.7.0')], stable]])
        assert.ok(planRetention(records, latest, REPO).blocked.length);
});
test('inventory order is deterministic and release/asset edits change the fingerprint', () => {
    const a = release(1, 'v1.7.0'), b = release(2, 'v1.2.0-beta.1');
    assert.deepEqual(planRetention([a, b], a, REPO), planRetention([b, a], a, REPO));
    assert.notEqual(fingerprint(a), fingerprint({...a, body: 'Edited'}));
    const asset = {...a, assets: [{id: 1, name: 'bundle.js', size: 123, download_count: 1}]};
    assert.notEqual(fingerprint(a), fingerprint(asset));
    assert.equal(fingerprint(asset), fingerprint({...asset, assets: [{...asset.assets[0], download_count: 9}]}));
    assert.throws(() => planRetention([a, a], a, REPO), /Duplicate/);
});
test('large deletion plans are blocked for owner review', () => {
    const records = [release(1, 'v1.7.0'), ...Array.from({length:101}, (_, i) => release(i + 2, `v1.0.${i}-beta.1`))];
    assert.match(planRetention(records, records[0], REPO).blocked.join(), /exceeds 100/);
});

test('all release pages are fetched, including a full final page without Link', async () => {
    const records = Array.from({length:200}, (_, i) => release(i + 1, `v0.1.${i}`));
    const fake = fakeGitHub(records, records[0].tag_name);
    assert.equal((await fake.api.list()).length, 200);
    assert.equal(fake.calls.length, 3);assert.equal(mutations(fake).length, 0);
});
test('pagination handles partial pages with a next link', async () => {
    let page = 0;
    const fake = fakeGitHub([], null, () => response(200, [release(++page, `v1.0.${page}`)], page < 3 ? {link:`<https://api.github.com/repos/${REPO}/releases?page=${page+1}&per_page=100>; rel="next"`} : {}));
    assert.equal((await fake.api.list()).length, 3);
});
for (const link of ['https://example.invalid/releases?per_page=100&page=2',
    `https://api.github.com/repos/${REPO}/releases?per_page=100&page=1`,
    `https://api.github.com/repos/${REPO}/git/refs?per_page=100&page=2`,
    `https://api.github.com/repos/${REPO}/releases?per_page=100&page=2&extra=true`])
    test(`unsafe pagination link is refused: ${link}`, async () => {
        const fake = fakeGitHub([], null, () => response(200, [release(1, 'v1.0.0')], {link:`<${link}>; rel="next"`}));
        await assert.rejects(fake.api.list(), /pagination/);assert.equal(fake.calls.length, 1);
    });
test('duplicate IDs across changing pages and malformed pages stop the inventory', async () => {
    const fake = fakeGitHub([], null, () => response(200, [release(1, 'v1.0.0')], {link:`<https://api.github.com/repos/${REPO}/releases?per_page=100&page=2>; rel="next"`}));
    await assert.rejects(fake.api.list(), /Duplicate/);
    const malformed = fakeGitHub([], null, () => response(200, {unexpected:[]}));
    await assert.rejects(malformed.api.list(), /Malformed/);
});
test('pagination never silently truncates at the safety limit', async () => {
    let page = 0;
    const fake = fakeGitHub([], null, () => response(200, [release(++page, `v1.0.${page}`)], {link:`<https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page+1}>; rel="next"`}));
    await assert.rejects(fake.api.list(), /exceeds 1000 pages/);assert.equal(fake.calls.length, 1000);
});
test('missing latest stable is an explicit blocked plan', async () => {
    const fake = fakeGitHub([release(1, 'v1.7.0-beta.1')], 'missing');
    const current = await inventory(fake.api);assert.equal(current.latest, null);
    assert.ok(planRetention(current.releases, current.latest, REPO).blocked.length);
});
for (const suffix of ['/git/refs/tags/v1.0.0', '/tags', '/releases/latest', '/releases?per_page=100&page=1', '/releases/1/assets'])
    test(`DELETE cannot target anything except a numeric Release ID: ${suffix}`, async () => {
        const fake = fakeGitHub([], null);
        await assert.rejects(fake.api.request('DELETE', suffix), /outside GitHub Release/);assert.equal(fake.calls.length, 0);
    });
test('permissions, rate limits and server errors fail closed; GET retry is bounded', async () => {
    const denied = fakeGitHub([], null, () => response(403, {}, {'x-ratelimit-remaining':'0','x-ratelimit-reset':'123'}));
    await assert.rejects(denied.api.list(), /HTTP 403.*remaining=0/);assert.equal(denied.calls.length, 1);
    const server = fakeGitHub([], null, () => response(503, {}));
    await assert.rejects(server.api.list(), /HTTP 503/);assert.equal(server.calls.length, 3);
    const retry = fakeGitHub([], null, fake => fake.calls.length === 1 ? response(429, {}, {'retry-after':'1'}) : undefined);
    assert.deepEqual(await retry.api.list(), []);assert.deepEqual(retry.waits, [1000]);
    const slow = fakeGitHub([], null, () => response(429, {}, {'retry-after':'3600'}));
    await assert.rejects(slow.api.list(), /longer retry/);assert.equal(slow.calls.length, 1);
});
test('network timeouts retry reads only; invalid JSON does not become an empty inventory', async () => {
    const fake = fakeGitHub([], null, f => {if (f.calls.length < 3) throw new Error('Synthetic network failure');});
    assert.deepEqual(await fake.api.list(), []);assert.equal(fake.calls.length, 3);
    const malformed = fakeGitHub([], null, () => new Response('not-json', {status:200}));
    await assert.rejects(malformed.api.list());
});

for (const override of [{GITHUB_ACTIONS:'false'}, {RELEASE_RETENTION_ENABLED:''}, {RELEASE_RETENTION_ENABLED:'false'}, {GITHUB_EVENT_NAME:'workflow_dispatch'}])
    test(`apply gate rejects ${JSON.stringify(override)}`, async () => {
        const current = scenario();
        const result = await applyPlan(current.fake.api, current.plan, {env:{...env, ...override},event:current.event});
        assert.ok(result.failed);assert.equal(mutations(current.fake).length, 0);
    });
test('beta, draft, foreign repository, wrong event and outdated stable cannot authorize writes', () => {
    const latest = release(1, 'v1.7.0');
    for (const modified of [
        {...event(latest), action:'created'}, {...event(latest),release:{...latest,prerelease:true}},
        {...event(latest),release:{...latest,draft:true}}, {...event(latest),repository:{full_name:'other/repository'}},
        {...event(latest),release:{...latest,id:9}}, {...event(latest),release:{...latest,tag_name:'v1.7.1'}},
    ]) assert.throws(() => authorizeApply(env,modified,latest,REPO));
});
test('apply removes release records only, verifies each absence and preserves stable/drafts/future prereleases', async () => {
    const current = scenario();
    const result = await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.equal(result.failed,null);assert.deepEqual(result.deleted.map(r=>r.id),[4,5]);
    assert.deepEqual(current.fake.records.map(r=>r.id),[1,2,3,6,7]);
    assert.deepEqual(mutations(current.fake).map(c=>c.suffix),['/releases/4','/releases/5']);
});
test('changed plan, latest stable, missing records or edited assets abort before any deletion', async () => {
    for (const mutate of [f=>f.records.push(release(8,'v1.8.0-beta.1')), f=>{f.records[3].body='Edited';},
        f=>{f.records[3].assets=[{id:100,name:'bundle.js',size:1}];}, f=>{f.records=f.records.filter(r=>r.id!==4);},
        f=>{f.records.push(release(8,'v1.8.0'));f.latestId=8;}]) {
        const current=scenario();mutate(current.fake);
        const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
        assert.ok(result.failed);assert.equal(mutations(current.fake).length,0);
    }
});
test('malicious or foreign saved plan cannot broaden the recomputed deletion list', async () => {
    const current=scenario();
    const forged={...current.plan,digest:'forged',rows:[{id:1,status:'delete'}]};
    assert.ok((await applyPlan(current.fake.api,forged,{env,event:current.event})).failed);
    assert.equal(mutations(current.fake).length,0);
});
test('record upgraded to stable or removed between inventory and DELETE is preserved', async () => {
    for(const remove of [false,true]) {
        const current=scenario((f,c)=>{if(c.method==='GET'&&c.suffix==='/releases/4'){
            if(remove)f.records=f.records.filter(r=>r.id!==4);else f.records.find(r=>r.id===4).prerelease=false;
        }});
        const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
        assert.ok(result.failed);assert.equal(mutations(current.fake).length,0);
    }
});
test('an unrelated record change after the first deletion stops the rest and reports the partial result', async () => {
    const current=scenario((f,c)=>{if(c.suffix.startsWith('/releases?')&&f.calls.filter(x=>x.suffix.startsWith('/releases?')).length===3)f.records[0].body='Edited stable';});
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.match(result.failed,/changed during cleanup/);assert.deepEqual(result.deleted.map(r=>r.id),[4]);
    assert.ok(current.fake.records.find(r=>r.id===5));
});
for(const status of [403,404,500]) test(`DELETE HTTP ${status} stops without retry and reports uncertainty`, async () => {
    const current=scenario((_,c)=>c.method==='DELETE'?response(status,{}):undefined);
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.ok(result.failed);assert.equal(mutations(current.fake).length,1);assert.equal(result.deleted.length,0);
    assert.equal(result.uncertain.length,1);assert.equal(result.uncertain[0].absent,false);
});
test('lost DELETE response checks absence, never retries, and preserves subsequent candidates', async () => {
    const current=scenario((f,c)=>{if(c.method==='DELETE'){f.records=f.records.filter(r=>r.id!==4);throw new Error('Lost synthetic response');}});
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.ok(result.failed);assert.equal(mutations(current.fake).length,1);assert.equal(result.uncertain[0].absent,true);
    assert.ok(current.fake.records.find(r=>r.id===5));
});
test('DELETE success with failed confirmation records uncertainty, including permission/network failures', async () => {
    const current=scenario((f,c)=>c.method==='GET'&&c.suffix==='/releases/4'&&!f.records.find(r=>r.id===4)?response(403,{}):undefined);
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.ok(result.failed);assert.equal(result.uncertain[0].absent,null);assert.equal(mutations(current.fake).length,1);
});
test('a server falsely reporting successful DELETE is not counted as confirmed', async () => {
    const current=scenario((_,c)=>c.method==='DELETE'?response(204):undefined);
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.ok(result.failed);assert.equal(result.deleted.length,0);assert.equal(result.uncertain[0].absent,false);
});
test('late latest-stable changes abort the next deletion and report confirmed partial work', async () => {
    const current=scenario((f,c)=>{if(c.suffix==='/releases/latest'&&mutations(f).length){f.records.push(release(8,'v1.8.0'));f.latestId=8;}});
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.ok(result.failed);assert.equal(result.deleted.length,1);assert.equal(mutations(current.fake).length,1);
});
test('final inventory mismatch is reported rather than claiming complete success', async () => {
    const current=scenario((f,c)=>{if(c.suffix.startsWith('/releases?')&&mutations(f).length===2)f.records.push(release(8,'v1.9.0-beta.1'));});
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.match(result.failed,/Final inventory/);assert.equal(result.deleted.length,2);
});
function reusableScenario(hook) {
    const current = scenario(hook);
    current.fake.publisher = {id:123, status:'in_progress', head_branch:'master', event:'workflow_dispatch',
        repository:{full_name:REPO}, created_at:'2025-12-31T23:59:00Z', run_started_at:'2025-12-31T23:59:00Z', run_attempt:1};
    current.env = {...env, GITHUB_EVENT_NAME:'workflow_dispatch', GITHUB_RUN_ID:'123', GITHUB_RUN_ATTEMPT:'1',
        GITHUB_WORKFLOW_REF:`${REPO}/.github/workflows/stable.yml@refs/heads/master`, RETENTION_PUBLISHED_RELEASE_ID:'1'};
    current.event = {repository:{full_name:REPO, default_branch:'master'}};
    return current;
}
test('reusable stable publisher is supported without relying on suppressed GITHUB_TOKEN release events', async () => {
    const current = reusableScenario();
    const result = await applyPlan(current.fake.api,current.plan,{env:current.env,event:current.event});
    assert.equal(result.failed,null);assert.equal(result.deleted.length,2);
    assert.equal(current.fake.calls.filter(c=>c.suffix==='/actions/runs/123').length,4);
    assert.ok(current.fake.calls.filter(c=>c.suffix.startsWith('/actions/')).every(c=>c.method==='GET'));
});
for (const [label,modify] of [
    ['older publication', c=>{c.fake.publisher.run_started_at='2026-02-01T00:00:00Z';}],
    ['stale attempt metadata', c=>{c.fake.publisher.run_attempt=2;}],
    ['missing attempt timestamp', c=>{delete c.fake.publisher.run_started_at;}],
    ['completed publisher', c=>{c.fake.publisher.status='completed';}],
    ['feature branch publisher', c=>{c.fake.publisher.head_branch='feature/synthetic';}],
    ['foreign publisher', c=>{c.fake.publisher.repository.full_name='other/repository';}],
    ['wrong run ID', c=>{c.fake.publisher.id=999;}],
    ['PR publisher', c=>{c.fake.publisher.event='pull_request';}],
    ['untrusted workflow ref', c=>{c.env.GITHUB_WORKFLOW_REF=`${REPO}/.github/workflows/stable.yml@refs/heads/feature/synthetic`;}],
    ['beta publication ID', c=>{c.env.RETENTION_PUBLISHED_RELEASE_ID='6';}],
    ['missing proof ID', c=>{delete c.env.RETENTION_PUBLISHED_RELEASE_ID;}],
    ['disabled owner gate', c=>{c.env.RELEASE_RETENTION_ENABLED='false';}],
]) test(`reusable publisher proof rejects ${label}`,async()=>{
    const current=reusableScenario();modify(current);
    const result=await applyPlan(current.fake.api,current.plan,{env:current.env,event:current.event});
    assert.ok(result.failed);assert.equal(mutations(current.fake).length,0);
});
test('completed publisher during cleanup stops later deletions and preserves a partial report', async()=>{
    const current=reusableScenario((f,c)=>{if(c.suffix.startsWith('/actions/')&&mutations(f).length)f.publisher.status='completed';});
    const result=await applyPlan(current.fake.api,current.plan,{env:current.env,event:current.event});
    assert.ok(result.failed);assert.equal(result.deleted.length,1);assert.equal(mutations(current.fake).length,1);
});
test('API cannot mutate workflow runs, publish releases or edit any record', async()=>{
    const fake=fakeGitHub([],null);
    for(const [method,suffix] of [['DELETE','/actions/runs/123'],['POST','/releases'],['PATCH','/releases/1'],['PUT','/contents/file']])
        await assert.rejects(fake.api.request(method,suffix),/outside GitHub Release/);
    assert.equal(fake.calls.length,0);
});
test('summary lists exact IDs/tags/reasons safely and includes blocked/partial/uncertain diagnostics', () => {
    const current=scenario();const plan=current.plan;
    plan.rows.push({id:99,tag:'unsafe|<tag>\n`',kind:'ambiguous',status:'skipped',reason:'Malformed'});
    const text=markdown({mode:'dry-run',enabled:false,plan,deleted:[],uncertain:[{id:4,tag:'v1.5.0-beta.1',absent:null,reason:'Check'}],failed:'Owner review'});
    assert.match(text,/Latest stable is unconditionally preserved/);assert.match(text,/unsafe&#124;&lt;tag&gt;\\n&#96;/);
    assert.match(text,/Confirmed deleted: 0/);assert.match(text,/Owner review/);assert.ok(!text.includes('synthetic-token'));
});
test('offline CLI defaults to read-only, emits review artifacts, and never authorizes apply', async t => {
    t.mock.method(console,'log',()=>{});
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retention-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    const current=scenario(), inventoryFile=path.join(dir,'inventory.json'), latestFile=path.join(dir,'latest.json');
    fs.writeFileSync(inventoryFile,JSON.stringify(current.fake.records));fs.writeFileSync(latestFile,JSON.stringify(current.event.release));
    const args=['--inventory',inventoryFile,'--latest',latestFile,'--repository',REPO,'--output',path.join(dir,'out')];
    assert.equal(await main(args,{}),0);
    const report=JSON.parse(fs.readFileSync(path.join(dir,'out/report.json')));
    assert.equal(report.mode,'dry-run');assert.equal(report.deleted.length,0);assert.equal(report.enabled,false);
    assert.equal(report.plan.counts.delete,2);assert.ok(fs.existsSync(path.join(dir,'out/summary.md')));
    assert.equal(await main([...args,'--apply'],env),1);
    assert.match(JSON.parse(fs.readFileSync(path.join(dir,'out/report.json'))).failed,/Offline inventory/);
});
test('CLI rejects unknown arguments, missing tokens and unsafe repository paths with saved diagnostics', async t => {
    t.mock.method(console,'log',()=>{});
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retention-errors-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    assert.equal(await main(['--output',dir,'--unknown'],{}),1);
    assert.ok(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).failed);
    assert.throws(()=>new GitHubAPI({repository:REPO,token:''}),/GITHUB_TOKEN/);
    assert.throws(()=>new GitHubAPI({repository:'example/../refs',token:'synthetic-token'}),/Invalid/);
});
test('workflow keeps manual dispatch read-only, write permission isolated, and source trusted/pinned', () => {
    const source=fs.readFileSync('.github/workflows/release-retention.yml','utf8');
    const [read,write]=source.split('\n  cleanup:');
    assert.match(read,/types: \[published\]/);assert.match(read,/contents: read/);assert.ok(!read.includes('contents: write'));
    assert.match(write,/contents: write/);assert.match(write,/vars.RELEASE_RETENTION_ENABLED == 'true'/);
    assert.match(write,/github.event_name == 'release'/);assert.match(write,/github.event.release.prerelease == false/);
    assert.match(read,/ref: \$\{\{ github.event.repository.default_branch \}\}/);
    assert.match(write,/ref: \$\{\{ needs.inventory.outputs.source_sha \}\}/);
    assert.ok(!source.split('  workflow_dispatch:')[1].split('  workflow_call:')[0].includes('inputs:'));
    assert.match(source,/workflow_call:/);assert.match(write,/actions: read/);
    assert.match(source,/cancel-in-progress: false/);assert.equal(source.match(/persist-credentials: false/g).length,2);
    assert.ok(!source.includes('secrets.OPENAI'));assert.ok(!source.includes('secrets.GH_PAT'));
});

test('insufficient API budget blocks before the first DELETE', async()=>{
    const current=scenario((f,c)=>c.suffix==='/releases/latest'?response(200,f.records[0],{'x-ratelimit-remaining':'4'}):undefined);
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event});
    assert.match(result.failed,/Insufficient API budget/);assert.equal(mutations(current.fake).length,0);
});
test('duplicate aliases cannot incorrectly move the proven rollover train backwards',()=>{
    const plan=policy(['v2.0.0','v1.9.0','V1.9.0','v1.8.0','v1.9.0-beta.1'],'v2.0.0');
    assert.equal(plan.previousTrain,'1.9');assert.equal(row(plan,'v1.9.0-beta.1').status,'keep');
});
test('large inventories keep exact artifacts while respecting Actions summary size',async t=>{
    t.mock.method(console,'log',()=>{});
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retention-summary-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    const records=[release(1,'v1.7.0'),...Array.from({length:10000},(_,i)=>release(i+2,`v1.0.${i}`))];
    const inventoryFile=path.join(dir,'inventory.json'), latestFile=path.join(dir,'latest.json'), summary=path.join(dir,'job-summary.md');
    fs.writeFileSync(inventoryFile,JSON.stringify(records));fs.writeFileSync(latestFile,JSON.stringify(records[0]));
    assert.equal(await main(['--inventory',inventoryFile,'--latest',latestFile,'--repository',REPO,'--output',dir],{GITHUB_STEP_SUMMARY:summary}),0);
    assert.match(fs.readFileSync(summary,'utf8'),/exceeds the Actions summary limit/);
    assert.ok(fs.statSync(summary).size<900000);assert.ok(fs.statSync(path.join(dir,'summary.md')).size>900000);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'plan.json'))).rows.length,10001);
});

test('live CLI dry-run uses only GET; even an enabled manual apply stops before live preflight',async t=>{
    t.mock.method(console,'log',()=>{});
    const current=scenario();t.mock.method(globalThis,'fetch',current.fake.api.fetch);
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retention-live-cli-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    const args=['--output',dir];
    const cliEnv={...env,GITHUB_TOKEN:'synthetic-token',GITHUB_REPOSITORY:REPO,GITHUB_EVENT_NAME:'workflow_dispatch'};
    assert.equal(await main(args,cliEnv),0);assert.equal(mutations(current.fake).length,0);
    const before=current.fake.calls.length, eventFile=path.join(dir,'event.json');
    fs.writeFileSync(eventFile,JSON.stringify(current.event));
    assert.equal(await main([...args,'--apply','--plan',path.join(dir,'plan.json')],{...cliEnv,GITHUB_EVENT_PATH:eventFile}),1);
    assert.equal(current.fake.calls.length,before);
    assert.match(JSON.parse(fs.readFileSync(path.join(dir,'report.json'))).failed,/manual runs are always dry-run/);
});
test('failure saving progress stops before the next mutation and reports what is confirmed',async()=>{
    const current=scenario();
    const result=await applyPlan(current.fake.api,current.plan,{env,event:current.event,progress:()=>{throw new Error('Synthetic disk-full failure');}});
    assert.match(result.failed,/disk-full/);assert.equal(mutations(current.fake).length,0);
});
test('failure on a later inventory page never yields a partial deletion plan',async()=>{
    const records=Array.from({length:101},(_,i)=>release(i+1,`v1.0.${i}-beta.1`));
    const fake=fakeGitHub(records,'missing',(_,c)=>c.suffix.endsWith('page=2')?response(503,{}):undefined);
    await assert.rejects(inventory(fake.api),/HTTP 503/);assert.equal(mutations(fake).length,0);
});

test('PR preview can run before default-branch installation with no mutation permission or apply input',()=>{
    const preview=fs.readFileSync('.github/workflows/release-retention-preview.yml','utf8');
    assert.match(preview,/pull_request:/);assert.match(preview,/contents: read/);
    assert.ok(!preview.includes('contents: write'));assert.ok(!preview.includes('--apply'));
    assert.match(preview,/node scripts\/release-retention.js --dry-run/);
    assert.ok(!preview.includes('RELEASE_RETENTION_ENABLED'));
    assert.match(preview,/GITHUB_TOKEN: \$\{\{ github.token \}\}/);
});
