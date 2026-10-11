import { LitElement, html, css } from 'lit';
import "./honeycomb-menu-item.js";
import "./honeycomb-persistent-control.js";
import "./honeycomb-persistent-hub.js";
import "./xy-pad.js";
import { objectEvalTemplate, getTemplateOrValue, stringToBool, fireEvent, lovelace_view, provideHass, honeycomb_menu_templates } from "./helpers.js";

const hass = document.querySelector('home-assistant').hass;

const merge = require('lodash/merge');
const omit = require('lodash/omit');
const split = require('lodash/split');
const clamp = require('lodash/clamp');
const _template = require('lodash/template');
const isEmpty = require('lodash/isEmpty');
const isString = require('lodash/isString');
const _defaults = require('lodash/defaults');

const manager = new function() {
    this.honeycomb = null;
    this.stack = [];
    this.currentConfig = null;
    this.pointerDown = false;
    this.pointerId = null;
    this.position = {
        x: 0,
        y: 0
    };
    this.handleXYPosition = function(e) {
        this.position.x = (e.type === "touchstart") ? e.touches[0].clientX : e.clientX;
        this.position.y = (e.type === "touchstart") ? e.touches[0].clientY : e.clientY;
    }.bind(this);

    this.handlePointerDown = function(e) {
        this.pointerDown = true;
        this.pointerId = e.pointerId;
        this.position.x = e.clientX;
        this.position.y = e.clientY;
    }.bind(this);

    this.handlePointerUp = function(e) {
        if( this.pointerId === null || e.pointerId === this.pointerId )
        {
            this.pointerDown = false;
            this.pointerId = null;
        }
    }.bind(this);
};

function applyEntityToAction(action, entity)
{
    if( ! action || typeof action !== 'object' || ! entity )
        return;

    const actionName = action.action;

    if( actionName === 'perform-action' )
    {
        // Any explicit target wins, including area/device based targets.
        if( ! action.target )
            action.target = { entity_id: entity };
    }
    else if( actionName === 'call-service' )
    {
        if( ! action.target )
        {
            if( ! action.service_data )
                action.service_data = {};

            if( action.service_data.entity_id === undefined )
                action.service_data.entity_id = entity;
        }
    }

    if( action.honeycomb_menu )
        applyEntityInheritance(action.honeycomb_menu, entity);
}

function applyEntityInheritance(config, inheritedEntity)
{
    if( ! config || typeof config !== 'object' )
        return config;

    const localEntity =
        config.entity ||
        config.entity_id ||
        inheritedEntity ||
        null;

    if( localEntity && ! config.entity )
        config.entity = localEntity;

    if( config.center_button && typeof config.center_button === 'object' )
    {
        const centerEntity = config.center_button.entity || localEntity;

        if( centerEntity && ! config.center_button.entity )
            config.center_button.entity = centerEntity;

        ['tap_action', 'hold_action', 'double_tap_action', 'press_action'].forEach(key => {
            applyEntityToAction(config.center_button[key], centerEntity);
        });
    }

    if( config.persistent_center && typeof config.persistent_center === 'object' )
        applyEntityInheritance(config.persistent_center, localEntity);

    const visitButton = button => {
        if( ! button || typeof button !== 'object' )
            return;

        const buttonEntity =
            button.entity ||
            button.entity_id ||
            localEntity;

        if( buttonEntity && ! button.entity )
            button.entity = buttonEntity;

        ['tap_action', 'hold_action', 'double_tap_action', 'press_action'].forEach(key => {
            applyEntityToAction(button[key], buttonEntity);
        });
    };

    if( Array.isArray(config.buttons) )
    {
        config.buttons.forEach(entry => {
            if( Array.isArray(entry) )
                entry.forEach(visitButton);
            else
                visitButton(entry);
        });
    }

    return config;
}

function presetTemplateNumber(entityId, suffix = '')
{
    return `[[[
        const state = states['${entityId}'];
        const value = state ? Number(state.state) : NaN;
        return Number.isFinite(value) ? \`\${Math.round(value)}${suffix}\` : '—';
    ]]]`;
}

function presetCurrentBrightnessTemplate()
{
    return `[[[
        const raw = entity && entity.attributes ? entity.attributes.brightness : null;
        const value = raw === null || raw === undefined ? NaN : Number(raw);
        return Number.isFinite(value)
            ? \`Now \${Math.max(0, Math.min(100, Math.round((value / 255) * 100)))}%\`
            : 'Now —';
    ]]]`;
}

function presetCurrentKelvinTemplate()
{
    return `[[[
        const raw = entity && entity.attributes ? entity.attributes.color_temp_kelvin : null;
        const value = raw === null || raw === undefined ? NaN : Number(raw);
        return Number.isFinite(value) && value > 0
            ? \`Now \${Math.round(value)}K\`
            : 'Now —';
    ]]]`;
}

function presetHsTemplate(hueEntity, saturationEntity, current = false)
{
    if( current )
    {
        return `[[[
            const hs = entity && entity.attributes ? entity.attributes.hs_color : null;
            if( ! Array.isArray(hs) || hs.length < 2 )
                return 'Now —';
            return \`Now \${Math.round(Number(hs[0]))}° · \${Math.round(Number(hs[1]))}%\`;
        ]]]`;
    }

    return `[[[
        const hueState = states['${hueEntity}'];
        const satState = states['${saturationEntity}'];
        const hue = hueState ? Number(hueState.state) : NaN;
        const sat = satState ? Number(satState.state) : NaN;
        return Number.isFinite(hue) && Number.isFinite(sat)
            ? \`\${Math.round(hue)}° · \${Math.round(sat)}%\`
            : '—';
    ]]]`;
}

function presetControlStyles()
{
    return {
        grid: [
            { 'grid-template-areas': '"i" "n" "l"' },
            { 'grid-template-columns': '1fr' },
            { 'grid-template-rows': '43% 29% 28%' },
            { height: '100%' },
            { 'align-items': 'center' }
        ],
        icon: [
            { width: '22px' },
            { 'align-self': 'end' },
            { color: '#f6f7f9' }
        ],
        name: [
            { 'font-size': '11px' },
            { 'font-weight': '650' },
            { 'line-height': '1' },
            { 'align-self': 'center' },
            { color: '#f6f7f9' },
            { 'white-space': 'nowrap' },
            { overflow: 'hidden' },
            { 'text-overflow': 'ellipsis' }
        ],
        label: [
            { 'font-size': '8px' },
            { 'line-height': '1' },
            { 'align-self': 'start' },
            { 'padding-top': '1px' },
            { color: 'rgba(246,247,249,0.82)' },
            { 'white-space': 'nowrap' },
            { overflow: 'hidden' },
            { 'text-overflow': 'ellipsis' }
        ]
    };
}

function currentHass()
{
    const root = document.querySelector('home-assistant');
    return root ? root.hass : null;
}

function lightCapabilities(entityId)
{
    const liveHass = currentHass();
    const state = liveHass && entityId ? liveHass.states[entityId] : null;
    const attrs = state && state.attributes ? state.attributes : {};
    const modes = Array.isArray(attrs.supported_color_modes)
        ? attrs.supported_color_modes
        : [];

    const colorModes = ['xy', 'hs', 'rgb', 'rgbw', 'rgbww'];
    const colorCapable = modes.some(mode => colorModes.includes(mode));
    const temperatureCapable = modes.includes('color_temp');

    return {
        modes,
        colorCapable,
        temperatureCapable,
        minKelvin: Number(attrs.min_color_temp_kelvin) || 2200,
        maxKelvin: Number(attrs.max_color_temp_kelvin) || 6500
    };
}

