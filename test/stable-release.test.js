'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {validateArtifact} = require('../scripts/check-release');
const {assertPublication, assertAssets, assertRetained, publish, digest} = require('../scripts/stable-release');
const {authorizeApply} = require('../scripts/release-retention');
const COMMIT='a'.repeat(40);
const BUNDLE=Buffer.from(' '.repeat(11000)+'\n"honeycomb-persistent-hub";');
const META={version:'1.7.0',tag:'v1.7.0',commit:COMMIT,sha256:digest(BUNDLE),bytes:BUNDLE.length,filename:'honeycomb-menu-ng.js'};
const PKG={version:'1.7.0'}, RELEASE={title:'Honeycomb NG v1.7.0 — Stable',prerelease:false}, HACS={filename:META.filename,content_in_root:true};
function files(){return {'honeycomb-menu-ng.js':BUNDLE,'SHA256SUMS.txt':Buffer.from(`${META.sha256}  honeycomb-menu-ng.js\n`),'release-provenance.json':Buffer.from(JSON.stringify(META)+'\n')};}
function record(data=files()){return {id:2,tag_name:META.tag,target_commitish:COMMIT,prerelease:false,draft:true,published_at:null,
    assets:Object.entries(data).map(([name,bytes],index)=>({id:index+10,name,size:bytes.length,state:'uploaded',digest:`sha256:${digest(bytes)}`}))};}
test('stable metadata/HACS/JavaScript checksum validation accepts the actual contract',()=>{
    assert.deepEqual(validateArtifact(PKG,RELEASE,HACS,BUNDLE,{stable:true}),Object.fromEntries(Object.entries(META).filter(([key])=>key!=='commit')));
    assert.doesNotThrow(()=>validateArtifact({version:'1.7.0-beta.3'},{title:'Honeycomb NG v1.7.0-beta.3 — Preview',prerelease:true},HACS,BUNDLE));
});
for(const [label,pkg,release,hacs,bytes] of [
    ['beta',{version:'1.7.0-beta.3'},{title:'Honeycomb NG v1.7.0-beta.3 — Preview',prerelease:true},HACS,BUNDLE],
    ['flag conflict',PKG,{...RELEASE,prerelease:true},HACS,BUNDLE],
    ['title conflict',PKG,{...RELEASE,title:'Honeycomb NG v1.5.1'},HACS,BUNDLE],
    ['HACS filename',PKG,RELEASE,{...HACS,filename:'wrong.js'},BUNDLE],
    ['truncated JS',PKG,RELEASE,HACS,Buffer.from('invalid')],
    ['syntax error',PKG,RELEASE,HACS,Buffer.from(' '.repeat(11000)+'honeycomb-persistent-hub {')],
    ['unsupported version',{version:'1.7'},RELEASE,HACS,BUNDLE],
])test(`artifact validation rejects ${label}`,()=>assert.throws(()=>validateArtifact(pkg,release,hacs,bytes,{stable:true})));
const gates={commit:COMMIT,checkout:COMMIT,master:COMMIT,ref:'refs/heads/master',retention:'false',tagExists:false,releaseExists:false};
for(const [key,value] of [['commit','master'],['checkout','b'.repeat(40)],['master','c'.repeat(40)],['ref','refs/heads/feature/synthetic'],['retention',''],['retention','true'],['retention','False'],['tagExists',true],['releaseExists',true]])
    test(`publication gate rejects ${key}=${value}`,()=>assert.throws(()=>assertPublication({...gates,[key]:value})));
