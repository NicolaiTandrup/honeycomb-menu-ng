const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../assets/honeycomb-bee.png');
const target = path.resolve(__dirname, '../src/brand/bee.generated.js');

const base64 = fs.readFileSync(source).toString('base64');
const output = [
    '// GENERATED FILE - do not edit by hand.',
    '// Source: assets/honeycomb-bee.png',
    "const HONEYCOMB_BEE_PNG = 'data:image/png;base64," + base64 + "';",
    '',
    'module.exports = { HONEYCOMB_BEE_PNG };',
    ''
].join('\n');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, output, 'utf8');
console.log('Generated embedded Honeycomb bee asset.');