function kelvinToCssRgb(kelvin)
{
    let temp = Math.max(1000, Math.min(40000, Number(kelvin) || 2700)) / 100;
    let red;
    let green;
    let blue;

    if( temp <= 66 )
    {
        red = 255;
        green = 99.4708025861 * Math.log(temp) - 161.1195681661;
        blue = temp <= 19
            ? 0
            : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
    else
    {
        red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
        green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
        blue = 255;
    }

    const clampChannel = value => Math.max(0, Math.min(255, Math.round(value)));
    return `rgb(${clampChannel(red)}, ${clampChannel(green)}, ${clampChannel(blue)})`;
}

function buildColorPaletteButtons()
{
    const hues = [0, 25, 50, 80, 115, 150, 180, 205, 230, 265, 300, 335];

    return hues.map((hue, index) => ({
        slot: index + 7,
        slot_mode: 'hard',
        show_icon: false,
        show_name: false,
        autoclose: false,
        styles: {
            card: [
                { background: `hsl(${hue}, 85%, 55%)` },
                { border: '1px solid rgba(255,255,255,0.20)' }
            ]
        },
        tap_action: {
            action: 'perform-action',
            perform_action: 'light.turn_on',
            data: {
                hs_color: [hue, 85]
            }
        }
    }));
}

function buildWhitePaletteButtons(capabilities)
{
    let minKelvin = Math.max(1000, Number(capabilities.minKelvin) || 2200);
    let maxKelvin = Math.max(minKelvin, Number(capabilities.maxKelvin) || 6500);

    if( maxKelvin === minKelvin )
        maxKelvin = minKelvin + 1;

    const count = 12;
    const values = [];

    for( let index = 0; index < count; index++ )
    {
        const ratio = index / (count - 1);
        values.push(Math.round(minKelvin + ((maxKelvin - minKelvin) * ratio)));
    }

    return values.map((kelvin, index) => ({
        slot: index + 7,
        slot_mode: 'hard',
        icon: 'mdi:circle',
        name: `${kelvin}K`,
        show_name: true,
        autoclose: false,
        styles: {
            card: [
                { background: kelvinToCssRgb(kelvin) },
                { color: '#17212b' },
                { border: '1px solid rgba(35,45,55,0.28)' }
            ],
            icon: [
                { width: '12px' },
                { color: '#17212b' }
            ],
            name: [
                { 'font-size': '8px' },
                { color: '#17212b' },
                { 'font-weight': '650' }
            ]
        },
        tap_action: {
            action: 'perform-action',
            perform_action: 'light.turn_on',
            data: {
                color_temp_kelvin: kelvin
            }
        }
    }));
}

function expandLightPaletteControl(button, inheritedEntity)
{
    const lightEntity = button.entity || inheritedEntity;
    const capabilities = lightCapabilities(lightEntity);

    if( capabilities.colorCapable )
    {
        _defaults(button, {
            entity: lightEntity,
            icon: 'mdi:palette',
            name: 'Color',
            show_name: true,
            autoclose: false,
            tap_action: {
                action: 'fire-dom-event',
                honeycomb_menu: {
                    nested_expand: true,
                    inherit_inner: true,
                    empty_slots: 'hidden',
                    idle_timeout: 8000,
                    buttons: buildColorPaletteButtons()
                }
            }
        });
        return;
    }

    if( capabilities.temperatureCapable )
    {
        _defaults(button, {
            entity: lightEntity,
            icon: 'mdi:temperature-kelvin',
            name: 'White',
            show_name: true,
            autoclose: false,
            tap_action: {
                action: 'fire-dom-event',
                honeycomb_menu: {
                    nested_expand: true,
                    inherit_inner: true,
                    empty_slots: 'hidden',
                    idle_timeout: 8000,
                    buttons: buildWhitePaletteButtons(capabilities)
                }
            }
        });
        return;
    }

    _defaults(button, {
        entity: lightEntity,
        icon: 'mdi:lightbulb-outline',
        name: 'Light',
        show_name: true,
        autoclose: false,
        tap_action: { action: 'none' }
    });
}

function expandPresetStandardControl(button, presets, inheritedEntity)
{
    const lightEntity = button.entity || inheritedEntity;
    const capabilities = lightCapabilities(lightEntity);
    const colorPreset = presets && presets.color;
    const kelvinPreset = presets && presets.kelvin;

    const hasColorHelpers =
        !!(colorPreset && colorPreset.hue_entity && colorPreset.saturation_entity);
    const hasKelvinHelper = !!(kelvinPreset && kelvinPreset.entity);

    if( capabilities.colorCapable && hasColorHelpers )
    {
        button.control = 'preset-color';
        expandPresetControl(button, presets, lightEntity);
        return;
    }

    if( capabilities.temperatureCapable && hasKelvinHelper )
    {
        button.control = 'preset-kelvin';
        expandPresetControl(button, presets, lightEntity);
        return;
    }

    // No helper configured: use a safe warm-white fallback.
    const fallbackKelvin =
        Number((kelvinPreset && kelvinPreset.default) || 2700);

    _defaults(button, {
        entity: lightEntity,
        icon: 'mdi:temperature-kelvin',
        show_name: true,
        show_label: true,
        autoclose: false,
        name: `${Math.round(fallbackKelvin)}K`,
        label: presetCurrentKelvinTemplate(),
        styles: presetControlStyles(),
        tap_action: {
            action: 'perform-action',
            perform_action: 'light.turn_on',
            data: {
                color_temp_kelvin: Math.round(fallbackKelvin)
            }
        },
        hold_action: { action: 'none' }
    });
}

function expandPresetControl(button, presets, inheritedEntity)
{
    if( ! button || typeof button !== 'object' || ! button.control )
        return;

    const control = button.control;
    const lightEntity = button.entity || inheritedEntity;

    if( control === 'light-palette' )
    {
        expandLightPaletteControl(button, lightEntity);
        return;
    }

    if( control === 'preset-standard' )
    {
        expandPresetStandardControl(button, presets, lightEntity);
        return;
    }

    if( control === 'preset-brightness' )
    {
        const preset = presets && presets.brightness;
        const helper = preset && preset.entity;

        if( ! helper )
        {
            const fallback = Number((preset && preset.default) || 60);

            _defaults(button, {
                entity: lightEntity,
                icon: 'mdi:brightness-percent',
                show_name: true,
                show_label: true,
                autoclose: false,
                name: `${Math.round(fallback)}%`,
                label: presetCurrentBrightnessTemplate(),
                styles: presetControlStyles(),
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    data: {
                        brightness_pct: Math.max(0, Math.min(100, fallback))
                    }
                },
                hold_action: { action: 'none' }
            });
            return;
        }

        _defaults(button, {
            entity: lightEntity,
            icon: 'mdi:brightness-percent',
            show_name: true,
            show_label: true,
            autoclose: false,
            name: presetTemplateNumber(helper, '%'),
            label: presetCurrentBrightnessTemplate(),
            styles: presetControlStyles(),
            tap_action: {
                action: 'honeycomb-preset-apply',
                preset_type: 'brightness',
                helper_entity: helper
            },
            hold_action: {
                action: 'honeycomb-preset-store',
                preset_type: 'brightness',
                helper_entity: helper
            }
        });
        return;
    }

    if( control === 'preset-kelvin' )
    {
        const preset = presets && presets.kelvin;
        const helper = preset && preset.entity;

        if( ! helper )
        {
            const fallback = Number((preset && preset.default) || 2700);

            _defaults(button, {
                entity: lightEntity,
                icon: 'mdi:temperature-kelvin',
                show_name: true,
                show_label: true,
                autoclose: false,
                name: `${Math.round(fallback)}K`,
                label: presetCurrentKelvinTemplate(),
                styles: presetControlStyles(),
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'light.turn_on',
                    data: {
                        color_temp_kelvin: Math.round(fallback)
                    }
                },
                hold_action: { action: 'none' }
            });
            return;
        }

        _defaults(button, {
            entity: lightEntity,
            icon: 'mdi:temperature-kelvin',
            show_name: true,
            show_label: true,
            autoclose: false,
            name: presetTemplateNumber(helper, 'K'),
            label: presetCurrentKelvinTemplate(),
            styles: presetControlStyles(),
            tap_action: {
                action: 'honeycomb-preset-apply',
                preset_type: 'kelvin',
                helper_entity: helper
            },
            hold_action: {
                action: 'honeycomb-preset-store',
                preset_type: 'kelvin',
                helper_entity: helper
            }
        });
        return;
    }

    if( control === 'preset-color' )
    {
        const preset = presets && presets.color;
        const hueEntity = preset && preset.hue_entity;
        const saturationEntity = preset && preset.saturation_entity;

        if( ! hueEntity || ! saturationEntity )
            return;

        _defaults(button, {
            entity: lightEntity,
            icon: 'mdi:palette',
            show_name: true,
            show_label: true,
            autoclose: false,
            name: presetHsTemplate(hueEntity, saturationEntity, false),
            label: presetHsTemplate(hueEntity, saturationEntity, true),
            styles: presetControlStyles(),
            tap_action: {
                action: 'honeycomb-preset-apply',
                preset_type: 'color',
                hue_entity: hueEntity,
                saturation_entity: saturationEntity
            },
            hold_action: {
                action: 'honeycomb-preset-store',
                preset_type: 'color',
                hue_entity: hueEntity,
                saturation_entity: saturationEntity
            }
        });
    }
}

function applyPresetControls(config, inheritedPresets, inheritedEntity)
{
    if( ! config || typeof config !== 'object' )
        return config;

    const localEntity = config.entity || inheritedEntity || null;
    const localPresets = merge({}, inheritedPresets || {}, config.presets || {});

    if( Object.keys(localPresets).length > 0 )
        config.presets = localPresets;

    const visitButton = button => {
        if( ! button || typeof button !== 'object' )
            return;

        const buttonEntity = button.entity || localEntity;
        expandPresetControl(button, localPresets, buttonEntity);

        ['tap_action', 'hold_action', 'double_tap_action', 'press_action'].forEach(key => {
            const action = button[key];
            const nested = action && action.honeycomb_menu;

            if( nested )
            {
                if( ! nested.entity && buttonEntity )
                    nested.entity = buttonEntity;

                applyPresetControls(nested, localPresets, buttonEntity);
            }
        });
    };

    if( Array.isArray(config.buttons) )
    {
        config.buttons.forEach(entry => {
            if( Array.isArray(entry) )
                entry.forEach(visitButton);
            else
                visitButton(entry);
        });
    }

    return config;
}

