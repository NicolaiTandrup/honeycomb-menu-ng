'use strict';
// Local validation only. Publication requires the manual beta workflow's gates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {localArtifact} = require('./check-release');
const {isBetaVersion} = require('./beta-version');
function localBetaArtifact() {
    const artifact = localArtifact();
    assert.ok(isBetaVersion(artifact.version), 'Beta publication requires a SemVer beta.N version');
    const lock = JSON.parse(fs.readFileSync('package-lock.json'));
    assert.equal(lock.version, artifact.version, 'Package lock version mismatch');
    if (lock.packages && lock.packages['']) assert.equal(lock.packages[''].version, artifact.version, 'Package lock root version mismatch');
    return artifact;
}
module.exports = {localBetaArtifact};
if (require.main === module) {
    const result = localBetaArtifact();
    console.log(`${result.sha256}  ${result.filename}`);
}