test('explicit read-only retention overrides even a true owner enable variable',()=>{
    assert.throws(()=>authorizeApply({GITHUB_ACTIONS:'true',RELEASE_RETENTION_ENABLED:'true',RETENTION_DRY_RUN_ONLY:'true'},{},null,'example/honeycomb'),/explicitly dry-run only/);
});
test('asset validation checks all filenames, bytes, digests and provenance',()=>{
    const data=files();assert.doesNotThrow(()=>assertAssets(record(),META,data));
    for(const mutate of [r=>r.assets.pop(),r=>r.assets.push({...r.assets[0],name:'extra.js'}),r=>r.assets[0].digest='sha256:wrong',r=>r.assets[0].state='new',r=>r.assets[0].size++]){
        const r=record();mutate(r);assert.throws(()=>assertAssets(r,META,data));
    }
    assert.throws(()=>assertAssets(record(),META,{...data,'honeycomb-menu-ng.js':Buffer.from('wrong')}));
    assert.throws(()=>assertAssets(record(),META,{...data,'release-provenance.json':Buffer.from(JSON.stringify({...META,commit:'b'.repeat(40)}))}));
    assert.throws(()=>assertAssets(record(),META,{...data,'SHA256SUMS.txt':Buffer.from('wrong')}));
});
test('retention verification rejects missing/edited releases or their assets',()=>{
    const before=[{id:1,tag_name:'v1.5.1',draft:false,prerelease:false,published_at:'2026-01-01T00:00:00Z',assets:[{id:9,name:'bundle.js',size:1}]}];
    const after=[...structuredClone(before),record()];assert.doesNotThrow(()=>assertRetained(before,after,2));
    for(const mutation of [a=>a.shift(),a=>a[0].prerelease=true,a=>a[0].assets=[],a=>a.push({...record(),id:3})]){
        const a=structuredClone(after);mutation(a);assert.throws(()=>assertRetained(before,a,2));
    }
});
function fixture(t,hook=()=>{}){
    // Stable transport fixtures stay independent of this branch's active beta notes.
    const read=fs.readFileSync.bind(fs);
    t.mock.method(fs,'readFileSync',(file,...args)=>file==='RELEASE_NOTES.md'?'# v1.7.0 — Stable\nSynthetic stable fixture.\n':read(file,...args));
    const output=fs.mkdtempSync(path.join(os.tmpdir(),'stable-publisher-test-'));t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
    const oldEnv={ref:process.env.GITHUB_REF,retention:process.env.RELEASE_RETENTION_ENABLED};
    process.env.GITHUB_REF='refs/heads/master';process.env.RELEASE_RETENTION_ENABLED='false';
    t.after(()=>{for(const [name,value]of[['GITHUB_REF',oldEnv.ref],['RELEASE_RETENTION_ENABLED',oldEnv.retention]]){if(value===undefined)delete process.env[name];else process.env[name]=value;}});
    for(const [name,bytes] of Object.entries(files()))fs.writeFileSync(path.join(output,name),bytes);
    const old={id:1,tag_name:'v1.5.1',draft:false,prerelease:false,published_at:'2026-01-01T00:00:00Z',assets:[]};
    const state={old:[old],release:null,tag:null,calls:[],output};
    const io={
        list:()=>structuredClone([...state.old,...(state.release?[state.release]:[])]),
        tagExists:()=>Boolean(state.tag),
        git:args=>{state.calls.push(['git',...args]);hook(state,'git',args);return args[0]==='rev-parse'?COMMIT:'';},
        api:(route,method='GET',data)=>{
            state.calls.push([method,route]);const intercepted=hook(state,method,route,data);if(intercepted)return intercepted;
            if(route==='branches/master')return{commit:{sha:COMMIT}};
            if(route==='git/refs'&&method==='POST'){assert.equal(state.tag,null);state.tag=data.sha;return{object:{sha:state.tag}};}
            if(route.startsWith('git/ref/tags/'))return{object:{sha:state.tag}};
            if(route==='releases/latest')return state.release&&!state.release.draft?structuredClone(state.release):structuredClone(state.old[0]);
            if(route==='releases/2'&&method==='PATCH'){assert.equal(data.make_latest,'true');state.release={...state.release,draft:false,published_at:'2026-10-20T00:00:00Z'};return structuredClone(state.release);}
            throw new Error(`Unexpected synthetic operation ${method} ${route}`);
        },
        gh:args=>{
            state.calls.push(['gh',...args]);hook(state,'gh',args);
            if(args[1]==='create'){assert.ok(args.includes('--draft'));assert.ok(args.includes('--verify-tag'));state.release=record();}
            else if(args[1]==='download'){
                const dir=args[args.indexOf('--dir')+1];for(const[name,bytes]of Object.entries(files()))fs.writeFileSync(path.join(dir,name),bytes);
                hook(state,'downloaded',dir);
            }else throw new Error('Unexpected synthetic CLI command');return'';
        },
    };
    return{io,state};
}
test('publisher integration creates only a new tag/draft, verifies downloads, then publishes stable/latest',async t=>{
    const {io,state}=fixture(t);const result=await publish(io,META,state.output);
    assert.equal(result.id,2);assert.equal(result.draft,false);assert.equal(state.tag,COMMIT);
    const publishIndex=state.calls.findIndex(c=>c[0]==='PATCH');const downloadIndex=state.calls.findIndex(c=>c[0]==='gh'&&c[2]==='download');
    assert.ok(publishIndex>downloadIndex);assert.ok(!state.calls.some(c=>c[0]==='DELETE'||c.includes('--force')));
    assert.equal(state.old.length,1);
});
test('corrupted draft download stops before public publication and retains draft/tag for inspection',async t=>{
    const {io,state}=fixture(t,(_,op,dir)=>{if(op==='downloaded')fs.writeFileSync(path.join(dir,'honeycomb-menu-ng.js'),'corrupt');});
    await assert.rejects(publish(io,META,state.output),/Downloaded/);
    assert.equal(state.release.draft,true);assert.equal(state.tag,COMMIT);assert.ok(!state.calls.some(c=>c[0]==='PATCH'));
});
test('master movement after upload stops publication without deleting partial state',async t=>{
    let reads=0;const {io,state}=fixture(t,(_,op,route)=>op==='GET'&&route==='branches/master'&&++reads===2?{commit:{sha:'b'.repeat(40)}}:undefined);
    await assert.rejects(publish(io,META,state.output),/Master moved/);assert.equal(state.release.draft,true);assert.equal(state.tag,COMMIT);
});
test('existing tag or conflicting release version prevents any mutation',async t=>{
    const {io,state}=fixture(t);state.tag=COMMIT;
    await assert.rejects(publish(io,META,state.output),/Tag already exists/);assert.equal(state.release,null);
    state.tag=null;state.old.push({...state.old[0],id:7,tag_name:'1.7.0'});
    await assert.rejects(publish(io,META,state.output),/Release already exists/);assert.equal(state.tag,null);
});
test('a newer stable or unknown inventory blocks before creating a tag',async t=>{
    const {io,state}=fixture(t);state.old[0].tag_name='v1.8.0';
    await assert.rejects(publish(io,META,state.output),/older stable/);assert.equal(state.tag,null);
    state.old[0].tag_name='v1.5.1';state.old.push({...state.old[0],id:8,tag_name:'unknown'});
    await assert.rejects(publish(io,META,state.output),/Unknown\/conflicting/);assert.equal(state.tag,null);
});
test('an existing release disappearing during staging blocks before publish',async t=>{
    const {io,state}=fixture(t,(s,op)=>{if(op==='downloaded')s.old=[];});
    await assert.rejects(publish(io,META,state.output),/inventory change/);assert.equal(state.release.draft,true);
});
test('stable workflow pins tested master, requires false, validates CI artifacts and forces v1.7.0 dry-run',()=>{
    const workflow=fs.readFileSync('.github/workflows/stable-release.yml','utf8');
    assert.match(workflow,/github.ref == 'refs\/heads\/master'/);assert.match(workflow,/test "\$RELEASE_RETENTION_ENABLED" = false/);
    assert.match(workflow,/--event push --status success/);assert.match(workflow,/cmp honeycomb-menu-ng.js/);
    assert.match(workflow,/dry_run_only: \$\{\{ needs.publish.outputs.version == '1.7.0' \}\}/);
    assert.ok(!workflow.includes('/actions/variables/'));assert.ok(!workflow.includes('gh release delete'));assert.ok(!workflow.includes('--force'));
    const retention=fs.readFileSync('.github/workflows/release-retention.yml','utf8');assert.match(retention,/inputs.dry_run_only != true/);
});