function openHoneycombMenu(context, config)
{
    var honeycombConfig = traverseConfigs( config );

    if( honeycombConfig.entity_id && ! honeycombConfig.entity )
        honeycombConfig.entity = honeycombConfig.entity_id;

    applyPresetControls(honeycombConfig, honeycombConfig.presets || {}, honeycombConfig.entity);
    applyEntityInheritance(honeycombConfig, honeycombConfig.entity);

    // If a menu is already open, treat a newly opened menu as a nested menu.
    // nested_expand keeps the current Honeycomb element alive and only updates
    // its config, so existing inner-ring buttons do not animate out/in again.
    const nested = !! context.honeycomb && !! context.currentConfig;

    if( nested && honeycombConfig.nested_expand === true )
    {
        const current = context.currentConfig || {};
        const fromPersistentHubBase =
            context.local === true &&
            current._persistent_hub_root === true;

        const incomingAnchorX = Number(honeycombConfig.anchor_x);
        const incomingAnchorY = Number(honeycombConfig.anchor_y);
        const hasIncomingAnchor =
            Number.isFinite(incomingAnchorX) &&
            Number.isFinite(incomingAnchorY);

        if( fromPersistentHubBase && hasIncomingAnchor )
        {
            // This is the one allowed center move: from the dashboard/base Hub
            // to the selected module (light, media, etc.).
            context.moduleAnchor = {
                x: incomingAnchorX,
                y: incomingAnchorY
            };
        }
        else if( context.local === true && context.moduleAnchor )
        {
            // Once inside a module, every deeper submenu stays on the same
            // physical center regardless of which ring button was pressed.
            honeycombConfig.anchor_x = context.moduleAnchor.x;
            honeycombConfig.anchor_y = context.moduleAnchor.y;
        }

        context.stack.push({
            __honeycomb_stack_entry: true,
            config: merge({}, current),
            inPlace: true
        });

        // Optional expansion mode used by palettes and similar controls:
        // keep the currently visible inner ring and add the nested menu to the
        // outer physical slots. The nested menu remains generic and can still
        // override any of the inherited buttons explicitly.
        if( honeycombConfig.inherit_inner === true && context.honeycomb )
        {
            const combined = new Array(18);
            const currentButtons = context.honeycomb.buttons || [];

            for( let i = 0; i < 6; i++ )
            {
                const button = currentButtons[i];

                if( button && ! isEmpty(button) )
                {
                    combined[i] = [
                        merge({}, button, {
                            slot: i + 1,
                            slot_mode: 'hard'
                        })
                    ];
                }
            }

            const nestedButtons = honeycombConfig.buttons || [];

            nestedButtons.forEach((stack, index) => {
                if( ! stack )
                    return;

                let target = 6 + index;

                if( target > 17 )
                    return;

                combined[target] = Array.isArray(stack)
                    ? stack.map(button => merge({}, button))
                    : [merge({}, stack)];
            });

            honeycombConfig.buttons = combined;
            honeycombConfig.empty_slots = 'hidden';
        }

        // Persistent menus expand in-place around a real dashboard/floorplan
        // anchor. Preserve that context through nested menus so the screen does
        // not jump and the center keeps the same physical size and styling.
        if( current.persistent_center )
        {
            honeycombConfig.position_mode = current.position_mode || 'anchored';
            honeycombConfig.size = current.size;

            if( honeycombConfig.spacing === undefined && current.spacing !== undefined )
                honeycombConfig.spacing = current.spacing;

            if( honeycombConfig.idle_timeout === undefined && current.idle_timeout !== undefined )
                honeycombConfig.idle_timeout = current.idle_timeout;

            if( honeycombConfig.button_defaults === undefined && current.button_defaults !== undefined )
                honeycombConfig.button_defaults = merge({}, current.button_defaults);

            if( honeycombConfig.promote_to_center === true && honeycombConfig.promoted_center )
            {
                honeycombConfig.persistent_center = merge(
                    {},
                    honeycombConfig.promoted_center,
                    {
                        interactive: true,
                        tap_action: { action: 'honeycomb-back' },
                        size: current.persistent_center.size || honeycombConfig.promoted_center.size
                    }
                );
            }
            else
            {
                honeycombConfig.persistent_center = merge(
                    {},
                    current.persistent_center,
                    {
                        interactive: true,
                        icon: 'mdi:arrow-left',
                        tap_action: { action: 'honeycomb-back' }
                    }
                );
            }

            honeycombConfig.center_button = null;
        }

        context.currentConfig = merge({}, honeycombConfig);
        context.honeycomb.replaceConfig(honeycombConfig);

        if(
            Number.isFinite(Number(honeycombConfig.anchor_x)) &&
            Number.isFinite(Number(honeycombConfig.anchor_y)) &&
            typeof context.honeycomb.reanchor === 'function'
        )
        {
            context.honeycomb.reanchor(
                Number(honeycombConfig.anchor_x),
                Number(honeycombConfig.anchor_y)
            );
        }

        return context.honeycomb;
    }

    return showHoneycombMenu( honeycombConfig, { nested, context } );
};


window.honeycomb_menu = (config) => openHoneycombMenu(manager, config);

window.honeycomb_menu_create_context = () => ({
    honeycomb: null,
    stack: [],
    currentConfig: null,
    local: true,
    moduleAnchor: null
});

window.honeycomb_menu_in_context = (context, config) => {
    if( ! context || typeof context !== 'object' )
        return openHoneycombMenu(manager, config);

    return openHoneycombMenu(context, config);
};
document.addEventListener('touchstart', manager.handleXYPosition, false);
document.addEventListener('mousedown', manager.handleXYPosition, false);
document.addEventListener('pointerdown', manager.handlePointerDown, true);
document.addEventListener('pointerup', manager.handlePointerUp, true);
document.addEventListener('pointercancel', manager.handlePointerUp, true);

document.body.addEventListener("ll-custom", e => {
    if(e.detail.honeycomb_menu)
    {
        const nestedConfig = merge({}, e.detail.honeycomb_menu);
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        const sourceMenu = path.find(node =>
            node &&
            node.tagName &&
            node.tagName.toLowerCase() === 'honeycomb-menu'
        );
        const context = sourceMenu && sourceMenu._menuContext
            ? sourceMenu._menuContext
            : manager;

        const mayMovePersistentCenter =
            !(context.local === true && context.moduleAnchor);

        if( nestedConfig.promote_to_center === true && mayMovePersistentCenter )
        {
            const sourceItem = path.find(node =>
                node &&
                node.tagName &&
                node.tagName.toLowerCase() === 'honeycomb-menu-item'
            );

            if( sourceItem && typeof sourceItem.getBoundingClientRect === 'function' )
            {
                const rect = sourceItem.getBoundingClientRect();

                nestedConfig.anchor_x = rect.left + (rect.width / 2);
                nestedConfig.anchor_y = rect.top + (rect.height / 2);
            }
        }

        openHoneycombMenu(context, nestedConfig);
    }
});

function showHoneycombMenu( _config, options = {} )
{
    const context = options.context || manager;
    const previous = context.honeycomb;

    if( options.resetStack )
        context.stack = [];

    if( options.nested && context.currentConfig )
        context.stack.push(context.currentConfig);

    if( previous )
        previous.close();

    const menu = document.createElement('honeycomb-menu');
    menu._menuContext = context;
    context.honeycomb = menu;
    context.currentConfig = merge({}, _config);

    menu.setConfig( _config );

    const anchorX = Number.isFinite(Number(_config.anchor_x))
        ? Number(_config.anchor_x)
        : manager.position.x;
    const anchorY = Number.isFinite(Number(_config.anchor_y))
        ? Number(_config.anchor_y)
        : manager.position.y;

    menu.display( lovelace_view(), anchorX, anchorY );
    menu.addEventListener('closing', e => {
        if( context.honeycomb === menu )
            context.honeycomb = null;
    });

    return menu;
}

function honeycombBack(context = manager)
{
    if( context.stack.length === 0 )
        return false;

    const previous = context.stack.pop();

    if( previous && previous.__honeycomb_stack_entry && previous.inPlace && context.honeycomb )
    {
        const returningToHubBase =
            context.local === true &&
            previous.config &&
            previous.config._persistent_hub_root === true;

        if( returningToHubBase )
        {
            context.moduleAnchor = null;
        }
        else if( context.local === true && context.moduleAnchor )
        {
            previous.config.anchor_x = context.moduleAnchor.x;
            previous.config.anchor_y = context.moduleAnchor.y;
        }

        context.currentConfig = merge({}, previous.config);
        context.honeycomb.replaceConfig(previous.config);

        if(
            Number.isFinite(Number(previous.config && previous.config.anchor_x)) &&
            Number.isFinite(Number(previous.config && previous.config.anchor_y)) &&
            typeof context.honeycomb.reanchor === 'function'
        )
        {
            context.honeycomb.reanchor(
                Number(previous.config.anchor_x),
                Number(previous.config.anchor_y)
            );
        }

        return true;
    }

    const previousConfig = previous && previous.__honeycomb_stack_entry
        ? previous.config
        : previous;

    showHoneycombMenu(previousConfig, { nested: false, context });
    return true;
}

function honeycombClose(context = manager)
{
    context.stack = [];
    context.currentConfig = null;

    if( context.local === true )
        context.moduleAnchor = null;

    if( context.honeycomb )
        context.honeycomb.close();
}

window.honeycomb_menu_back = () => honeycombBack(manager);
window.honeycomb_menu_close = () => honeycombClose(manager);
window.honeycomb_menu_context_back = context => honeycombBack(context || manager);
window.honeycomb_menu_context_close = context => honeycombClose(context || manager);

