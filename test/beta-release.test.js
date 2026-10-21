'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {isBetaVersion} = require('../scripts/beta-version');
const {validateArtifact} = require('../scripts/check-release');
const {localBetaArtifact} = require('../scripts/check-beta');
const {context,verify,assertUnused,assertAssets,filesFor,publish,backend,digest} = require('../scripts/beta-release');
const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40), REPO = 'example/honeycomb';
const BUNDLE = Buffer.from(' '.repeat(11000)+'\n"honeycomb-persistent-hub";');
const ARTIFACT = {version:'1.8.0-beta.1',tag:'v1.8.0-beta.1',sha256:digest(BUNDLE),bytes:BUNDLE.length,filename:'honeycomb-menu-ng.js'};
const HACS = {filename:ARTIFACT.filename,content_in_root:true};
function environment(branch='fix/synthetic') {
    return {GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:`refs/heads/${branch}`,GITHUB_SHA:SHA,GITHUB_REPOSITORY:REPO,
        EXPECTED_COMMIT:SHA,EXPECTED_TAG:ARTIFACT.tag,BETA_PUBLICATION_AUTHORIZED:'true',APPROVED_NOTES:'Synthetic beta notes. Owner review required; branch remains unmerged.'};
}
function run(id,event,branch) {
    return {id,run_attempt:1,path:'.github/workflows/build.yml',head_sha:SHA,head_branch:branch,head_repository:{full_name:REPO},
        event,status:'completed',conclusion:'success',pull_requests:event==='pull_request'?[{number:91,head:{sha:SHA}}]:[]};
}
function fixture(t,branch='fix/synthetic',withPR=true) {
    const output=fs.mkdtempSync(path.join(os.tmpdir(),'beta-publisher-'));t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
    const env=environment(branch), calls=[], state={head:SHA,tag:null,release:null,runs:[run(11,'push',branch),...(withPR?[run(12,'pull_request',branch)]:[])],
        prs:withPR?[{number:91,head:{ref:branch,sha:SHA,repo:{full_name:REPO}}}]:[],jobs:[{name:'build',status:'completed',conclusion:'success'},{name:'workflow-lint',status:'completed',conclusion:'success'}],
        old:[{id:1,tag_name:'v1.7.0',draft:false,prerelease:false,published_at:'2026-01-01T00:00:00Z',assets:[]}],hook:()=>{}};
    const read=fs.readFileSync.bind(fs);
    t.mock.method(fs,'readFileSync',(file,...args)=>file===ARTIFACT.filename?BUNDLE:file==='release.json'?JSON.stringify({title:`Honeycomb NG ${ARTIFACT.tag}`,prerelease:true}):read(file,...args));
    const io={
        wait:async ms=>{calls.push(['wait',ms]);},
        git:args=>{calls.push(['git',...args]);return args[0]==='rev-parse'?SHA:'';},
        list:(route,selector)=>{
            calls.push(['list',route,selector]);const intercepted=state.hook('list',route);if(intercepted!==undefined)return intercepted;
            if(route.startsWith('actions/workflows/'))return structuredClone(state.runs);
            if(route.startsWith('actions/runs/'))return structuredClone(state.jobs);
            if(route.startsWith('pulls?'))return structuredClone(state.prs);
            if(route.startsWith('releases?'))return structuredClone([...state.old,...(state.release?[state.release]:[])]);
            if(route.startsWith('git/matching-refs/'))return state.tag?[{ref:`refs/tags/${ARTIFACT.tag}`}]:[];
            throw new Error(`Unexpected list ${route}`);
        },
        api:(route,method='GET',data)=>{
            calls.push([method,route,data]);state.hook(method,route,data);
            if(route.startsWith('git/ref/heads/'))return {ref:`refs/heads/${branch}`,object:{type:'commit',sha:state.head}};
            if(route.startsWith('actions/runs/'))return structuredClone(state.runs.find(r=>r.id===Number(route.split('/').pop())));
            if(route==='releases/latest')return structuredClone(state.old[0]);
            if(route==='git/refs'&&method==='POST'){assert.equal(state.tag,null);state.tag=data.sha;return {object:{type:'commit',sha:state.tag}};}
            if(route.startsWith('git/ref/tags/'))return {ref:`refs/tags/${ARTIFACT.tag}`,object:{type:'commit',sha:state.tag}};
            if(method==='GET' && route==='releases/2')return structuredClone(state.release);
            if(route==='releases/2'&&method==='PATCH'){
                assert.deepEqual(data,{draft:false,prerelease:true,make_latest:'false'});
                state.release={...state.release,draft:false,published_at:'2026-10-20T00:00:00Z'};return structuredClone(state.release);
            }
            throw new Error(`Unexpected ${method} ${route}`);
        },
        gh:args=>{
            calls.push(['gh',...args]);state.hook('gh',args);
            if(args[1]==='create'){
                for(const flag of ['--draft','--verify-tag','--prerelease','--latest=false'])assert.ok(args.includes(flag));
                state.release={id:2,tag_name:ARTIFACT.tag,target_commitish:SHA,prerelease:true,draft:true,published_at:null,html_url:'https://example.invalid/beta',
                    assets:Object.entries(prepared).map(([name,bytes],index)=>({id:10+index,name,size:bytes.length,state:'uploaded',digest:`sha256:${digest(bytes)}`}))};
            } else if(args[1]==='download'){
                const dir=args[args.indexOf('--dir')+1];for(const [name,bytes] of Object.entries(prepared))fs.writeFileSync(path.join(dir,name),bytes);
                state.hook('downloaded',dir);
            } else throw new Error('Unexpected CLI mutation');
            return '';
        }
    };
    const expected=verify(io,env,ARTIFACT),prepared=filesFor(expected,BUNDLE);
    for(const [name,bytes] of Object.entries(prepared))fs.writeFileSync(path.join(output,name),bytes);
    calls.length=0;
    return {io,state,calls,expected,prepared,env,output};
}
for(const version of ['0.0.0-beta.0','1.7.1-beta.1','1.8.0-beta.1','2.0.0-beta.12','25.10.3-beta.2+build.001'])
    test(`SemVer beta metadata supports ${version}`,()=>{
        assert.ok(isBetaVersion(version));
        assert.doesNotThrow(()=>validateArtifact({version},{title:`Honeycomb NG v${version}`,prerelease:true},HACS,BUNDLE));
    });
