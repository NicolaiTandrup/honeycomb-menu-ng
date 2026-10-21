'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {isBetaVersion} = require('./beta-version');
const {parseVersion} = require('./release-retention');
const isStableVersion = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) && !!parseVersion(value);
function validateArtifact(pkg, release, hacs, bytes, {stable = false} = {}) {
    assert.ok(isStableVersion(pkg.version) || isBetaVersion(pkg.version), 'Unsupported release version');
    const prerelease = pkg.version.includes('-');
    if (stable) assert.equal(prerelease, false, 'Stable publication requires stable metadata');
    assert.equal(release.prerelease, prerelease, 'Release flag/version conflict');
    assert.ok(typeof release.title === 'string' && release.title.split(/\s+/).includes(`v${pkg.version}`), 'Release title/version mismatch');
    if (!prerelease) assert.equal(release.title, `Honeycomb NG v${pkg.version} — Stable`);
    assert.equal(hacs.filename, 'honeycomb-menu-ng.js', 'HACS bundle filename mismatch');
    assert.equal(hacs.content_in_root, true);
    assert.ok(bytes.length > 10000 && bytes.toString().includes('honeycomb-persistent-hub'), 'Incomplete bundle');
    new vm.Script(bytes.toString());
    return {version: pkg.version, tag: `v${pkg.version}`, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, filename: hacs.filename};
}
function localArtifact(stable = false) {
    const pkg=JSON.parse(fs.readFileSync('package.json')),lock=JSON.parse(fs.readFileSync('package-lock.json'));
    assert.equal(lock.version,pkg.version,'Package lock version mismatch');
    if (lock.packages && lock.packages['']) assert.equal(lock.packages[''].version,pkg.version,'Package lock root version mismatch');
    return validateArtifact(pkg, JSON.parse(fs.readFileSync('release.json')),
        JSON.parse(fs.readFileSync('hacs.json')), fs.readFileSync('honeycomb-menu-ng.js'), {stable});
}
module.exports = {validateArtifact, localArtifact, isStableVersion};
if (require.main === module) {
    const result = localArtifact(process.argv.includes('--stable'));
    console.log(`${result.sha256}  ${result.filename}`);
}
