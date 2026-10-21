'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {validateArtifact,isStableVersion}=require('../scripts/check-release');
const stable=require('../scripts/stable-release');
const {assertPublication,assertAssets,assertRetained,context,verify,inventory,newDraft,filesFor,publish,digest}=stable;
const {banner,withBanner}=require('../scripts/stable-approval');
const SHA='a'.repeat(40),BETA='b'.repeat(40),TREE='c'.repeat(40),REPO='example/honeycomb';
const RAW=Buffer.from(' '.repeat(11000)+'\n"honeycomb-persistent-hub";'),BUNDLE=Buffer.concat([Buffer.from(banner('1.7.1')),RAW]);
const ART={version:'1.7.1',tag:'v1.7.1',sha256:digest(BUNDLE),bytes:BUNDLE.length,filename:'honeycomb-menu-ng.js'};
const HACS={filename:ART.filename,content_in_root:true},PKG={version:ART.version,scripts:{test:'node test.js'}};
const APPROVAL={version:ART.version,issue:`https://github.com/${REPO}/issues/102`,approved_beta:{tag:'v1.7.1-beta.8',commit:BETA,src_tree:TREE,sha256:digest(RAW),bytes:RAW.length},allowed_bundle_change:'version-banner-v1'};
const ENV={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/master',GITHUB_SHA:SHA,GITHUB_REPOSITORY:REPO,EXPECTED_COMMIT:SHA,RELEASE_RETENTION_ENABLED:'false',STABLE_PUBLICATION_AUTHORIZED:'true'};
const RUN={id:11,run_attempt:1,path:'.github/workflows/build.yml',head_sha:SHA,head_branch:'master',head_repository:{full_name:REPO},event:'push',status:'completed',conclusion:'success'};
const META={...ART,repository:REPO,branch:'master',commit:SHA,approval:APPROVAL,ci:{push:{id:11,attempt:1}}};
const BASE_CONFIG="const path = require('path');\nmodule.exports={\n    entry: './src/honeycomb-menu.js',\n};\n";
const baseFiles={'package.json':JSON.stringify({...PKG,version:'1.7.1-beta.8'}),'package-lock.json':JSON.stringify({version:'1.7.1-beta.8',dependencies:{}}),'webpack.config.js':BASE_CONFIG,'honeycomb-menu-ng.js':RAW};
const read=fs.readFileSync.bind(fs);
function fixture(t){
    const output=fs.mkdtempSync(path.join(os.tmpdir(),'stable-release-'));t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
    const old={id:1,tag_name:'v1.7.0',draft:false,prerelease:false,published_at:'2026-01-01T00:00:00Z',assets:[]};
    const state={output,head:SHA,tag:null,release:null,old:[old],runs:[structuredClone(RUN)],jobs:[{name:'build',status:'completed',conclusion:'success'},{name:'workflow-lint',status:'completed',conclusion:'success'}],hook:()=>undefined,calls:[]};
    const fake={...filesFor(META,BUNDLE),'release-approval.json':JSON.stringify(APPROVAL),'release.json':JSON.stringify({title:'Honeycomb NG v1.7.1 — Stable',prerelease:false}),
        'RELEASE_NOTES.md':'# v1.7.1 — Stable\nOwner approved synthetic notes.\n','package.json':JSON.stringify(PKG),'package-lock.json':JSON.stringify({version:'1.7.1',dependencies:{}}),'webpack.config.js':withBanner(BASE_CONFIG)};
    t.mock.method(fs,'readFileSync',(file,...args)=>typeof file==='string' && file in fake?fake[file]:read(file,...args));
    for(const [name,bytes]of Object.entries(filesFor(META,BUNDLE)))fs.writeFileSync(path.join(output,name),bytes);
    const record=()=>({id:2,tag_name:ART.tag,target_commitish:SHA,draft:true,prerelease:false,published_at:null,assets:Object.entries(filesFor(META,BUNDLE)).map(([name,bytes],i)=>({id:i+10,name,size:bytes.length,state:'uploaded',digest:'sha256:'+digest(bytes)}))});
    const io={wait:async ms=>{state.calls.push(['wait',ms]);},readGit:(sha,file)=>{assert.equal(sha,BETA);return Buffer.from(baseFiles[file]);},
        git:args=>{state.calls.push(['git',...args]);const hit=state.hook('git',args);if(hit!==undefined)return hit;return args[0]==='rev-parse'?(args[1]==='HEAD'?SHA:TREE):'';},
        list:route=>{
            state.calls.push(['list',route]);const hit=state.hook('list',route);if(hit!==undefined)return hit;
            if(route.startsWith('actions/workflows/'))return structuredClone(state.runs);
            if(route.startsWith('actions/runs/'))return structuredClone(state.jobs);
            if(route.startsWith('git/matching-refs/'))return state.tag?[{ref:`refs/tags/${ART.tag}`}]:[];
            if(route.startsWith('releases?'))return structuredClone([...state.old,...(state.release?[state.release]:[])]);
            throw Error('Unexpected list '+route);
        },
        api:(route,method='GET',data)=>{
            state.calls.push([method,route,data]);const hit=state.hook(method,route,data);if(hit!==undefined)return hit;
            if(route==='git/ref/heads/master')return{ref:'refs/heads/master',object:{type:'commit',sha:state.head}};
            if(route.startsWith('actions/runs/'))return structuredClone(state.runs.find(r=>r.id===Number(route.split('/').pop())));
            if(route==='git/ref/tags/v1.7.1-beta.8')return{ref:'refs/tags/v1.7.1-beta.8',object:{type:'commit',sha:BETA}};
            if(route==='releases/tags/v1.7.1-beta.8')return{tag_name:'v1.7.1-beta.8',target_commitish:BETA,draft:false,prerelease:true,published_at:'2026-10-21T00:00:00Z',assets:[{name:ART.filename,size:RAW.length,state:'uploaded',digest:'sha256:'+digest(RAW)}]};
            if(route==='releases/latest')return structuredClone(state.release&&!state.release.draft?state.release:state.old[0]);
            if(route==='git/refs'&&method==='POST'){assert.equal(state.tag,null);state.tag=data.sha;return{};}
            if(route==='git/ref/tags/v1.7.1')return{ref:'refs/tags/v1.7.1',object:{type:'commit',sha:state.tag}};
            if(route==='releases/2'&&method==='GET')return structuredClone(state.release);
            if(route==='releases/2'&&method==='PATCH'){assert.deepEqual(data,{draft:false,prerelease:false,make_latest:'true'});state.release={...state.release,draft:false,published_at:'2026-10-21T00:00:00Z'};return structuredClone(state.release);}
            throw Error(`Unexpected ${method} ${route}`);
        },
        gh:args=>{state.calls.push(['gh',...args]);state.hook('gh',args);
            if(args[1]==='create'){assert.ok(args.includes('--draft')&&args.includes('--verify-tag')&&args.includes('--latest=false'));state.release=record();}
            else if(args[1]==='download'){const dir=args[args.indexOf('--dir')+1];for(const [name,bytes]of Object.entries(filesFor(META,BUNDLE)))fs.writeFileSync(path.join(dir,name),bytes);state.hook('downloaded',dir);}
            else throw Error('Unexpected command');return'';}
    };
    return{io,state,fake,env:{...ENV},expected:structuredClone(META)};
}
for(const version of ['0.0.0','1.7.0','1.7.1','1.8.0','2.0.0','23.12.456'])test(`canonical stable SemVer ${version} accepted`,()=>{
    assert.equal(isStableVersion(version),true);assert.doesNotThrow(()=>validateArtifact({version},{title:`Honeycomb NG v${version} — Stable`,prerelease:false},HACS,BUNDLE,{stable:true}));
});
for(const version of ['v1.7.1','1.7','1.07.1','1.7.1-beta.8','1.7.1-alpha.1','1.7.1-rc.1','9007199254740992.1.1'])test(`stable rejects ${version}`,()=>assert.throws(()=>validateArtifact({version},{title:`Honeycomb NG v${version} — Stable`,prerelease:false},HACS,BUNDLE,{stable:true})));
test('artifact rejects flags/title/HACS/syntax corruption and beta stable attempts',()=>{
    for(const [release,hacs,bytes]of [[{prerelease:true,title:'Honeycomb NG v1.7.1 — Stable'},HACS,BUNDLE],[{prerelease:false,title:'wrong'},HACS,BUNDLE],[{prerelease:false,title:'Honeycomb NG v1.7.1 — Stable'},{...HACS,filename:'wrong'},BUNDLE],[{prerelease:false,title:'Honeycomb NG v1.7.1 — Stable'},HACS,Buffer.from('invalid')]])
        assert.throws(()=>validateArtifact(PKG,release,hacs,bytes,{stable:true}));
    assert.throws(()=>validateArtifact({version:'1.7.1-beta.8'},{title:'Honeycomb NG v1.7.1-beta.8',prerelease:true},HACS,BUNDLE,{stable:true}));
});
for(const [key,value]of [['GITHUB_EVENT_NAME','push'],['GITHUB_REF','refs/heads/release/test'],['GITHUB_SHA',BETA],['EXPECTED_COMMIT','master'],['RELEASE_RETENTION_ENABLED',''],['RELEASE_RETENTION_ENABLED','true'],['RELEASE_RETENTION_ENABLED','False']])test(`manual context rejects ${key}=${value}`,()=>assert.throws(()=>context({...ENV,[key]:value})));
test('valid source/public beta/latest master CI produces complete pinned provenance',t=>{const {io,env}=fixture(t);assert.deepEqual(verify(io,env,ART),META);});
for(const mutate of [s=>s.head=BETA,s=>s.runs[0].status='in_progress',s=>s.runs[0].conclusion='failure',s=>s.runs[0].head_sha=BETA,s=>s.runs[0].head_repository.full_name='other/repo',s=>s.runs[0].path='wrong.yml',s=>s.jobs[0].conclusion='skipped',s=>s.jobs.pop(),s=>s.runs.push({...RUN,id:12,conclusion:'failure'})])test('wrong/stale/failed/skipped latest CI or master movement is rejected',t=>{const {io,env,state}=fixture(t);mutate(state);assert.throws(()=>verify(io,env,ART));});
test('pinned CI attempt and public beta flags/checksum/tag cannot change',t=>{
    const {io,env,state}=fixture(t);assert.throws(()=>verify(io,{...env,VALIDATED_CI_RUN:'12'},ART));
    for(const route of ['git/ref/tags/v1.7.1-beta.8','releases/tags/v1.7.1-beta.8']) {
        state.hook=(method,path)=>method==='GET'&&path===route?(route.startsWith('git/')?{ref:'refs/tags/v1.7.1-beta.8',object:{type:'commit',sha:SHA}}:{tag_name:'v1.7.1-beta.8',target_commitish:BETA,draft:true,prerelease:true,assets:[]}):undefined;
        assert.throws(()=>verify(io,env,ART));
    }
});
test('new stable publication verifies staged/downloaded bytes, repeats CI and preserves all inventory',async t=>{
    const {io,state,env,expected}=fixture(t);const release=await publish(io,expected,state.output,env,ART);
    assert.equal(release.draft,false);assert.equal(release.prerelease,false);assert.equal(state.tag,SHA);
    assert.ok(state.calls.findIndex(c=>c[0]==='PATCH')>state.calls.findIndex(c=>c[0]==='gh'&&c[2]==='download'));
    assert.equal(state.calls.filter(c=>c[0]==='GET'&&c[1]==='actions/runs/11').length,2);
    assert.ok(!state.calls.some(c=>c[0]==='DELETE'||c.includes('--force')));
});
for(const reason of ['auth','existing-tag','existing-release','newer-stable','unknown-inventory','bad-notes','runtime','staged'])test(`prepublication ${reason} blocks without creating tag/draft`,async t=>{
    const {io,state,env,expected,fake}=fixture(t);
    if(reason==='auth')env.STABLE_PUBLICATION_AUTHORIZED='false';
    if(reason==='existing-tag')state.tag=SHA;
    if(reason==='existing-release')state.old.push({...state.old[0],id:9,tag_name:'v1.7.1',draft:true});
    if(reason==='newer-stable')state.old.push({...state.old[0],id:9,tag_name:'v2.0.0'});
    if(reason==='unknown-inventory')state.old.push({...state.old[0],id:9,tag_name:'unknown'});
    if(reason==='bad-notes')fake['RELEASE_NOTES.md']='# v1.7.0 — Stable\nwrong';
    if(reason==='runtime')state.hook=(op,args)=>op==='git'&&args[0]==='diff'?'unexpected runtime diff':undefined;
    if(reason==='staged')fs.writeFileSync(path.join(state.output,'SHA256SUMS.txt'),'corrupt');
    await assert.rejects(publish(io,expected,state.output,env,ART));assert.equal(state.release,null);
    if(reason!=='existing-tag')assert.equal(state.tag,null);
});
for(const reason of ['download','master','ci','inventory','draft','tag'])test(`late ${reason} change preserves partial draft/tag and refuses public publication`,async t=>{
    const {io,state,env,expected}=fixture(t);
    state.hook=(op,value)=>{if(op==='downloaded'){
        if(reason==='download')fs.writeFileSync(path.join(value,ART.filename),'bad');
        if(reason==='master')state.head=BETA;if(reason==='ci')state.runs[0].run_attempt++;
        if(reason==='inventory')state.old[0].body='edited';if(reason==='draft')state.release.draft=false;if(reason==='tag')state.tag=BETA;
    }};
    await assert.rejects(publish(io,expected,state.output,env,ART));assert.ok(state.release);assert.ok(!state.calls.some(c=>c[0]==='PATCH'));
});
test('draft visibility lag gets bounded reads; permission errors and ambiguity never retry mutations',async t=>{
    const {io,state,env,expected}=fixture(t);let misses=0;
    state.hook=(op,route)=>op==='list'&&route.startsWith('releases?')&&state.release&&misses++<2?structuredClone(state.old):undefined;
    await publish(io,expected,state.output,env,ART);
    assert.equal(state.calls.filter(c=>c[0]==='POST').length,1);assert.equal(state.calls.filter(c=>c[0]==='wait').length,2);
});
test('missing new draft and 403 fail closed without deletion or recreation',async t=>{
    const {io,state}=fixture(t);
    await assert.rejects(newDraft(io,META),/after 4 reads/);assert.equal(state.calls.filter(c=>c[0]==='wait').length,3);
    state.hook=op=>{if(op==='list')throw Error('HTTP 403')};
    await assert.rejects(newDraft(io,META),/403/);assert.ok(!state.calls.some(c=>c[0]==='POST'));
});
test('asset validation rejects any mismatch in bytes, metadata, files or provenance',async t=>{
    const {io,state,env,expected}=fixture(t);await publish(io,expected,state.output,env,ART);
    const files=filesFor(expected,BUNDLE),record=structuredClone(state.release);assertAssets(record,expected,files);
    for(const mutate of [r=>r.assets.pop(),r=>r.prerelease=true,r=>r.assets[0].digest='sha256:wrong',r=>r.assets[0].size++]){const r=structuredClone(record);mutate(r);assert.throws(()=>assertAssets(r,expected,files));}
    assert.throws(()=>assertAssets(record,expected,{...files,'release-provenance.json':Buffer.from('{}')}));
});
test('inventory preservation checks existing metadata, drafts and asset digests',()=>{
    const old={id:1,tag_name:'v1.0.0-beta.1',draft:true,prerelease:true,assets:[{id:9,name:'old.js',size:3,digest:'sha256:old'}]},next={id:2,assets:[]};
    assertRetained([old],[old,next],2);
    for(const change of [r=>r.body='edit',r=>r.assets[0].digest='changed',r=>r.draft=false]){const r=structuredClone(old);change(r);assert.throws(()=>assertRetained([old],[r,next],2));}
});
test('workflow is master-only, exact-source verified, explicitly authorized and always read-only retention',()=>{
    const text=fs.readFileSync('.github/workflows/stable-release.yml','utf8');
    for(const expected of ['github.ref == \'refs/heads/master\'','STABLE_PUBLICATION_AUTHORIZED: ${{ inputs.publish }}','dry_run_only: true','test "$RELEASE_RETENTION_ENABLED" = false','cmp honeycomb-menu-ng.js','node scripts/stable-release.js'])assert.ok(text.includes(expected),expected);
    for(const banned of ['7706859016872ee95bde4299b10a07c072fa38b6','--status success','/actions/variables/','--force','gh release delete'])assert.ok(!text.includes(banned));
});

test('checkout mismatch and API 403 stop verification without any mutations',t=>{
    const {io,state,env}=fixture(t);
    state.hook=(op,args)=>op==='git'&&args[0]==='rev-parse'&&args[1]==='HEAD'?BETA:undefined;
    assert.throws(()=>verify(io,env,ART),/Checkout/);
    state.hook=(op,route)=>{if(op==='GET'&&route==='git/ref/heads/master')throw Error('HTTP 403')};
    assert.throws(()=>verify(io,env,ART),/403/);assert.ok(!state.calls.some(c=>c[0]==='POST'||c[0]==='PATCH'));
});
test('public approved beta checksum, size and timestamp are required',t=>{
    const {io,state,env}=fixture(t);
    const valid=io.api('releases/tags/v1.7.1-beta.8');
    for(const mutate of [r=>r.assets[0].digest='sha256:wrong',r=>r.assets[0].size++,r=>r.published_at=null]){
        const bad=structuredClone(valid);mutate(bad);
        state.hook=(op,route)=>op==='GET'&&route==='releases/tags/v1.7.1-beta.8'?bad:undefined;
        assert.throws(()=>verify(io,env,ART));
    }
});
test('CI identity includes branch/event and exact attempt, with all jobs successful',t=>{
    const {io,state,env}=fixture(t);
    for(const mutate of [r=>r.head_branch='feature/wrong',r=>r.event='workflow_dispatch',r=>r.run_attempt=0]){
        state.runs=[structuredClone(RUN)];mutate(state.runs[0]);assert.throws(()=>verify(io,env,ART));
    }
    state.runs=[structuredClone(RUN)];state.jobs[0].conclusion='failure';assert.throws(()=>verify(io,env,ART));
});
test('ambiguous or edited new draft and 403 exact-ID reads never retry creation',async t=>{
    const {io,state}=fixture(t);const draft={id:2,tag_name:ART.tag,target_commitish:SHA,draft:true,prerelease:false,assets:[]};
    state.release=draft;
    state.hook=(op,route)=>op==='list'&&route.startsWith('releases?')?[draft,{...draft,id:3}]:undefined;
    await assert.rejects(newDraft(io,META),/Conflicting/);
    state.hook=(op,route)=>{if(op==='GET'&&route==='releases/2')throw Error('HTTP 403')};
    await assert.rejects(newDraft(io,META),/403/);
    state.hook=(op,route)=>op==='GET'&&route==='releases/2'?{...draft,target_commitish:BETA}:undefined;
    await assert.rejects(newDraft(io,META));assert.ok(!state.calls.some(c=>c[0]==='POST'||c[0]==='wait'));
});