test('malformed, stable and non-beta versions cannot reach beta publication',()=>{
    for(const version of ['1.7.1','v1.7.1-beta.1','1.7-beta.1','01.8.0-beta.1','1.08.0-beta.1','1.8.00-beta.1','1.8.0-beta.01','1.8.0-beta.-1','1.8.0-beta','1.8.0-rc.1','1.8.0-alpha.1','1.8.0-beta.1\n','1.8.0-beta.1+','1.8.0-beta.1+a..b']) {
        assert.equal(isBetaVersion(version),false,version);
        assert.throws(()=>context({...environment(),EXPECTED_TAG:`v${version}`}));
    }
    assert.throws(()=>validateArtifact({version:'1.8.0-beta.1'},{title:'Honeycomb NG v1.8.0-beta.1',prerelease:false},HACS,BUNDLE));
    assert.throws(()=>validateArtifact({version:'1.8.0-beta.1'},{title:'Honeycomb NG v1.8.0-beta.2',prerelease:true},HACS,BUNDLE));
    assert.throws(()=>validateArtifact({version:'1.8.0-beta.1'},{title:'Honeycomb NG v1.8.0-beta.10',prerelease:true},HACS,BUNDLE));
});
test('manual branch context rejects tags, nonmanual triggers, abbreviated SHAs and workflow/source conflicts',()=>{
    for(const patch of [{GITHUB_EVENT_NAME:'push'},{GITHUB_REF:'refs/tags/v1.8.0-beta.1'},{EXPECTED_COMMIT:'aaaa'},{GITHUB_SHA:OTHER},{EXPECTED_TAG:'v1.8.0'}])
        assert.throws(()=>context({...environment(),...patch}));
});
for(const branch of ['feature/synthetic','fix/synthetic','restart/v1.5.1','maintenance/next','master','owner-beta','topic/a#b'])
    test(`manual publisher supports ${branch} without master ancestry or a PR`,async t=>{
        const f=fixture(t,branch,false);const result=await publish(f.io,f.expected,f.output,f.env,ARTIFACT);
        assert.equal(result.prerelease,true);assert.equal(result.draft,false);assert.equal(f.state.tag,SHA);
        assert.ok(!f.calls.some(c=>c[0]==='DELETE'||c.includes('--force')||c.includes('--clobber')||c.includes('merge-base')));
        assert.ok(!f.calls.some(c=>String(c[1]).includes('branches/master')));
    });