test('an older designated latest cannot hide a higher stable from the inventory gate',async t=>{
    const {io,state}=fixture(t);state.old.push({...state.old[0],id:8,tag_name:'v2.0.0'});
    await assert.rejects(publish(io,META,state.output),/Higher stable/);assert.equal(state.tag,null);
});

test('CLI prepares deterministic assets and refuses a changed provenance before contacting GitHub',t=>{
    const {spawnSync}=require('node:child_process');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stable-cli-assets-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
    const script=path.resolve('scripts/stable-release.js');
    const fixture=path.join(dir,'fixture');fs.mkdirSync(fixture);
    for(const [name,value] of Object.entries({'package.json':PKG,'release.json':RELEASE,'hacs.json':HACS}))fs.writeFileSync(path.join(fixture,name),JSON.stringify(value));
    fs.writeFileSync(path.join(fixture,'honeycomb-menu-ng.js'),BUNDLE);
    const childEnv={...process.env,PUBLICATION_MODE:'prepare',EXPECTED_COMMIT:COMMIT,RELEASE_OUTPUT:dir};
    const prepared=spawnSync(process.execPath,[script],{cwd:fixture,env:childEnv,encoding:'utf8'});
    assert.equal(prepared.status,0,prepared.stderr);
    const provenance=JSON.parse(fs.readFileSync(path.join(dir,'release-provenance.json')));
    assert.equal(provenance.version,'1.7.0');assert.equal(provenance.commit,COMMIT);
    assert.equal(digest(fs.readFileSync(path.join(dir,'honeycomb-menu-ng.js'))),provenance.sha256);
    fs.writeFileSync(path.join(dir,'release-provenance.json'),JSON.stringify({...provenance,commit:'b'.repeat(40)}));
    const bin=path.join(dir,'bin'),sentinel=path.join(dir,'unexpected-gh');fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin,'gh'),'#!/bin/sh\ntouch "$STABLE_TEST_GH_SENTINEL"\nexit 99\n',{mode:0o755});
    const refused=spawnSync(process.execPath,[script],{cwd:fixture,env:{...childEnv,PUBLICATION_MODE:'publish',PATH:bin+path.delimiter+process.env.PATH,
        GITHUB_REPOSITORY:'example/honeycomb',GITHUB_REF:'refs/heads/master',RELEASE_RETENTION_ENABLED:'false',STABLE_TEST_GH_SENTINEL:sentinel},encoding:'utf8'});
    assert.equal(refused.status,1);assert.match(refused.stderr,/Verified artifact release-provenance.json changed/);assert.equal(fs.existsSync(sentinel),false);
});
test('v1.7.1 beta metadata validates locally while stable publication remains forbidden',()=>{
    const pkg={version:'1.7.1-beta.1'},release={title:'Honeycomb NG v1.7.1-beta.1 — Sonos owner test',prerelease:true};
    assert.doesNotThrow(()=>validateArtifact(pkg,release,HACS,BUNDLE));
    assert.throws(()=>validateArtifact(pkg,release,HACS,BUNDLE,{stable:true}),/stable metadata/);
    assert.match(fs.readFileSync('scripts/check-beta.js','utf8'),/isBetaVersion/);
});
