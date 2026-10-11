const assert = require('assert');

const navigation = require('../src/core/navigation-context.js');
const layout = require('../src/core/layout.js');
const { ModuleRegistry } = require('../src/core/module-registry.js');

function testNavigationAnchorLock()
{
    const context = navigation.createMenuContext({ local: true });
    const base = {
        _persistent_hub_root: true,
        anchor_x: 10,
        anchor_y: 20
    };
    const module = {
        nested_expand: true,
        anchor_x: 100,
        anchor_y: 200
    };

    navigation.enterNested(context, base, module);

    assert.deepStrictEqual(context.moduleAnchor, { x: 100, y: 200 });
    assert.strictEqual(context.navigation.phase, 'module');
    assert.strictEqual(context.navigation.depth, 1);

    const nested = {
        nested_expand: true,
        anchor_x: 900,
        anchor_y: 800
    };

    navigation.enterNested(context, module, nested);

    assert.strictEqual(nested.anchor_x, 100);
    assert.strictEqual(nested.anchor_y, 200);
    assert.strictEqual(context.navigation.phase, 'nested');

    const deeper = { nested_expand: true };
    navigation.enterNested(context, nested, deeper);

    assert.strictEqual(deeper.anchor_x, 100);
    assert.strictEqual(deeper.anchor_y, 200);

    navigation.prepareBack(context, module);
    assert.deepStrictEqual(context.moduleAnchor, { x: 100, y: 200 });

    navigation.prepareBack(context, base);
    assert.strictEqual(context.moduleAnchor, null);
    assert.strictEqual(context.navigation.phase, 'base');
}

function testGlobalNavigationDoesNotLock()
{
    const context = navigation.createMenuContext({ local: false });
    const current = { _persistent_hub_root: true };
    const incoming = { anchor_x: 300, anchor_y: 400 };

    navigation.enterNested(context, current, incoming);

    assert.strictEqual(context.moduleAnchor, null);
    assert.strictEqual(navigation.canEstablishAnchor(context), true);
}

function testLayoutGrowthKeepsCenterDefinition()
{
    assert.deepStrictEqual(layout.centerPosition(false), { x: 1, y: 0.865 });
    assert.deepStrictEqual(layout.centerPosition(true), { x: 2, y: 1.73 });

    const inner = layout.buttonPosition(0, { inner: true, outer: false });
    const expandedInner = layout.buttonPosition(0, { inner: true, outer: true });
    const outer = layout.buttonPosition(6, { inner: true, outer: true });

    assert.deepStrictEqual(inner, { x: 0, y: 0.865 });
    assert.deepStrictEqual(expandedInner, { x: 1, y: 1.73 });
    assert.deepStrictEqual(outer, { x: 0, y: 1.73 });

    assert.deepStrictEqual(
        layout.resolveRings(6, []),
        { inner: true, outer: false }
    );
    assert.deepStrictEqual(
        layout.resolveRings(12, []),
        { inner: false, outer: true }
    );
    assert.deepStrictEqual(
        layout.resolveRings(13, []),
        { inner: true, outer: true }
    );
}

function testModuleRegistry()
{
    const registry = new ModuleRegistry();

    registry.register({
        id: 'generic',
        priority: -100,
        matches: () => true
    });

    registry.register({
        id: 'light',
        aliases: ['hue'],
        priority: 100,
        matches: item => item.type === 'light'
    });

    assert.strictEqual(registry.resolve({ type: 'light' }).id, 'light');
    assert.strictEqual(registry.resolve({ type: 'unknown' }).id, 'generic');
    assert.strictEqual(
        registry.resolve({ type: 'unknown', module: 'hue' }).id,
        'light'
    );
}

function run()
{
    testNavigationAnchorLock();
    testGlobalNavigationDoesNotLock();
    testLayoutGrowthKeepsCenterDefinition();
    testModuleRegistry();

    console.log('Honeycomb NG core tests: OK');
}

run();