test('open PR requires its exact green CI, and download verification precedes public publication',async t=>{
    const f=fixture(t);await publish(f.io,f.expected,f.output,f.env,ARTIFACT);
    assert.equal(f.expected.ci.pullRequests[0].number,91);
    assert.ok(f.calls.findIndex(c=>c[0]==='PATCH')>f.calls.findIndex(c=>c[0]==='gh'&&c[2]==='download'));
    assert.ok(f.calls.some(c=>c[0]==='list'&&c[1].includes('event=pull_request')));
});
test('outdated checkout/branch/PR metadata cannot publish',async t=>{
    const f=fixture(t);f.state.head=OTHER;
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Branch head moved/);assert.equal(f.state.tag,null);
    f.state.head=SHA;f.state.prs[0].head.sha=OTHER;
    assert.throws(()=>verify(f.io,f.env,ARTIFACT),/Open PR differs/);
    f.state.prs[0].head.sha=SHA;f.io.git=()=>OTHER;
    assert.throws(()=>verify(f.io,f.env,ARTIFACT),/Checkout differs/);
});
test('no successful CI, failed/pending latest CI or unsuccessful required jobs fail closed',async t=>{
    const f=fixture(t);
    for(const patch of [{status:'in_progress',conclusion:null},{conclusion:'failure'},{conclusion:'cancelled'},{conclusion:'skipped'}]){
        Object.assign(f.state.runs[0],run(11,'push','fix/synthetic'),patch);
        await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/CI is not/);assert.equal(f.state.tag,null);
    }
    f.state.runs[0]=run(11,'push','fix/synthetic');
    f.state.runs.push({...run(13,'push','fix/synthetic'),conclusion:'failure'});
    assert.throws(()=>verify(f.io,f.env,ARTIFACT),/not green/);f.state.runs.pop();
    f.state.jobs[0].conclusion='skipped';assert.throws(()=>verify(f.io,f.env,ARTIFACT),/Unsuccessful/);
    f.state.jobs=[];assert.throws(()=>verify(f.io,f.env,ARTIFACT),/Missing required/);
});
test('wrong branch/repository/workflow/SHA/event or missing PR CI is rejected',t=>{
    const f=fixture(t);
    for(const patch of [{head_sha:OTHER},{head_branch:'other'},{head_repository:{full_name:'other/honeycomb'}},{path:'.github/workflows/other.yml'},{event:'workflow_dispatch'}]){
        f.state.runs[0]={...run(11,'push','fix/synthetic'),...patch};assert.throws(()=>verify(f.io,f.env,ARTIFACT),/No matching/);
    }
    f.state.runs=[run(11,'push','fix/synthetic')];assert.throws(()=>verify(f.io,f.env,ARTIFACT),/No matching pull_request/);
});
test('tag/release reuse, including drafts, blocks before any mutation',async t=>{
    const f=fixture(t);f.state.tag=SHA;
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Tag already exists/);
    assert.ok(!f.calls.some(c=>c[0]==='POST'));
    f.state.tag=null;f.state.old.push({...f.state.old[0],id:3,tag_name:ARTIFACT.tag,draft:true,prerelease:true});
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Release already exists/);assert.equal(f.state.tag,null);
});
test('an existing unrelated tag prefix does not prevent a new tag',t=>{
    const f=fixture(t);const original=f.io.list;f.io.list=(route,...args)=>route.startsWith('git/matching-refs/')?[{ref:`refs/tags/${ARTIFACT.tag}0`}]:original(route,...args);
    assert.doesNotThrow(()=>assertUnused(f.io,f.expected,f.state.old));
});
test('explicit authorization and approved release notes are mandatory',async t=>{
    const f=fixture(t);
    for(const patch of [{BETA_PUBLICATION_AUTHORIZED:'false'},{BETA_PUBLICATION_AUTHORIZED:''},{APPROVED_NOTES:''}])
        await assert.rejects(publish(f.io,f.expected,f.output,{...f.env,...patch},ARTIFACT));
    assert.equal(f.state.tag,null);
});
test('verified asset tampering and metadata/tag mismatch stop before tag creation',async t=>{
    const f=fixture(t);fs.writeFileSync(path.join(f.output,'SHA256SUMS.txt'),'wrong');
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Verified artifact/);assert.equal(f.state.tag,null);
    assert.throws(()=>verify(f.io,{...f.env,EXPECTED_TAG:'v1.8.0-beta.2'},ARTIFACT),/metadata mismatch/);
});
test('a corrupt downloaded draft stays private with immutable tag retained for inspection',async t=>{
    const f=fixture(t);f.state.hook=(op,dir)=>{if(op==='downloaded')fs.writeFileSync(path.join(dir,'honeycomb-menu-ng.js'),'wrong');};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Downloaded/);
    assert.equal(f.state.tag,SHA);assert.equal(f.state.release.draft,true);assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
});
test('branch movement or failed rerun while staging prevents public release',async t=>{
    const f=fixture(t);f.state.hook=op=>{if(op==='downloaded')f.state.head=OTHER;};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Branch head moved/);assert.equal(f.state.release.draft,true);
    f.state.head=SHA;f.state.runs[0].conclusion='failure';
    assert.throws(()=>verify(f.io,f.env,ARTIFACT),/not green/);
});
test('a failed CI rerun during upload stops the draft before publication',async t=>{
    const f=fixture(t);f.state.hook=op=>{if(op==='downloaded')f.state.runs[0].conclusion='failure';};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/CI is not green/);
    assert.equal(f.state.release.draft,true);assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
});
test('a changed green CI attempt requires fresh provenance and cannot silently replace tested evidence',async t=>{
    const f=fixture(t);f.state.hook=op=>{if(op==='downloaded')f.state.runs[0].run_attempt++;};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Branch\/CI changed/);
    assert.equal(f.state.release.draft,true);
});
test('API permission/read failures never lead to a tag or release',async t=>{
    const f=fixture(t);f.state.hook=(op,route)=>{if(op==='list'&&route.startsWith('actions/'))throw new Error('HTTP 403');};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/403/);assert.equal(f.state.tag,null);
});
test('existing release/asset changes during staging prevent publication',async t=>{
    const f=fixture(t);f.state.hook=op=>{if(op==='downloaded')f.state.old[0].prerelease=true;};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Existing release changed/);assert.equal(f.state.release.draft,true);
});
test('beta asset validator rejects stable flags, incomplete assets, altered checksums and provenance',t=>{
    const f=fixture(t);
    const record={tag_name:ARTIFACT.tag,target_commitish:SHA,prerelease:true,assets:Object.entries(f.prepared).map(([name,bytes])=>({name,size:bytes.length,state:'uploaded',digest:`sha256:${digest(bytes)}`}))};
    assert.doesNotThrow(()=>assertAssets(record,f.expected,f.prepared));
    for(const change of [r=>r.prerelease=false,r=>r.target_commitish=OTHER,r=>r.assets.pop(),r=>r.assets[0].digest='wrong']){
        const r=structuredClone(record);change(r);assert.throws(()=>assertAssets(r,f.expected,f.prepared));
    }
    assert.throws(()=>assertAssets(record,f.expected,{...f.prepared,'SHA256SUMS.txt':Buffer.from('wrong')}));
});
test('lock metadata must agree with the selected beta version',t=>{
    const read=fs.readFileSync.bind(fs),version='1.8.0-beta.1';
    let lockVersion='1.7.0';
    const values={'package.json':{version},'release.json':{title:`Honeycomb NG v${version}`,prerelease:true},'hacs.json':HACS};
    t.mock.method(fs,'readFileSync',(file,...args)=>file==='package-lock.json'?JSON.stringify({version:lockVersion}):values[file]?JSON.stringify(values[file]):file===ARTIFACT.filename?BUNDLE:read(file,...args));
    assert.throws(()=>localBetaArtifact(),/lock version mismatch/);lockVersion=version;assert.equal(localBetaArtifact().version,version);
});
test('GitHub transport paginates every release, PR, CI and job list',t=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'beta-transport-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    // Exercise the real adapter with a harmless executable fixture, no network/mutation.
    const bin=path.join(dir,'gh');fs.writeFileSync(bin,'#!/bin/sh\nprintf "%s\\n" "$@" > "$BETA_TEST_ARGS"\nprintf \'{"id":1}\\n{"id":2}\\n\'\n',{mode:0o755});
    const oldPath=process.env.PATH,oldArgs=process.env.BETA_TEST_ARGS;
    process.env.PATH=dir+path.delimiter+oldPath;process.env.BETA_TEST_ARGS=path.join(dir,'args');
    t.after(()=>{process.env.PATH=oldPath;if(oldArgs===undefined)delete process.env.BETA_TEST_ARGS;else process.env.BETA_TEST_ARGS=oldArgs;});
    for(const [route,selector] of [['releases?per_page=100','.[]'],['pulls?state=open&per_page=100','.[]'],['actions/workflows/build.yml/runs?per_page=100','.workflow_runs[]'],['actions/runs/1/attempts/1/jobs?per_page=100','.jobs[]']]){
        assert.equal(backend(REPO).list(route,selector).length,2);
        assert.match(fs.readFileSync(path.join(dir,'args'),'utf8'),/--paginate/);
    }
});
test('workflow is branch-independent, manually authorized, least-privilege and artifact-verified',()=>{
    const workflow=fs.readFileSync('.github/workflows/release.yml','utf8'),build=fs.readFileSync('.github/workflows/build.yml','utf8');
    assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/default: false/);assert.match(workflow,/if: inputs.publish &&/);
    assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/contents: read/);assert.match(workflow,/contents: write/);
    assert.match(workflow,/git diff --exit-code -- honeycomb-menu-ng.js/);assert.match(workflow,/cmp honeycomb-menu-ng.js/);
    assert.match(workflow,/actions\/download-artifact@v4/);assert.match(build,/- '\*\*'/);
    for(const forbidden of ['feature/','fix/','restart/','697dec','v1.7.0-beta','--force','--clobber','release delete','RELEASE_RETENTION_ENABLED'])assert.ok(!workflow.includes(forbidden));
    assert.ok(!build.includes('paths-ignore:'));
});



