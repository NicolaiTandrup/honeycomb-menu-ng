const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

function validateMetadata(version, metadata)
{
    if( !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/.test(version) )
        throw new Error('Invalid release version.');
    if( typeof metadata.prerelease !== 'boolean' || version.includes('-') !== metadata.prerelease )
        throw new Error('Version and prerelease metadata disagree; refusing publication.');
    if( typeof metadata.title !== 'string' || !metadata.title.includes(`v${version}`) )
        throw new Error('Release title must identify the exact version.');
}

function validateBundle(bundle)
{
    if( bundle.length < 1000 || !bundle.includes('honeycomb-menu') )
        throw new Error('Missing or incomplete Honeycomb release artifact.');
    new vm.Script(bundle, { filename: 'honeycomb-menu-ng.js' });
    return crypto.createHash('sha256').update(bundle).digest('hex');
}

if( require.main === module )
{
    const root = path.resolve(__dirname, '..');
    const { version } = require(path.join(root, 'package.json'));
    validateMetadata(version, require(path.join(root, 'release.json')));
    const artifact = process.argv[2] || path.join(root, 'honeycomb-menu-ng.js');
    const digest = validateBundle(fs.readFileSync(artifact, 'utf8'));
    const manifest = `${digest}  honeycomb-menu-ng.js\n`;
    if( process.argv[3] )
        fs.writeFileSync(process.argv[3], manifest);
    process.stdout.write(manifest);
}

module.exports = { validateMetadata, validateBundle };
