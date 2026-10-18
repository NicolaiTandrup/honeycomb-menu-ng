const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateMetadata, validateBundle } = require('../scripts/validate-release');

test('beta metadata cannot accidentally publish a stable release', () => {
    validateMetadata('1.6.0-beta.1', { title: 'Honeycomb v1.6.0-beta.1', prerelease: true });
    assert.throws(() => validateMetadata('1.6.0-beta.1', { title: 'Honeycomb v1.6.0-beta.1', prerelease: false }));
    assert.throws(() => validateMetadata('1.6.0', { title: 'Honeycomb v1.6.0', prerelease: true }));
    assert.throws(() => validateMetadata('1.6.0-beta.1', { title: 'Wrong version', prerelease: true }));
});

test('invalid release artifacts fail validation before publication', () => {
    assert.throws(() => validateBundle(''));
    assert.throws(() => validateBundle('honeycomb-menu; function {' + ' '.repeat(1000)));
});