test('new draft lookup tolerates bounded paginated inventory lag and pins exact ID without published-tag API',async t=>{
    const f=fixture(t);let reads=0;
    f.state.hook=(op,route)=>{
        if(op==='list' && route.startsWith('releases?') && f.state.release && ++reads<3)return structuredClone(f.state.old);
        if(op==='GET' && route.startsWith('releases/tags/'))throw Error('HTTP 404: unpublished draft is not a published tag release');
    };
    await publish(f.io,f.expected,f.output,f.env,ARTIFACT);
    assert.deepEqual(f.calls.filter(c=>c[0]==='wait').map(c=>c[1]),[1000,2000]);
    assert.equal(f.calls.filter(c=>c[0]==='gh' && c[2]==='create').length,1);
    assert.equal(f.calls.filter(c=>c[0]==='POST').length,1);
    assert.ok(f.calls.findIndex(c=>c[0]==='GET' && c[1]==='releases/2')<f.calls.findIndex(c=>c[0]==='gh' && c[2]==='download'));
    assert.ok(!f.calls.some(c=>c[0]==='GET' && c[1].startsWith('releases/tags/')));
    assert.equal(f.state.release.draft,false);
});
test('persistent inventory invisibility preserves partial publication and rerun refuses reuse',async t=>{
    const f=fixture(t);
    f.state.hook=(op,route)=>{if(op==='list' && route.startsWith('releases?') && f.state.release)return structuredClone(f.state.old);};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/after 4 reads/);
    assert.equal(f.state.tag,SHA);assert.equal(f.state.release.draft,true);
    assert.equal(f.calls.filter(c=>c[0]==='wait').length,3);assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Tag already exists/);
    assert.equal(f.calls.filter(c=>c[0]==='gh' && c[2]==='create').length,1);
});
for(const status of [401,403,429,500])test(`draft lookup HTTP ${status} stops immediately without retries or publication`,async t=>{
    const f=fixture(t);f.state.hook=(op,route)=>{if(op==='list'&&route.startsWith('releases?')&&f.state.release)throw Object.assign(new Error(`HTTP ${status}`),{status});};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),new RegExp(`HTTP ${status}`));
    assert.ok(!f.calls.some(c=>['wait','PATCH'].includes(c[0])));assert.equal(f.state.release.draft,true);
});
test('conflicting inventory or wrong ID response never becomes public',async t=>{
    const f=fixture(t);f.state.hook=(op,route)=>{if(op==='list'&&route.startsWith('releases?')&&f.state.release)return [f.state.release,{...f.state.release,id:3}];};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Conflicting new beta draft/);
    assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
    f.state.tag=null;f.state.release=null;
    f.state.hook=(op,route)=>{if(op==='GET'&&route==='releases/2')f.state.release.target_commitish=OTHER;};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/target mismatch/);
    assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
});
test('draft is re-read by exact ID and revalidated immediately before public PATCH',async t=>{
    const f=fixture(t);let reads=0;
    f.state.hook=(op,route)=>{if(op==='GET'&&route==='releases/2'&&++reads===2)f.state.release.assets.pop();};
    await assert.rejects(publish(f.io,f.expected,f.output,f.env,ARTIFACT),/Unexpected\/missing beta assets/);
    assert.equal(f.state.release.draft,true);assert.ok(!f.calls.some(c=>c[0]==='PATCH'));
});
