const assert = require('assert');
const fs = require('fs');
const path = require('path');

const navigation = require('../src/core/navigation-context.js');
const layout = require('../src/core/layout.js');
const { ModuleRegistry } = require('../src/core/module-registry.js');
const { moduleRegistry } = require('../src/modules/index.js');
const { applyPresetControls } = require('../src/modules/light/controls.js');

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

function testPersistentHexGeometry()
{
    assert.strictEqual(
        layout.persistentHexPoints('inset'),
        '50,5 95.67,31.3675 95.67,84.1025 50,110.47 4.33,84.1025 4.33,31.3675'
    );

    assert.strictEqual(
        layout.persistentHexPoints('cell'),
        '50,0 100,28.8675 100,86.6025 50,115.47 0,86.6025 0,28.8675'
    );

    assert.strictEqual(
        layout.persistentHexPoints('anything-else'),
        layout.persistentHexPoints('inset')
    );
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

function testBuiltInModuleResolution()
{
    assert.strictEqual(
        moduleRegistry.resolve({ type: 'light' }).id,
        'light'
    );

    // Backwards compatibility: type: media remains Sonos-oriented.
    assert.strictEqual(
        moduleRegistry.resolve({ type: 'media' }).id,
        'sonos'
    );

    // Explicit generic media opt-in.
    assert.strictEqual(
        moduleRegistry.resolve({ type: 'media', module: 'media' }).id,
        'media'
    );
}

function testPersistentPresentations()
{
    const light = moduleRegistry.resolvePresentation('persistent');
    const media = moduleRegistry.resolvePresentation('media');

    const lightRuntime = { lastKnownColor: null };
    const lightOn = light.presentation.resolve({
        config: {
            show_brightness: 'when_on',
            colors: { outer_border: '#34383d' },
            off: { center_color: '#202224' }
        },
        state: {
            state: 'on',
            attributes: {
                brightness: 128,
                rgb_color: [255, 128, 0]
            }
        },
        runtime: lightRuntime
    });

    assert.strictEqual(lightOn.secondary, '50%');
    assert.strictEqual(lightOn.colors.center, 'rgb(255, 128, 0)');
    assert.strictEqual(lightRuntime.lastKnownColor, 'rgb(255, 128, 0)');

    const lightOff = light.presentation.resolve({
        config: {
            show_brightness: 'when_on',
            colors: { outer_border: '#34383d' },
            off: { center_color: '#202224' }
        },
        state: {
            state: 'off',
            attributes: {}
        },
        runtime: lightRuntime
    });

    assert.strictEqual(lightOff.secondary, null);
    assert.strictEqual(lightOff.colors.center, '#202224');
    assert.strictEqual(lightOff.colors.inner, 'rgb(255, 128, 0)');

    const mediaPlaying = media.presentation.resolve({
        config: {
            show_volume: 'when_playing',
            active_color: '#ff9800',
            colors: { outer_border: '#34383d' },
            off: { center_color: '#202224' }
        },
        state: {
            state: 'playing',
            attributes: { volume_level: 0.34 }
        }
    });

    assert.strictEqual(mediaPlaying.secondary, '34%');
    assert.strictEqual(mediaPlaying.colors.center, '#ff9800');
    assert.strictEqual(mediaPlaying.colors.inner, '#ff9800');

    const mediaIdle = media.presentation.resolve({
        config: {
            show_volume: 'when_playing',
            active_color: '#ff9800',
            colors: { outer_border: '#34383d' },
            off: { center_color: '#202224' }
        },
        state: {
            state: 'paused',
            attributes: { volume_level: 0.34 }
        }
    });

    assert.strictEqual(mediaIdle.secondary, null);
    assert.strictEqual(mediaIdle.colors.center, '#202224');
    assert.strictEqual(mediaIdle.colors.inner, '#ff9800');
}

function withFakeHomeAssistant(states, callback)
{
    const previousDocument = global.document;

    global.document = {
        querySelector(selector)
        {
            if( selector === 'home-assistant' )
                return { hass: { states } };

            return null;
        }
    };

    try
    {
        callback();
    }
    finally
    {
        if( previousDocument === undefined )
            delete global.document;
        else
            global.document = previousDocument;
    }
}

function testLightNestedMenusStayInOwningContext()
{
    withFakeHomeAssistant(
        {
            'light.color_test': {
                state: 'on',
                attributes: {
                    supported_color_modes: ['hs'],
                    brightness: 128
                }
            },
            'light.white_test': {
                state: 'on',
                attributes: {
                    supported_color_modes: ['color_temp'],
                    min_color_temp_kelvin: 2200,
                    max_color_temp_kelvin: 6500
                }
            }
        },
        () => {
            const colorConfig = {
                entity: 'light.color_test',
                buttons: [
                    {
                        control: 'light-palette'
                    }
                ]
            };

            applyPresetControls(colorConfig, {}, colorConfig.entity);

            const colorAction = colorConfig.buttons[0].tap_action;

            assert.strictEqual(colorAction.action, 'honeycomb-open-nested');
            assert.strictEqual(colorAction.honeycomb_menu, undefined);
            assert.strictEqual(
                colorAction.honeycomb_nested_menu.nested_expand,
                true
            );
            assert.strictEqual(
                colorAction.honeycomb_nested_menu.inherit_inner,
                true
            );
            assert.strictEqual(
                colorAction.honeycomb_nested_menu.buttons.length,
                12
            );

            const whiteConfig = {
                entity: 'light.white_test',
                buttons: [
                    {
                        control: 'light-palette'
                    }
                ]
            };

            applyPresetControls(whiteConfig, {}, whiteConfig.entity);

            const whiteAction = whiteConfig.buttons[0].tap_action;

            assert.strictEqual(whiteAction.action, 'honeycomb-open-nested');
            assert.strictEqual(whiteAction.honeycomb_menu, undefined);
            assert.strictEqual(
                whiteAction.honeycomb_nested_menu.buttons.length,
                12
            );
        }
    );
}

function testModuleMenusAreDeclarative()
{
    const light = moduleRegistry.resolve({ type: 'light' });
    const lightMenu = light.buildMenu({
        item: {
            type: 'light',
            entity: 'light.test',
            presets: {}
        }
    });

    assert.strictEqual(lightMenu.buttons.length, 6);
    assert.strictEqual(lightMenu.promote_to_center, true);

    const sonos = moduleRegistry.resolve({ type: 'media' });
    const sonosMenu = sonos.buildMenu({
        item: {
            type: 'media',
            entity: 'media_player.test',
            favorites_sensor: 'sensor.favorites',
            favorites_cache_sensor: 'sensor.favorites_cache'
        }
    });

    assert.strictEqual(sonosMenu.buttons.length, 6);
    assert.strictEqual(
        sonosMenu.buttons[4].tap_action.action,
        'honeycomb-open-nested'
    );
    assert.strictEqual(
        sonosMenu.buttons[4].tap_action.honeycomb_nested_menu.buttons[0].slot,
        7
    );

    // Sonos controls own their visual grid instead of inheriting the generic
    // persistent defaults. Buttons with a secondary label get three rows.
    assert.strictEqual(
        sonosMenu.buttons[0].styles.grid[0]['grid-template-areas'],
        '"i" "n"'
    );
    assert.strictEqual(
        sonosMenu.buttons[1].styles.grid[0]['grid-template-areas'],
        '"i" "n" "l"'
    );
    assert.strictEqual(
        sonosMenu.buttons[2].styles.grid[0]['grid-template-areas'],
        '"i" "n" "l"'
    );

    const firstFavorite =
        sonosMenu.buttons[4]
            .tap_action
            .honeycomb_nested_menu
            .buttons[0];

    assert.strictEqual(firstFavorite.show_icon, true);
    assert.strictEqual(firstFavorite.show_name, true);

    const favoriteIconDisplayRule =
        firstFavorite.styles.icon.find(rule =>
            Object.prototype.hasOwnProperty.call(rule, 'display')
        );
    const favoriteNameDisplayRule =
        firstFavorite.styles.name.find(rule =>
            Object.prototype.hasOwnProperty.call(rule, 'display')
        );

    assert.ok(favoriteIconDisplayRule);
    assert.ok(favoriteNameDisplayRule);
    assert.ok(String(favoriteIconDisplayRule.display).includes("match?.thumbnail"));
    assert.ok(String(favoriteNameDisplayRule.display).includes("match?.thumbnail"));
}

function collectJsFiles(root)
{
    const result = [];

    for( const entry of fs.readdirSync(root, { withFileTypes: true }) )
    {
        const full = path.join(root, entry.name);

        if( entry.isDirectory() )
            result.push(...collectJsFiles(full));
        else if( entry.isFile() && entry.name.endsWith('.js') )
            result.push(full);
    }

    return result;
}

function testArchitectureBoundaries()
{
    const moduleRoot = path.resolve(__dirname, '../src/modules');
    const forbiddenModuleTokens = [
        'reanchor(',
        'replaceConfig(',
        'moduleAnchor',
        'currentConfig'
    ];

    for( const file of collectJsFiles(moduleRoot) )
    {
        const source = fs.readFileSync(file, 'utf8');

        for( const token of forbiddenModuleTokens )
        {
            assert.strictEqual(
                source.includes(token),
                false,
                `Domain module ${path.relative(moduleRoot, file)} must not use core navigation token ${token}`
            );
        }
    }

    const hubSource = fs.readFileSync(
        path.resolve(__dirname, '../src/honeycomb-persistent-hub.js'),
        'utf8'
    );

    assert.strictEqual(hubSource.includes('_lightMenu('), false);
    assert.strictEqual(hubSource.includes('_mediaMenu('), false);
    assert.strictEqual(hubSource.includes('_sonosRadioMenu('), false);
    assert.strictEqual(hubSource.includes('_sonosJoinMenu('), false);

    const lightControlsSource = fs.readFileSync(
        path.resolve(__dirname, '../src/modules/light/controls.js'),
        'utf8'
    );

    // v1.4.2 Light navigation is a locked contract: Color/White must never
    // regress to the global fire-dom-event path.
    assert.strictEqual(lightControlsSource.includes('fire-dom-event'), false);
    assert.ok(lightControlsSource.includes('honeycomb-open-nested'));

    const persistentControlSource = fs.readFileSync(
        path.resolve(__dirname, '../src/honeycomb-persistent-control.js'),
        'utf8'
    );
    const rendererSource = fs.readFileSync(
        path.resolve(__dirname, '../src/honeycomb-menu.js'),
        'utf8'
    );

    // Persistent-Hub lifecycle contracts.
    assert.ok(hubSource.includes('honeycomb_menu_context_dispose'));
    assert.ok(hubSource.includes('center._persistent_launcher === true'));
    assert.ok(hubSource.includes("next.restore_on_close = next.auto_open === false"));
    assert.ok(persistentControlSource.includes('restore_on_close !== false'));
    assert.ok(rendererSource.includes('window.honeycomb_menu_context_dispose'));
    assert.ok(rendererSource.includes('while( context.stack.length > 0 )');

    assert.strictEqual(rendererSource.includes('_handleMediaVolumeAction('), false);
    assert.strictEqual(rendererSource.includes('_handlePresetAction('), false);
}

function run()
{
    testNavigationAnchorLock();
    testGlobalNavigationDoesNotLock();
    testPersistentHexGeometry();
    testLayoutGrowthKeepsCenterDefinition();
    testModuleRegistry();
    testBuiltInModuleResolution();
    testPersistentPresentations();
    testLightNestedMenusStayInOwningContext();
    testModuleMenusAreDeclarative();
    testArchitectureBoundaries();

    console.log('Honeycomb NG core tests: OK');
}

run();