function traverseConfigs( _config, _buttons )
{
    if( ! _buttons )
    {
        _buttons = [];
    }

    function bindButtons( _cfg )
    {
        if( _cfg.buttons )
        {
            _cfg.buttons.forEach( (b, i) => {
                let storageIndex;

                // Legacy position keeps its original physical/index semantics
                // for backwards compatibility. New slot is resolved later by
                // the v0.4 soft/hard allocator, so keep it at list position here.
                if( b.position !== undefined )
                    storageIndex = Number(b.position);
                else
                    storageIndex = i;

                if( ! Number.isInteger(storageIndex) || storageIndex < 0 || storageIndex > 17 )
                    return;

                if( ! _buttons[storageIndex] )
                    _buttons[storageIndex] = [];

                _buttons[storageIndex].unshift(b);
            });
        }

        return { buttons: _buttons };
    }

    _config = merge({}, _config );

    const honeycomb_templates = honeycomb_menu_templates();
    if( ! _config.template || ! honeycomb_templates || ! honeycomb_templates[_config.template] )
        return Object.assign({}, _config, bindButtons( _config ));

    let parentConfig = traverseConfigs( honeycomb_templates[_config.template], _buttons );

    delete _config.template;

    return Object.assign({}, parentConfig, _config, bindButtons( _config ));
}

class HoneycombMenu extends LitElement
{
    static get is()
    {
        return 'honeycomb-menu';
    }

    static get properties()
    {
        return {
            hass: {
                type: Object
            },
            config: {
                type: Object
            },
            sizes: {
                type: Object,
                readonly: true
            },
            variables: {
                type: Object
            },
            closing: {
                type: Boolean,
                attribute: true,
                reflect: true
            },
            view: {},
            buttons: {
                type: Array
            },
            _service: {
                type: Object
            },
            _dragHoverSlot: {
                type: Number
            }
        }
    }

    constructor()
    {
        super();

        this.closing = false;
        this.buttons = [];
        this._rings = {
            inner: true,
            outer: false
        };
        this._service = {
            x: false,
            y: false
        };
        this._dragHoverSlot = -1;
        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._dragStartX = null;
        this._dragStartY = null;
        this._idleTimer = null;
        this._stateRefreshTimer = null;
        this._anchorX = null;
        this._anchorY = null;
        this._boundPointerMove = this._handleGlobalPointerMove.bind(this);
        this._boundPointerUp = this._handleGlobalPointerUp.bind(this);
    }

    static get styles()
    {
        return css`
            @keyframes fadeIn { from {opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes zoomIn {
            from {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }
            50% {
                opacity: 1;
            }
            }
            @keyframes zoomOut {
            from {
                opacity: 1;
            }

            50% {
                opacity: 0;
                transform: scale3d(0.3, 0.3, 0.3);
            }

            to {
                opacity: 0;
            }
            }

            @keyframes bounceOut {
            20% {
                -webkit-transform: scale3d(0.9, 0.9, 0.9);
                transform: scale3d(0.9, 0.9, 0.9);
            }

            50%,
            55% {
                opacity: 1;
                -webkit-transform: scale3d(1.1, 1.1, 1.1);
                transform: scale3d(1.1, 1.1, 1.1);
            }

            to {
                opacity: 0;
                -webkit-transform: scale3d(0.3, 0.3, 0.3);
                transform: scale3d(0.3, 0.3, 0.3);
            }
            }

            :host {
                position: absolute;
                z-index: 8;
            }
            :host([closing]), :host([closing]) * {
                pointer-events: none !important;
            }
            .shade {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.47);

                animation-duration: 1s;
                animation-fill-mode: both;
                animation-name: fadeIn;
            }
            :host([closing]) .shade {
                animation-name: fadeOut;
                animation-duration: 500ms;
            }
            .honeycombs {
                --filter-color: rgba(0, 0, 0, 0.76);
                filter: drop-shadow(2px 4px 3px var(--filter-color) );
                width: var(--container-width);
                height: var(--container-height);
                pointer-events: none;
            }
            honeycomb-menu-item {
                position: absolute;
                pointer-events: all;
                box-sizing: border-box;
                width: var(--item-size);
                padding: var(--spacing);
            }
            honeycomb-menu-item.center-item,
            honeycomb-persistent-control.center-item {
                z-index: 2;
            }
            honeycomb-persistent-control.center-item,
            honeycomb-persistent-control.ring-item {
                position: absolute;
                width: var(--item-size);
                pointer-events: all;
                box-sizing: border-box;
            }
            honeycomb-menu-item.center-item.center-auto-style {
                filter: brightness(var(--honeycomb-center-brightness, 1.25));
            }
            honeycomb-menu-item.drag-hover {
                filter: brightness(1.18);
                transform: scale3d(1.08, 1.08, 1.08);
                z-index: 3;
            }
            honeycomb-menu-item.center-item.center-auto-style.drag-hover {
                filter: brightness(calc(var(--honeycomb-center-brightness, 1.25) * 1.18));
            }
            honeycomb-menu-item,
            honeycomb-persistent-control.ring-item,
            xy-pad {
                animation-duration: 0.5s;
                animation-fill-mode: both;
                animation-name: zoomIn;
            }
            :host([closing]) honeycomb-menu-item,
            :host([closing]) honeycomb-persistent-control.ring-item,
            :host([closing]) xy-pad {
                animation-name: zoomOut;
            }
            :host([closing]) honeycomb-menu-item[selected] {
                animation-duration: 0.75s;
                animation-name: bounceOut;
            }
            :host([no-animation]) honeycomb-menu-item,
            :host([no-animation]) honeycomb-persistent-control.ring-item,
            :host([no-animation]) xy-pad {
                animation: none !important;
                animation-delay: 0ms !important;
            }
            xy-pad {
                width: var(--container-width);
                height: var(--container-height);
            }`;
    }

    render()
    {
        const centerConfig = this._computeCenterConfig();
        const centerPos = this._computeCenterPosition();

        return html`
            ${this._menuContext && this._menuContext.local ? '' : html`
                <div id="shade" class="shade" @click=${this._handleShadeClick}></div>
            `}

            ${(this.config.xy_pad) ? html`
                <xy-pad
                    style="animation-delay: ${this._computeAnimateDelay(1)};"
                    .hass=${this.hass}
                    .config=${this.config.xy_pad}
                    .size=${this._computeXYPadSize()}
                    .clampX=${this._computeXYPadClamp()}
                    .clampY=${this._computeXYPadClamp()}
                    @drag=${this._handleXYPad}
                    @drag-interval=${this._handleXYPad}
                    @drag-end=${this._handleXYPad}>
                </xy-pad>`:''}

            <div id="honeycombs" class="honeycombs">
                ${this.config.persistent_center ? html`
                    <honeycomb-persistent-control
                        class="center-item persistent-center-item"
                        style="
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                            --honeycomb-persistent-size: var(--item-size);
                        "
                        .hass=${this.hass}
                        .config=${this.config.persistent_center}
                        .size=${this.sizes.item}>
                    </honeycomb-persistent-control>
                ` : (centerConfig ? html`
                    <honeycomb-menu-item
                        class="center-item ${this._centerUseFilterFallback ? 'center-auto-style' : ''} ${this._dragHoverSlot === 18 ? 'drag-hover' : ''}"
                        data-honeycomb-slot="center"
                        @pointerenter=${() => this._setDragHoverSlot(18)}
                        @pointerleave=${() => this._clearDragHoverSlot(18)}
                        style="
                            animation-delay: ${this._computeAnimateDelay(0)};
                            left: calc(var(--item-size) * ${centerPos.x});
                            top: calc(var(--item-size) * ${centerPos.y});
                        "
                        .hass=${this.hass}
                        .config=${centerConfig}
                        @action=${this._handleItemAction}>
                    </honeycomb-menu-item>
                ` : '')}

                ${this.buttons.map((v, i) => {
                    if( v === undefined )
                        return '';

                    const pos = this._computeButtonPosition(i);

                    if( ! pos )
                        return '';

                    if( v && v._persistent_launcher === true )
                    {
                        const persistentConfig = this._computeItemConfig(v);

                        return html`
                            <honeycomb-persistent-control
                                class="ring-item"
                                data-honeycomb-slot="${i}"
                                style="
                                    animation-delay: ${this._computeButtonAnimateDelay(i)};
                                    left: calc(var(--item-size) * ${pos.x});
                                    top: calc(var(--item-size) * ${pos.y});
                                    --honeycomb-persistent-size: var(--item-size);
                                "
                                .hass=${this.hass}
                                .config=${persistentConfig}
                                .size=${this.sizes.item}>
                            </honeycomb-persistent-control>
                        `;
                    }

                    return html`
                        <honeycomb-menu-item
                            class="${this._dragHoverSlot === i ? 'drag-hover' : ''}"
                            data-honeycomb-slot="${i}"
                            @pointerenter=${() => this._setDragHoverSlot(i)}
                            @pointerleave=${() => this._clearDragHoverSlot(i)}
                            style="
                                animation-delay: ${this._computeButtonAnimateDelay(i)};
                                left: calc(var(--item-size) * ${pos.x});
                                top: calc(var(--item-size) * ${pos.y});
                            "
                            .hass=${this.hass}
                            .config=${this._computeItemConfig(v)}
                            @action=${this._handleItemAction}>
                        </honeycomb-menu-item>
                    `;
                })}
            </div>`;
    }

