'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {localArtifact,isStableVersion}=require('../scripts/check-release');
const {validateApproval,verifyApprovedSource,withBanner,banner}=require('../scripts/stable-approval');
const approval=JSON.parse(fs.readFileSync('release-approval.json'));
const onlyStable={skip:!isStableVersion(JSON.parse(fs.readFileSync('package.json')).version)};
const io={git:args=>execFileSync('git',args,{encoding:'utf8'}).trim(),readGit:(sha,file)=>execFileSync('git',['show',`${sha}:${file}`])};
test('stable candidate exactly preserves approved beta source, dependencies and executable bundle',onlyStable,()=>{
    validateApproval(approval,localArtifact(true).version,'NicolaiTandrup/honeycomb-menu-ng');
    verifyApprovedSource(io,localArtifact(true),approval);
});
for(const field of ['version','issue','allowed_bundle_change','commit','src_tree','sha256','bytes'])
    test(`approval rejects invalid ${field}`,()=>{
        const value=structuredClone(approval);
        if(field in value)value[field]='invalid';else value.approved_beta[field]=field==='bytes'?0:'invalid';
        assert.throws(()=>validateApproval(value,approval.version,'NicolaiTandrup/honeycomb-menu-ng'));
    });
test('runtime, ancestry, uncommitted inputs and public bundle provenance fail closed',onlyStable,()=>{
    const artifact=localArtifact(true);
    for(const match of [args=>args[0]==='rev-parse'&&args[1]==='HEAD:src',args=>args[0]==='diff',args=>args[0]==='status']) {
        assert.throws(()=>verifyApprovedSource({...io,git:args=>match(args)?'changed':io.git(args)},artifact,approval));
    }
    assert.throws(()=>verifyApprovedSource({...io,git:args=>{if(args[0]==='merge-base')throw Error('not ancestor');return io.git(args);}},artifact,approval));
    assert.throws(()=>verifyApprovedSource({...io,readGit:(sha,file)=>file==='honeycomb-menu-ng.js'?Buffer.from('changed'):io.readGit(sha,file)},artifact,approval));
});
test('only known version banner and additive promotion tests may differ from beta build inputs',onlyStable,()=>{
    const artifact=localArtifact(true),read=file=>fs.readFileSync(file);
    for(const file of ['honeycomb-menu-ng.js','webpack.config.js','package-lock.json','package.json']) {
        const altered=name=>{
            const bytes=read(name);if(name!==file)return bytes;
            if(name.endsWith('.json')){const value=JSON.parse(bytes);value.injected='unexpected';return Buffer.from(JSON.stringify(value));}
            return Buffer.concat([bytes,Buffer.from('\n/* changed */')]);
        };
        assert.throws(()=>verifyApprovedSource(io,artifact,approval,altered),file);
    }
    const source=io.readGit(approval.approved_beta.commit,'webpack.config.js').toString();
    assert.equal(withBanner(withBanner(source)),withBanner(source));
    assert.equal(banner('1.8.0'),'/*! Honeycomb Menu NG v1.8.0 */');
});

test('version metadata promotion changes only the pinned build-info literals',()=>{
    const {promoteMetadata}=require('../scripts/stable-approval');
    const from='1.9.0-beta.9',to='1.9.0';
    const module='const o="1.9.0-beta.9".trim()?"1.9.0-beta.9":"Version unavailable";e.exports={version:o,commit:null}';
    assert.equal(promoteMetadata('before;'+module+';after',from,to),'before;'+module.replaceAll(from,to)+';after');
    for(const bad of ['',module+module,module.replace('commit:null','commit:"changed"'),module.replace('?"1.9.0-beta.9"','?"unexpected"')])assert.throws(()=>promoteMetadata(bad,from,to));
});
