// Deliberately local: publication remains an explicitly authorized action.
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');
const crypto=require('crypto');
const pkg=require('../package.json');
const release=require('../release.json');
assert.match(pkg.version,/^1\.7\.0-beta\.\d+$/);
assert.equal(release.prerelease,true);
assert.ok(release.title.includes(pkg.version));
const code=fs.readFileSync('honeycomb-menu-ng.js');
assert.ok(code.length>10000 && code.includes('honeycomb-persistent-hub'));
new vm.Script(code.toString());
console.log(crypto.createHash('sha256').update(code).digest('hex')+'  honeycomb-menu-ng.js');
