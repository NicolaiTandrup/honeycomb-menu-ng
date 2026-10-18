const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hexFace } = require('../src/core/hex-face');
const { templateBody, cardTextTemplate } = require('../src/core/text-template');
const navigation = require('../src/core/navigation-context');

test('both ring widths are independent and use the native geometry', () => {
    const normal = hexFace(100, { outer_width: 3, inner_width: 4 });
    assert.equal(normal.innerScale, 0.94);
    assert.ok(Math.abs(normal.centerScale - 0.86) < 1e-10);
    assert.equal(hexFace(100, { outer_width: 0, inner_width: 4 }).innerScale, 1);
    assert.equal(hexFace(100, { outer_width: 3, inner_width: 0 }).centerScale, 0.94);
    assert.equal(hexFace(100).points, require('../src/core/layout').persistentHexPoints());
    assert.notEqual(hexFace(100, {}, 'cell').points, normal.points);
    for (const size of [0, NaN, 72]) {
        const face = hexFace(size, {outer_width: 'bad', inner_width: -3});
        assert.ok(Number.isFinite(face.innerScale));
        assert.equal(face.centerScale, face.innerScale);
        assert.ok(!face.outerPath.includes('NaN'));
    }
});

test('final text templates normalize escape depth and fail gracefully', () => {
    const evaluate = (template, states = {}) => new Function('states', templateBody(cardTextTemplate(template)))(states);
    assert.equal(evaluate('[[[ return "Vehicle A"; ]]]'), 'Vehicle A');
    assert.equal(evaluate('[[[[ return "Vehicle A"; ]]]]'), 'Vehicle A');
    assert.equal(evaluate('[[[ return states.missing.state; ]]]'), 'Unavailable');
    assert.equal(evaluate('[[[ return undefined; ]]]'), 'Unavailable');
    assert.equal(cardTextTemplate('Vehicle A'), 'Vehicle A');
    assert.equal(templateBody('[[[ return 1; ]]]]'), null);
});

test('invalid anchors never establish a false origin', () => {
    for (const value of [null, undefined, '', ' ', false, NaN])
        assert.equal(navigation.readAnchor({anchor_x: value, anchor_y: 50}), null);
    assert.deepEqual(navigation.readAnchor({anchor_x: 0, anchor_y: '50'}), {x:0,y:50});
});
