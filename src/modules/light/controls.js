const merge = require('lodash/merge');
const _defaults = require('lodash/defaults');
const { INITIAL } = require('./color-zoom.js');

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

function buildColorPaletteButtons(palette = INITIAL)
{
    return palette.map(([hue, saturation], index) => ({
        slot: index + 7,
        slot_mode: 'hard',
        show_icon: false,
        show_name: false,
        name: `Color ${hue} degrees, ${saturation}% saturation; hold or Shift+Enter to zoom`,
        autoclose: false,
        styles: {
            card: [
                { background: `hsl(${hue}, ${saturation}%, 55%)` },
                { border: '1px solid rgba(255,255,255,0.20)' }
            ]
        },
        tap_action: {
            action: 'perform-action',
            perform_action: 'light.turn_on',
            data: { hs_color: [hue, saturation] }
        },
        hold_action: {
            action: 'honeycomb-light-color-zoom',
            palette: palette.map(color=>[...color]),
            selected: index
        }
    }));
}

function buildWhitePaletteButtons(capabilities)
{
    let minKelvin = Math.max(1000, Number(capabilities.minKelvin) || 2200);
    let maxKelvin = Math.max(minKelvin, Number(capabilities.maxKelvin) || 6500);

    if( maxKelvin === minKelvin )
        maxKelvin = minKelvin + 1;

    const values = [];

    for( let index = 0; index < 12; index++ )
    {
        const ratio = index / 11;
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
            data: { color_temp_kelvin: kelvin }
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
                action: 'honeycomb-open-nested',
                honeycomb_nested_menu: {
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
                action: 'honeycomb-open-nested',
                honeycomb_nested_menu: {
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

    const fallbackKelvin = Number((kelvinPreset && kelvinPreset.default) || 2700);

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
            data: { color_temp_kelvin: Math.round(fallbackKelvin) }
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
                    data: { brightness_pct: Math.max(0, Math.min(100, fallback)) }
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
                    data: { color_temp_kelvin: Math.round(fallback) }
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
            const nested = action && (action.honeycomb_menu || action.honeycomb_nested_menu);

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

module.exports = {
    applyPresetControls,
    lightCapabilities,
    buildColorPaletteButtons,
    buildWhitePaletteButtons
};