    setConfig( config )
    {
        provideHass(this);

        _defaults(config, {
            action: 'hold',
            entity: null,
            active: false,
            autoclose: true,
            audio: false,
            variables: {},
            size: 225,
            spacing: 2,
            animation_speed: 80,
            animation_mode: 'paired',
            animate: true,
            drag_select: true,
            drag_deadzone: 12,
            hover_highlight: true,
            nested_center_back: true,
            button_defaults: {},
            empty_slots: 'visible',
            center_button: {},
            center_brightness: 25,
            idle_timeout: 0,
            layout_envelope: 'auto',
            position_mode: 'viewport',
            persistent_center: null
        });
        this.config = config;
        this.toggleAttribute('no-animation', this.config.animate === false);

        // Resolve the buttons first because the active ring(s) determine size.
        this._assignButtons();

        // Reserve enough geometry for any reachable nested_expand submenu.
        // This prevents the current inner ring from being repositioned when an
        // outer-ring submenu is expanded in place later.
        this._layoutEnvelopeOuter = this._computeLayoutEnvelopeOuter(this.config);

        let itemSize = this.config.size / 3.586;
        let outerRing = this._hasOuterRing();

        this.sizes = {
            item: itemSize,
            containerWidth: itemSize * (outerRing ? 5 : 3),
            containerHeight: itemSize * (outerRing ? 4.63 : 2.9)
        };

        if( this.config.xy_pad )
        {
            if( this.config.xy_pad["x"] ) {
                this.config.xy_pad["x"].data = this.config.xy_pad["x"].data || this.config.xy_pad["x"].service_data;
            }
            if( this.config.xy_pad["y"] ) {
                this.config.xy_pad["y"].data = this.config.xy_pad["y"].data || this.config.xy_pad["y"].service_data;
            }
        }
    }

    display(_view, _x, _y)
    {
        this.view = _view;

        if( this.config.position_mode === 'anchored' )
        {
            // Keep anchored menus in the Lovelace subtree so wrapped cards
            // retain the same Home Assistant action/event context as normal
            // Honeycomb menus. position:fixed keeps the overlay out of layout
            // flow, so it still cannot increase scrollable document height.
            this.style.position = 'fixed';
            this.view.append(this);
        }
        else
        {
            this.view.style.position = 'relative';
            this.view.append(this);
        }

        this._anchorX = _x;
        this._anchorY = _y;
        this._setPosition( _x, _y );

        // If the menu was opened from button-card press_action, the pointer is
        // still physically held down. Adopt that pointer so the same gesture
        // can continue directly into drag-select.
        if( this.config.drag_select && manager.pointerDown )
        {
            this._dragPointerId = manager.pointerId;
            this._dragStartX = manager.position.x;
            this._dragStartY = manager.position.y;
        }

        // Global pointer listeners make press-and-drag selection work even when
        // the pointer/touch started on the card that opened the menu.
        document.addEventListener('pointermove', this._boundPointerMove, true);
        document.addEventListener('pointerup', this._boundPointerUp, true);
        document.addEventListener('pointercancel', this._boundPointerUp, true);

        this._resetIdleTimeout();
        this._startStateRefresh();
    }

    replaceConfig(_config)
    {
        if( this.closing )
            return;

        this.setConfig(_config);
        this._setCssVars();

        if( this._anchorX !== null && this._anchorY !== null )
            this._setPosition(this._anchorX, this._anchorY);

        this._resetIdleTimeout();
        this.requestUpdate();
    }

    firstUpdated()
    {
        this._setCssVars();
    }

    close( _item = null )
    {
        if( this.closing )
            return;

        this.closing = true;

        this._clearIdleTimeout();
        this._stopStateRefresh();

        document.removeEventListener('pointermove', this._boundPointerMove, true);
        document.removeEventListener('pointerup', this._boundPointerUp, true);
        document.removeEventListener('pointercancel', this._boundPointerUp, true);

        const items = this.shadowRoot.querySelectorAll('honeycomb-menu-item');
        let ele = _item || items[items.length - 1];

        if( _item )
        {
            _item.setAttribute('selected', '');
            _item.style.animationDelay = this._computeAnimateDelay(3);
        }

        fireEvent(this, 'closing', { item: _item });

        const shade = this.shadowRoot.querySelector('#shade');
        if( shade )
        {
            shade.addEventListener('animationend', function(e) {
                this.remove();
            });
        }

        if( ele )
        {
            ele.addEventListener('animationend', e => {
                this.remove();
                fireEvent(this, 'closed', { item: _item });
            });
        }
        else
        {
            this.remove();
            fireEvent(this, 'closed', { item: _item });
        }
    }

    _assignButtons()
    {
        const resolved = [];

        for( let i = 0; i < this.config.buttons.length; i++ )
        {
            const stack = this.config.buttons[i];

            if( ! stack )
                continue;

            let button = {};

            for( let b of stack )
            {
                if( b.show !== undefined )
                {
                    b.show = stringToBool(
                        getTemplateOrValue(
                            this.hass,
                            this.hass.states[this.config.entity],
                            this.config.variables,
                            b.show
                        )
                    );
                }
                else if( b != 'break' && b != 'skip' )
                {
                    b.show = true;
                }

                if( b != 'break' && (! b.show || b == 'skip') )
                    continue;

                button = b;
                break;
            }

            if( button == 'break' )
                button = {};

            if( ! isEmpty(button) )
                resolved.push({ button: merge({}, button), sourceIndex: i });
        }

        const assigned = new Array(18);
        const hard = [];
        const soft = [];
        const automatic = [];

        resolved.forEach(entry => {
            const button = entry.button;

            // Legacy position remains an absolute physical position.
            if( button.position !== undefined )
            {
                const target = Number(button.position);

                if( Number.isInteger(target) && target >= 0 && target <= 17 )
                    hard.push({ ...entry, target, legacy: true });

                return;
            }

            if( button.slot !== undefined )
            {
                const requestedSlot = Number(button.slot);

                if( Number.isInteger(requestedSlot) && requestedSlot >= 1 && requestedSlot <= 18 )
                {
                    if( button.slot_mode === 'hard' )
                        hard.push({ ...entry, target: requestedSlot - 1 });
                    else
                        soft.push({ ...entry, requestedSlot });
                }

                return;
            }

            automatic.push(entry);
        });

        const totalCount = resolved.length;

        // Base ring selection is determined by the number of buttons.
        let innerActive = totalCount <= 6;
        let outerActive = totalCount >= 7 && totalCount <= 12;

        if( totalCount >= 13 )
        {
            innerActive = true;
            outerActive = true;
        }

        if( totalCount === 0 )
        {
            innerActive = true;
            outerActive = false;
        }

        // Hard/legacy physical positions can force one or both rings active.
        hard.forEach(entry => {
            if( entry.target < 6 )
                innerActive = true;
            else
                outerActive = true;
        });

        this._rings = {
            inner: innerActive,
            outer: outerActive
        };

        const innerPool = [0, 1, 2, 3, 4, 5];
        const outerPool = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

        let activePool;

        if( innerActive && outerActive )
            activePool = [...innerPool, ...outerPool];
        else if( outerActive )
            activePool = outerPool;
        else
            activePool = innerPool;

        // Hard slots are absolute. Never move them.
        hard.forEach(entry => {
            if( assigned[entry.target] === undefined )
            {
                assigned[entry.target] = entry.button;
            }
            else
            {
                console.warn(
                    `[Honeycomb Menu NG] Hard slot ${entry.target + 1} is already occupied. Ignoring duplicate hard slot.`
                );
            }
        });

        // Soft slots are preferences inside the currently active layout.
        // Keep the requested physical slot when its ring is active.
        // Otherwise map it to the corresponding position in the active ring.
        // If the preferred position is occupied, move clockwise to the first free slot.
        soft.forEach(entry => {
            if( activePool.length === 0 )
                return;

            const requestedIndex = entry.requestedSlot - 1;
            let preferredTarget;

            if( activePool.includes(requestedIndex) )
            {
                // Requested physical slot already belongs to an active ring.
                preferredTarget = requestedIndex;
            }
            else if( innerActive && ! outerActive )
            {
                // Inner-only layout: wrap any soft slot onto slots 1-6.
                preferredTarget = requestedIndex % 6;
            }
            else if( outerActive && ! innerActive )
            {
                // Outer-only layout: map inner slots 1-6 onto outer slots 7-12.
                // Outer slot requests 7-18 are already handled above.
                preferredTarget = 6 + (requestedIndex % 12);
            }
            else
            {
                // Both rings active: all valid requested slots are physical.
                preferredTarget = requestedIndex;
            }

            let preferredPoolIndex = activePool.indexOf(preferredTarget);

            if( preferredPoolIndex < 0 )
                preferredPoolIndex = 0;

            let target;

            for( let offset = 0; offset < activePool.length; offset++ )
            {
                const candidate = activePool[(preferredPoolIndex + offset) % activePool.length];

                if( assigned[candidate] === undefined )
                {
                    target = candidate;
                    break;
                }
            }

            if( target !== undefined )
                assigned[target] = entry.button;
            else
                console.warn('[Honeycomb Menu NG] No free slot available for soft slot button.');
        });

        // Buttons without slot information use the first free active position.
        automatic.forEach(entry => {
            const target = activePool.find(index => assigned[index] === undefined);

            if( target !== undefined )
                assigned[target] = entry.button;
            else
                console.warn('[Honeycomb Menu NG] No free slot available for automatic button.');
        });

        const showEmptySlots = this.config.empty_slots !== 'hidden';

        if( showEmptySlots )
        {
            if( this._rings.inner )
            {
                for( let i = 0; i < 6; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }

            if( this._rings.outer )
            {
                for( let i = 6; i < 18; i++ )
                {
                    if( assigned[i] === undefined )
                        assigned[i] = {};
                }
            }
        }

        this.buttons = assigned;
    }

    reanchor(_x, _y)
    {
        const x = Number(_x);
        const y = Number(_y);

        if( ! Number.isFinite(x) || ! Number.isFinite(y) )
            return;

        if( this.config )
        {
            this.config.anchor_x = x;
            this.config.anchor_y = y;
        }

        const context = this._menuContext || manager;

        if( context.honeycomb === this && context.currentConfig )
        {
            context.currentConfig.anchor_x = x;
            context.currentConfig.anchor_y = y;
        }

        this._setPosition(x, y);
    }

    _setPosition( _x, _y )
    {
        const container = {
            w: ( this.sizes.containerWidth / 2 ),
            h: ( this.sizes.containerHeight / 2 )
        };

        const rect = this.view.getBoundingClientRect();

        // Persistent controls are real dashboard/floorplan anchors. Their
        // center must stay at the exact same screen coordinate while the ring
        // expands around them, even when part of the ring reaches an edge.
        if( this.config.position_mode === 'anchored' )
        {
            const centerPos = this._computeCenterPosition();
            const itemSize = this.sizes.item;
            const centerOffsetX = (centerPos.x * itemSize) + (itemSize / 2);
            const centerOffsetY = (centerPos.y * itemSize) + ((itemSize * 1.1547) / 2);

            this.style.left = `${_x - centerOffsetX}px`;
            this.style.top = `${_y - centerOffsetY}px`;
            return;
        }

        const viewStyle = window.getComputedStyle(this.view, null);

        const paddingLeft = parseFloat( viewStyle.getPropertyValue('padding-left') ) || 0;
        const paddingTop = parseFloat( viewStyle.getPropertyValue('padding-top') ) || 0;

        // Standard popup menus still clamp against the visible viewport.
        const visibleLeft = Math.max(rect.left, 0);
        const visibleTop = Math.max(rect.top, 0);
        const visibleRight = Math.min(rect.right, window.innerWidth);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight);

        let minX = ( visibleLeft - rect.left ) + paddingLeft + container.w;
        let minY = ( visibleTop - rect.top ) + paddingTop + container.h;
        let maxX = ( visibleRight - rect.left ) - container.w - 5;
        let maxY = ( visibleBottom - rect.top ) - container.h - 5;

        if( maxX < minX )
        {
            const centerX = ( ( visibleLeft + visibleRight ) / 2 ) - rect.left;
            minX = centerX;
            maxX = centerX;
        }

        if( maxY < minY )
        {
            const centerY = ( ( visibleTop + visibleBottom ) / 2 ) - rect.top;
            minY = centerY;
            maxY = centerY;
        }

        _x = clamp( _x - rect.left, minX, maxX );
        _y = clamp( _y - rect.top, minY, maxY );

        this.style.left = `${_x - container.w}px`;
        this.style.top = `${_y - container.h}px`;
    }

