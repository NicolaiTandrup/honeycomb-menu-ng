'use strict';
// A reviewed manifest plus a public, immutable beta pins the approved runtime.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {isStableVersion}=require('./check-release');
const {isBetaVersion}=require('./beta-version');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const banner=version=>`/*! Honeycomb Menu NG v${version} */`;
function validateApproval(value,version,repository) {
    assert.ok(value && isStableVersion(version) && value.version===version,'Approved stable version mismatch');
    assert.equal(value.issue.startsWith(`https://github.com/${repository}/issues/`),true,'Approval issue repository mismatch');
    assert.match(value.issue,new RegExp('/issues/[1-9][0-9]*$'),'Approval issue required');
    const beta=value.approved_beta;
    assert.ok(beta && isBetaVersion(beta.tag.replace(/^v/,'')) && beta.tag.startsWith(`v${version}-beta.`),'Approved beta must test this stable version');
    for (const key of ['commit','src_tree']) assert.match(beta[key],/^[a-f0-9]{40}$/,`Invalid approved beta ${key}`);
    assert.match(beta.sha256,/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(beta.bytes) && beta.bytes>10000);
    assert.equal(value.allowed_bundle_change,'version-banner-v1','Unknown bundle change allowance');
    return value;
}
function withBanner(source) {
    const plugin="    plugins: [new webpack.BannerPlugin({banner: `Honeycomb Menu NG v${require('./package.json').version}`})],";
    if (source.includes(plugin)) return source;
    assert.ok(source.includes("const path = require('path');") && source.includes("    entry: './src/honeycomb-menu.js',"),'Unknown approved build configuration');
    return source.replace("const path = require('path');","const path = require('path');\nconst webpack = require('webpack');")
        .replace("    entry: './src/honeycomb-menu.js',","    entry: './src/honeycomb-menu.js',\n"+plugin);
}
function verifyApprovedSource(io,artifact,approval,read=file=>fs.readFileSync(file)) {
    const beta=approval.approved_beta;
    io.git(['merge-base','--is-ancestor',beta.commit,'HEAD']);
    assert.equal(io.git(['rev-parse',`${beta.commit}:src`]),beta.src_tree,'Approved source tree mismatch');
    assert.equal(io.git(['rev-parse','HEAD:src']),beta.src_tree,'Runtime differs from approved beta');
    for (const paths of [['src','assets','hacs.json','scripts/generate-bee-asset.js']]) {
        assert.equal(io.git(['diff',beta.commit,'HEAD','--',...paths]),'','Unapproved runtime/build input changes');
        assert.equal(io.git(['status','--porcelain','--untracked-files=all','--',...paths]),'','Uncommitted runtime/build inputs');
    }
    const old=file=>io.readGit(beta.commit,file);
    const pkg=JSON.parse(read('package.json')),basePkg=JSON.parse(old('package.json'));
    assert.equal(basePkg.version,beta.tag.slice(1),'Approved beta package version mismatch');
    assert.equal(pkg.version,artifact.version);
    delete pkg.version;delete basePkg.version;
    const extra=' test/stable-approval.test.js';
    assert.ok(pkg.scripts.test===basePkg.scripts.test || pkg.scripts.test===basePkg.scripts.test+extra,'Unexpected test command change');
    pkg.scripts.test=basePkg.scripts.test;
    assert.deepEqual(pkg,basePkg,'Only package version and additive promotion tests may change');
    const lock=JSON.parse(read('package-lock.json')),baseLock=JSON.parse(old('package-lock.json'));
    for (const value of [lock,baseLock]) {delete value.version;if(value.packages && value.packages[''])delete value.packages[''].version;}
    assert.deepEqual(lock,baseLock,'Dependency lock changed after beta testing');
    assert.equal(read('webpack.config.js').toString(),withBanner(old('webpack.config.js').toString()),'Only the version banner may change build configuration');
    const original=old('honeycomb-menu-ng.js');
    assert.equal(original.length,beta.bytes);assert.equal(digest(original),beta.sha256,'Approved beta bundle mismatch');
    const originalVersion=beta.tag.slice(1),originalText=original.toString();
    const body=originalText.startsWith(banner(originalVersion)) ? originalText.slice(banner(originalVersion).length) : originalText;
    const candidate=read(artifact.filename);
    assert.equal(candidate.toString(),banner(artifact.version)+body,'Stable JavaScript differs from approved beta beyond the version banner');
    assert.equal(digest(candidate),artifact.sha256);assert.equal(candidate.length,artifact.bytes);
    return approval;
}
module.exports={validateApproval,verifyApprovedSource,banner,withBanner};
