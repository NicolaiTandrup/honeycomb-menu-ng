const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildMetadata}=require('../scripts/build-version');
const commit='123456789abc123456789abc123456789abc1234';
test('release and beta metadata retain exact normal versions without Git dependency',()=>{
    for(const version of ['1.8.1','1.9.0-beta.5'])assert.deepEqual(buildMetadata(version),{version,commit:null});
});
test('dev metadata embeds actual source commit and distinguishes dirty builds',()=>{
    assert.deepEqual(buildMetadata('1.9.0-beta.6-dev',commit),{version:'1.9.0-beta.6-dev+123456789abc',commit});
    assert.equal(buildMetadata('1.9.0-beta.6-dev',commit,true).version,'1.9.0-beta.6-dev+123456789abc.dirty');
    assert.throws(()=>buildMetadata('1.9.0-beta.6-dev','missing'),/real Git/);
});
test('missing compiler metadata fails gracefully without inventing a release version',()=>{
    assert.deepEqual(require('../src/core/build-info'),{version:'Version unavailable',commit:null});
});

const {versionLabel}=require('../src/core/version-label');
for(const [version,text] of [
    ['1.9.0-beta.6-dev+123456789abc','v1.9.0 beta 6'],
    ['1.9.0-beta.6','v1.9.0 beta 6'],['2.12.3-beta.17+build.2','v2.12.3 beta 17'],
    ['2.0.0','v2.0.0'],['v1.8.1','v1.8.1'],['1.9.0-dev+123456789abc.dirty','v1.9.0'],
    [null,'Version unavailable'],['unexpected','Version unavailable'],['1.9.0-beta.06','Version unavailable']
])test(`readable bee label ${version} keeps technical metadata out of visual text`,()=>{
    assert.equal(versionLabel(version).text,text);
    assert.ok(!versionLabel(version).text.includes('+'));assert.ok(!versionLabel(version).text.includes('-dev'));
});

test('private packaging derives a dev identity without changing releasable source metadata',()=>{
    const {developmentVersion}=require('../scripts/build-version');
    assert.equal(developmentVersion('1.9.0-beta.6'),'1.9.0-beta.6-dev');
    assert.equal(developmentVersion('1.9.0-beta.6-dev'),'1.9.0-beta.6-dev');
    assert.throws(()=>developmentVersion('1.9.0'),/beta.N/);
    assert.deepEqual(buildMetadata('1.9.0-beta.6'),{version:'1.9.0-beta.6',commit:null});
});

test('CI checksum pipeline propagates validator failures instead of accepting tee success',()=>{
    const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
    const {spawnSync}=require('node:child_process');
    const workflow=fs.readFileSync('.github/workflows/build.yml','utf8');
    const step=/      - name: Verify build output\n        run: \|\n([\s\S]*?)(?=\n      - name:)/.exec(workflow)[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'ng-ci-fail-closed-'));
    try {
        const bin=path.join(root,'bin');fs.mkdirSync(bin);fs.writeFileSync(path.join(bin,'node'),'#!/bin/sh\nexit 7\n',{mode:0o755});
        const result=spawnSync('bash',['-c',step],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,RUNNER_TEMP:root}});
        assert.equal(result.status,7,'An invalid/checksum-failing bundle must fail this actual workflow step');
    } finally {fs.rmSync(root,{recursive:true,force:true});}
});