    _setCssVarProperty(orig_property, var_property)
    {
        this.shadowRoot.querySelector('#honeycombs').style.setProperty(orig_property, `var(${var_property}, ${this.view.style.getPropertyValue(orig_property)})`, "important");
    }

    _setCssVars()
    {
        this.style.setProperty('--item-size', `${this.sizes.item}px` );
        this.style.setProperty('--container-width', `${this.sizes.containerWidth}px`);
        this.style.setProperty('--container-height', `${this.sizes.containerHeight}px`);

        this.style.setProperty('--spacing', `${this.config.spacing}px`);

        const centerBrightness = Number(this.config.center_brightness);
        const centerBrightnessFactor = Number.isFinite(centerBrightness)
            ? Math.max(0, 1 + (centerBrightness / 100))
            : 1.25;
        this.style.setProperty('--honeycomb-center-brightness', `${centerBrightnessFactor}`);

        this._setCssVarProperty('--paper-item-icon-color', '--honeycomb-menu-icon-color');
        this._setCssVarProperty('--paper-item-icon-active-color', '--honeycomb-menu-icon-active-color');
        this._setCssVarProperty('--ha-card-background', '--honeycomb-menu-background-color');
        this._setCssVarProperty('--ha-card-active-background', '--honeycomb-menu-active-background-color');
    }

    _handleShadeClick(e)
    {
        e.stopPropagation();
        const context = this._menuContext || manager;
        context.stack = [];
        context.currentConfig = null;

        if( context.local === true )
            context.moduleAnchor = null;

        this.close();
    }

    _handleItemAction(e)
    {
        if( ! e.detail.item )
            return;

        const item = e.detail.item;
        const actionType = e.detail.action || 'tap';
        const actionKey = actionType === 'hold'
            ? 'hold_action'
            : actionType === 'double_tap'
                ? 'double_tap_action'
                : 'tap_action';
        const actionConfig = item.config && item.config[actionKey]
            ? item.config[actionKey]
            : null;
        const configuredAction = actionConfig
            ? actionConfig.action
            : null;

        // Native nested actions must stay inside the menu context that owns
        // this Honeycomb. Using button-card fire-dom-event can lose the local
        // persistent-Hub context at a shadow-DOM boundary and accidentally
        // open a second global Honeycomb (with shade) on top of the Hub.
        if(
            configuredAction === 'honeycomb-open-nested' &&
            actionConfig &&
            actionConfig.honeycomb_nested_menu
        )
        {
            e.stopPropagation();

            openHoneycombMenu(
                this._menuContext || manager,
                merge({}, actionConfig.honeycomb_nested_menu)
            );

            this._resetIdleTimeout();
            return;
        }

        if( configuredAction === 'honeycomb-back' )
        {
            e.stopPropagation();
            honeycombBack(this._menuContext || manager);
            return;
        }

        if( configuredAction === 'honeycomb-close' )
        {
            e.stopPropagation();
            honeycombClose(this._menuContext || manager);
            return;
        }

        if( configuredAction === 'honeycomb-media-volume' )
        {
            e.stopPropagation();

            this._handleMediaVolumeAction(
                actionConfig,
                item.config ? item.config.entity : null
            );

            this._resetIdleTimeout();
            return;
        }

        if(
            configuredAction === 'honeycomb-preset-apply' ||
            configuredAction === 'honeycomb-preset-store'
        )
        {
            e.stopPropagation();

            this._handlePresetAction(
                configuredAction === 'honeycomb-preset-store' ? 'store' : 'apply',
                actionConfig,
                item.config ? item.config.entity : null
            );

            this._resetIdleTimeout();
            return;
        }

        this._playButtonSound( item );

        if( e.detail.autoclose )
        {
            const context = this._menuContext || manager;
            context.stack = [];
            context.currentConfig = null;
            this.close(item);
            return;
        }

        this._resetIdleTimeout();
    }

    _handleMediaVolumeAction(actionConfig, fallbackEntity)
    {
        if( ! this.hass || ! actionConfig )
            return;

        const entityId = actionConfig.entity || fallbackEntity || (this.config && this.config.entity);

        if( ! entityId )
            return;

        const state = this.hass.states[entityId];
        const rawMembers = state && state.attributes && Array.isArray(state.attributes.group_members)
            ? state.attributes.group_members.filter(Boolean)
            : [];

        const targets = rawMembers.length
            ? Array.from(new Set(rawMembers))
            : [entityId];

        if( ! targets.includes(entityId) )
            targets.unshift(entityId);

        const direction = String(actionConfig.direction || '').toLowerCase();
        const service = direction === 'down'
            ? 'volume_down'
            : 'volume_up';

        this.hass.callService(
            'media_player',
            service,
            {},
            { entity_id: targets }
        );
    }

    _setNumberHelper(entityId, value)
    {
        if( ! this.hass || ! entityId || ! Number.isFinite(Number(value)) )
            return;

        this.hass.callService(
            'number',
            'set_value',
            { value: Number(value) },
            { entity_id: entityId }
        );
    }

    _handlePresetAction(mode, actionConfig, lightEntity)
    {
        if( ! this.hass || ! actionConfig || ! lightEntity )
            return;

        const light = this.hass.states[lightEntity];

        if( ! light )
            return;

        const type = actionConfig.preset_type;

        if( type === 'brightness' )
        {
            const helper = actionConfig.helper_entity;
            const helperState = helper ? this.hass.states[helper] : null;

            if( mode === 'apply' )
            {
                const value = helperState ? Number(helperState.state) : NaN;

                if( Number.isFinite(value) )
                {
                    this.hass.callService(
                        'light',
                        'turn_on',
                        { brightness_pct: Math.max(0, Math.min(100, value)) },
                        { entity_id: lightEntity }
                    );
                }
            }
            else
            {
                const brightness = Number(light.attributes && light.attributes.brightness);

                if( Number.isFinite(brightness) )
                {
                    this._setNumberHelper(
                        helper,
                        Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)))
                    );
                }
            }

            return;
        }

        if( type === 'kelvin' )
        {
            const helper = actionConfig.helper_entity;
            const helperState = helper ? this.hass.states[helper] : null;

            if( mode === 'apply' )
            {
                const value = helperState ? Number(helperState.state) : NaN;

                if( Number.isFinite(value) )
                {
                    this.hass.callService(
                        'light',
                        'turn_on',
                        { color_temp_kelvin: Math.round(value) },
                        { entity_id: lightEntity }
                    );
                }
            }
            else
            {
                const kelvin = Number(light.attributes && light.attributes.color_temp_kelvin);

                if( Number.isFinite(kelvin) )
                    this._setNumberHelper(helper, Math.round(kelvin));
            }

            return;
        }

        if( type === 'color' )
        {
            const hueEntity = actionConfig.hue_entity;
            const saturationEntity = actionConfig.saturation_entity;

            if( mode === 'apply' )
            {
                const hueState = hueEntity ? this.hass.states[hueEntity] : null;
                const satState = saturationEntity ? this.hass.states[saturationEntity] : null;
                const hue = hueState ? Number(hueState.state) : NaN;
                const saturation = satState ? Number(satState.state) : NaN;

                if( Number.isFinite(hue) && Number.isFinite(saturation) )
                {
                    this.hass.callService(
                        'light',
                        'turn_on',
                        {
                            hs_color: [
                                Math.max(0, Math.min(360, hue)),
                                Math.max(0, Math.min(100, saturation))
                            ]
                        },
                        { entity_id: lightEntity }
                    );
                }
            }
            else
            {
                const hs = light.attributes && light.attributes.hs_color;

                if( Array.isArray(hs) && hs.length >= 2 )
                {
                    this._setNumberHelper(
                        hueEntity,
                        Math.max(0, Math.min(360, Number(hs[0])))
                    );
                    this._setNumberHelper(
                        saturationEntity,
                        Math.max(0, Math.min(100, Number(hs[1])))
                    );
                }
            }
        }
    }

    _setDragHoverSlot(slot)
    {
        if( ! this.config.hover_highlight )
            return;

        this._dragHoverSlot = slot;
    }

    _clearDragHoverSlot(slot)
    {
        if( this._dragHoverSlot === slot )
            this._dragHoverSlot = -1;
    }

    _findMenuItemAtPoint(x, y)
    {
        if( ! this.shadowRoot || ! this.shadowRoot.elementFromPoint )
            return null;

        let element = this.shadowRoot.elementFromPoint(x, y);

        while( element && element !== this.shadowRoot )
        {
            if( element.tagName && element.tagName.toLowerCase() === 'honeycomb-menu-item' )
                return element;

            element = element.parentElement;
        }

        return null;
    }

    _handleGlobalPointerMove(e)
    {
        if( ! this.config.drag_select )
            return;

        // Only drag-select while the pointer is physically held down.
        if( e.buttons === 0 && e.pointerType === 'mouse' )
            return;

        // When the menu was opened by press_action, keep following the same
        // pointer that started the gesture.
        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        if( ! this._dragPointerActive )
        {
            if( this._dragStartX === null || this._dragStartY === null )
            {
                this._dragStartX = e.clientX;
                this._dragStartY = e.clientY;
            }

            const dx = e.clientX - this._dragStartX;
            const dy = e.clientY - this._dragStartY;
            const distance = Math.hypot(dx, dy);
            const deadzone = Math.max(0, Number(this.config.drag_deadzone) || 0);

            if( distance < deadzone )
                return;

            this._dragPointerActive = true;
        }

        this._dragPointerId = e.pointerId;
        this._resetIdleTimeout();

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        if( ! item )
        {
            this._dragHoverSlot = -1;
            return;
        }

        const slot = item.dataset.honeycombSlot === 'center'
            ? 18
            : Number(item.dataset.honeycombSlot);

        this._dragHoverSlot = Number.isFinite(slot) ? slot : -1;
    }

    _handleGlobalPointerUp(e)
    {
        if( ! this.config.drag_select )
            return;

        if( this._dragPointerId !== null && e.pointerId !== this._dragPointerId )
            return;

        if( ! this._dragPointerActive )
        {
            this._dragPointerId = null;
            this._dragStartX = null;
            this._dragStartY = null;
            this._dragHoverSlot = -1;
            return;
        }

        const item = this._findMenuItemAtPoint(e.clientX, e.clientY);

        this._dragPointerActive = false;
        this._dragPointerId = null;
        this._dragStartX = null;
        this._dragStartY = null;
        this._dragHoverSlot = -1;

        if( item )
        {
            e.preventDefault();
            e.stopPropagation();
            this._triggerMenuItemTap(item);
        }
    }

    _triggerMenuItemTap(item)
    {
        // honeycomb-menu-item is a wrapper around a Lovelace card (normally
        // custom:button-card). Clicking the wrapper itself does not execute the
        // wrapped card action. Trigger a normal tap on the actual action-handler
        // element inside the wrapped card instead.
        const wrappedCard = item.shadowRoot
            ? item.shadowRoot.querySelector('#item > *')
            : null;

        if( ! wrappedCard )
        {
            console.warn('[Honeycomb Menu NG] Unable to find wrapped card for drag-select.');
            return;
        }

        let actionTarget = wrappedCard;

        // custom:button-card attaches the Home Assistant action-handler to its
        // rendered card element. Prefer that element when it can be located.
        if( wrappedCard.shadowRoot )
        {
            const candidate =
                wrappedCard.shadowRoot.querySelector('ha-card') ||
                wrappedCard.shadowRoot.querySelector('[role="button"]');

            if( candidate )
                actionTarget = candidate;
        }

        // The HA/button-card action-handler reacts to an `action` event with
        // action: tap. This follows the same path as a normal tap and therefore
        // preserves toggle, call-service, fire-dom-event, navigation, etc.
        actionTarget.dispatchEvent(new CustomEvent('action', {
            bubbles: true,
            composed: true,
            detail: { action: 'tap' }
        }));
    }

    _startStateRefresh()
    {
        this._stopStateRefresh();

        this._stateRefreshTimer = setInterval(() => {
            if( this.closing )
                return;

            const homeAssistant = document.querySelector('home-assistant');
            const latestHass = homeAssistant ? homeAssistant.hass : null;

            if( ! latestHass )
                return;

            // Home Assistant does not guarantee a brand-new hass object for
            // every state change. Relying only on object identity means live
            // button-card templates can freeze while a Honeycomb menu is open
            // (for example Sonos volume percentage after volume_up/down).
            //
            // Always push the current hass object directly into rendered menu
            // children. honeycomb-menu-item forwards it to the wrapped
            // custom:button-card, forcing its JS templates to re-evaluate.
            this.hass = latestHass;

            if( this.shadowRoot )
            {
                this.shadowRoot
                    .querySelectorAll('honeycomb-menu-item, honeycomb-persistent-control, xy-pad')
                    .forEach(item => {
                        item.hass = latestHass;
                    });
            }

            this.requestUpdate();
        }, 200);
    }

    _stopStateRefresh()
    {
        if( this._stateRefreshTimer )
        {
            clearInterval(this._stateRefreshTimer);
            this._stateRefreshTimer = null;
        }
    }

    _clearIdleTimeout()
    {
        if( this._idleTimer )
        {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }
    }

    _resetIdleTimeout()
    {
        this._clearIdleTimeout();

        const timeout = Number(this.config && this.config.idle_timeout);

        if( ! Number.isFinite(timeout) || timeout <= 0 || this.closing )
            return;

        this._idleTimer = setTimeout(() => {
            this._idleTimer = null;

            if( this.closing )
                return;

            const context = this._menuContext || manager;
            context.stack = [];
            context.currentConfig = null;
            this.close();
        }, timeout);
    }

    _playButtonSound( _item )
    {
        if( ! isString(_item.config.audio) )
            return;

        let audio_ele = document.querySelector('#honeycomb-audio');
        if( ! audio_ele )
        {
            audio_ele = document.createElement('audio');
            audio_ele.id = 'honeycomb-audio';
            document.querySelector("home-assistant").append(audio_ele);
        }
        audio_ele.src = _item.config.audio;
        audio_ele.play();
    }

    _handleXYPad(e)
    {
        if( (this.config.xy_pad.on_release && e.type != 'drag-end') ||
            (this.config.xy_pad.repeat && e.type != 'drag-interval')
        ) return;

        ['x', 'y'].forEach( axis => {
            let config = this.config.xy_pad[axis];

            if( e.detail[axis] == 0 || ! config || ! config.service || this._service[axis] )
                return;

            this._service[axis] = true;
            let service = split( config.service, '.', 2);
            this.hass
                .callService( service[0], service[1], this.__renderServiceData(e.detail, config.data) )
                .then(e => this._service[axis] = false);

        });
    }

    __renderServiceData( vars, data )
    {
        if( ! data )
            return new Object();

        return objectEvalTemplate( this.hass, this.hass.states[this.config.entity], { ...this.config.variables, ...vars }, data, (val) => {
            if( val == 'entity' )
                return this.config.entity;
            return _template(val, {interpolate: /{{([\s\S]+?)}}/g})(vars);
        });
    }

    _computeXYPadSize()
    {
        return this.config.size / 6;
    }

    _computeXYPadClamp()
    {
        return this.config.size / 3;
    }

    _computeItemSize()
    {
        return this.config.size / 3;
    }

    _computeItemConfig( item )
    {
        if( isEmpty(item) )
            return item;

        return omit(
            merge(
                {},
                this.config,
                this.config.button_defaults || {},
                item
            ),
            [
                'buttons',
                'size',
                'action',
                'xy_pad',
                'spacing',
                'animation_speed',
                'animation_mode',
                'animate',
                'drag_select',
                'drag_deadzone',
                'hover_highlight',
                'nested_center_back',
                'nested_expand',
                'button_defaults',
                'empty_slots',
                'center_button',
                'center_brightness',
                'idle_timeout',
                'layout_envelope',
                'position_mode',
                'persistent_center',
                'presets',
                'control',
                'inherit_inner',
                'promote_to_center',
                'promoted_center',
                '_persistent_launcher',
                'anchor_x',
                'anchor_y',
                'slot',
                'slot_mode'
            ]
        );
    }

    _centerHasExplicitBackground()
    {
        const center = this.config.center_button;

        if( ! center || center === false || ! center.styles )
            return false;

        const cardStyles = center.styles.card;

        if( ! Array.isArray(cardStyles) )
            return false;

        return cardStyles.some(style => {
            if( ! style || typeof style !== 'object' )
                return false;

            return Object.prototype.hasOwnProperty.call(style, 'background') ||
                   Object.prototype.hasOwnProperty.call(style, 'background-color') ||
                   Object.prototype.hasOwnProperty.call(style, 'backgroundColor');
        });
    }

    _lightenColorString( color, percent )
    {
        if( typeof color !== 'string' )
            return null;

        const amount = Math.max(0, Number(percent) || 0) / 100;
        const value = color.trim();

        const rgbaMatch = value.match(
            /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
        );

        if( rgbaMatch )
        {
            const r = Number(rgbaMatch[1]);
            const g = Number(rgbaMatch[2]);
            const b = Number(rgbaMatch[3]);
            const a = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : null;

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount));

            if( a !== null )
                return `rgba(${lighten(r)}, ${lighten(g)}, ${lighten(b)}, ${a})`;

            return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`;
        }

        const hexMatch = value.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);

        if( hexMatch )
        {
            let hex = hexMatch[1];

            if( hex.length === 3 )
                hex = hex.split('').map(c => c + c).join('');

            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const lighten = channel =>
                Math.round(channel + ((255 - channel) * amount))
                    .toString(16)
                    .padStart(2, '0');

            return `#${lighten(r)}${lighten(g)}${lighten(b)}`;
        }

        return null;
    }

    _applyCenterBrightness( config )
    {
        if( this._centerHasExplicitBackground() )
            return false;

        const brightness = Number(this.config.center_brightness);

        if( ! Number.isFinite(brightness) || brightness === 0 )
            return true;

        if( ! config.styles || ! Array.isArray(config.styles.card) )
            return false;

        let adjusted = false;

        config.styles.card = config.styles.card.map(style => {
            if( ! style || typeof style !== 'object' )
                return style;

            const copy = { ...style };

            ['background', 'background-color', 'backgroundColor'].forEach(key => {
                if( Object.prototype.hasOwnProperty.call(copy, key) )
                {
                    const lightened = this._lightenColorString(copy[key], brightness);

                    if( lightened )
                    {
                        copy[key] = lightened;
                        adjusted = true;
                    }
                }
            });

            return copy;
        });

        return adjusted;
    }

    _computeCenterConfig()
    {
        if( this.config.center_button === false )
            return null;

        const nestedDefaultCenter = (this._menuContext || manager).stack.length > 0 && this.config.nested_center_back
            ? {
                entity: this.config.entity,
                active: false,
                autoclose: false,
                icon: 'mdi:arrow-left',
                tap_action: {
                    action: 'honeycomb-back'
                }
            }
            : {
                entity: this.config.entity,
                active: this.config.active,
                autoclose: true,
                tap_action: {
                    action: 'more-info'
                }
            };

        const center = merge(
            {},
            nestedDefaultCenter,
            this.config.center_button || {}
        );

        const computed = this._computeItemConfig(center);

        // Prefer changing only the inherited card background. If the color
        // cannot be parsed (for example a theme variable), fall back to CSS
        // brightness on the whole center item.
        const adjustedBackground = this._applyCenterBrightness(computed);
        this._centerUseFilterFallback =
            ! this._centerHasExplicitBackground() &&
            ! adjustedBackground &&
            Number(this.config.center_brightness) !== 0;

        return computed;
    }

    _getConfiguredButtons(config)
    {
        if( ! config || ! Array.isArray(config.buttons) )
            return [];

        const buttons = [];

        config.buttons.forEach(entry => {
            if( Array.isArray(entry) )
            {
                entry.forEach(button => {
                    if( button && typeof button === 'object' )
                        buttons.push(button);
                });
            }
            else if( entry && typeof entry === 'object' )
            {
                buttons.push(entry);
            }
        });

        return buttons;
    }

    _configUsesOuterRing(config)
    {
        const buttons = this._getConfiguredButtons(config);

        // More than six configured buttons necessarily needs the outer ring in
        // one of the supported automatic layouts. Be conservative here: this is
        // an envelope calculation, so reserving a little extra space is safer
        // than allowing the menu to jump when a dynamic button becomes visible.
        if( buttons.length > 6 )
            return true;

        return buttons.some(button => {
            // Legacy position is zero-based and absolute.
            if( button.position !== undefined )
            {
                const position = Number(button.position);
                if( Number.isInteger(position) && position >= 6 && position <= 17 )
                    return true;
            }

            // Only hard slots force a physical ring. Soft slots may wrap into
            // the currently active ring and therefore do not require an outer
            // envelope by themselves.
            if( button.slot_mode === 'hard' && button.slot !== undefined )
            {
                const slot = Number(button.slot);
                if( Number.isInteger(slot) && slot >= 7 && slot <= 18 )
                    return true;
            }

            return false;
        });
    }

    _configHasExpandableOuter(config, seen = new Set())
    {
        if( ! config || typeof config !== 'object' || seen.has(config) )
            return false;

        seen.add(config);

        const buttons = this._getConfiguredButtons(config);
        const actionKeys = ['tap_action', 'hold_action', 'double_tap_action', 'press_action'];

        for( const button of buttons )
        {
            for( const actionKey of actionKeys )
            {
                const action = button[actionKey];
                const nested = action && action.honeycomb_menu;

                if( ! nested || nested.nested_expand !== true )
                    continue;

                if( nested.layout_envelope === 'outer' || this._configUsesOuterRing(nested) )
                    return true;

                if( nested.layout_envelope !== 'inner' && this._configHasExpandableOuter(nested, seen) )
                    return true;
            }
        }

        return false;
    }

    _computeLayoutEnvelopeOuter(config)
    {
        const mode = config && config.layout_envelope;

        if( mode === 'outer' )
            return true;

        if( mode === 'inner' )
            return false;

        return !!(this._rings && this._rings.outer) || this._configHasExpandableOuter(config);
    }

    _computeCenterPosition()
    {
        if( this._hasOuterRing() )
        {
            return {
                x: 2,
                y: 1.73
            };
        }

        return {
            x: 1,
            y: 0.865
        };
    }

    _hasInnerRing()
    {
        return this._rings && this._rings.inner;
    }

    _hasOuterRing()
    {
        return !!(
            (this._rings && this._rings.outer) ||
            this._layoutEnvelopeOuter
        );
    }

    _computeButtonPosition( slot )
    {
        const innerRing = [
            { x: 0,   y: 0.865 }, // 1 - left
            { x: 0.5, y: 0 },     // 2 - upper left
            { x: 1.5, y: 0 },     // 3 - upper right
            { x: 2,   y: 0.865 }, // 4 - right
            { x: 1.5, y: 1.725 }, // 5 - lower right
            { x: 0.5, y: 1.725 }  // 6 - lower left
        ];

        const outerRing = [
            { x: -1,   y: 0.865 }, // 7  - left
            { x: -0.5, y: 0 },     // 8  - upper-left outer
            { x: 0,    y: -0.865 },// 9  - upper-left top
            { x: 1,    y: -0.865 },// 10 - top-left
            { x: 2,    y: -0.865 },// 11 - top-right
            { x: 2.5,  y: 0 },     // 12 - upper-right outer
            { x: 3,    y: 0.865 }, // 13 - right
            { x: 2.5,  y: 1.725 }, // 14 - lower-right outer
            { x: 2,    y: 2.59 },  // 15 - lower-right bottom
            { x: 1,    y: 2.59 },  // 16 - bottom-right
            { x: 0,    y: 2.59 },  // 17 - bottom-left
            { x: -0.5, y: 1.725 }  // 18 - lower-left outer
        ];

        let position;

        if( slot < 6 )
        {
            if( ! this._hasInnerRing() )
                return null;

            position = innerRing[slot];
        }
        else
        {
            if( ! this._hasOuterRing() )
                return null;

            position = outerRing[slot - 6];
        }

        if( ! position )
            return null;

        if( this._hasOuterRing() )
        {
            return {
                x: position.x + 1,
                y: position.y + 0.865
            };
        }

        return position;
    }

    _computeButtonAnimateStep( slot )
    {
        if( this.config.animation_mode === 'sequential' )
            return slot + 1;

        // Paired mode animates opposite physical positions together.
        // Inner ring: 1+4, 2+5, 3+6.
        if( slot < 6 )
            return (slot % 3) + 1;

        // Outer ring: 7+13, 8+14, 9+15, 10+16, 11+17, 12+18.
        return ((slot - 6) % 6) + 1;
    }

    _computeButtonAnimateDelay( slot )
    {
        return this._computeAnimateDelay(this._computeButtonAnimateStep(slot));
    }

    _computeAnimateDelay( i )
    {
        return this.config.animation_speed * i + 'ms';
    }
}

customElements.define(HoneycombMenu.is, HoneycombMenu);
