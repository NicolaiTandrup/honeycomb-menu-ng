import { html, svg } from 'lit';
import { getTemplateOrValue } from './helpers.js';
const { hexFace } = require('./core/hex-face.js');

export function presentationValue(hass, config, value, fallback = '')
{
    try {
        const result = getTemplateOrValue(hass || { states: {} }, hass && hass.states[config.entity],
            config.variables || {}, value);
        if (result === undefined || result === null || typeof result === 'object' ||
            (typeof result === 'string' && result.includes('[[['))) return fallback;
        return result;
    } catch (_) {
        return fallback;
    }
}

export function faceBorder(hass, config)
{
    const border = config.border || {};
    return { outer_width: presentationValue(hass, config, border.outer_width, 3),
        inner_width: presentationValue(hass, config, border.inner_width, 3) };
}

export function faceColors(hass, config, defaults)
{
    const colors = config.colors || {};
    const resolve = (key, fallback) => {
        const value = presentationValue(hass, config, colors[key], fallback);
        return !value || value === 'auto' ? fallback : value;
    };
    return { center: resolve('center', defaults.center),
        inner: resolve('inner_border', defaults.inner), outer: resolve('outer_border', defaults.outer) };
}

export function renderHexFace(size, border, mode, colors, ringsOnly = false)
{
    const face = hexFace(size, border, mode);
    return html`<svg class="hex-svg" viewBox="0 0 100 115.47" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${ringsOnly ? '' : svg`<polygon class="hex-center" points=${face.points} fill=${colors.center}></polygon>`}
        <path class="hex-outer" d=${face.outerPath} fill-rule="evenodd" fill=${colors.outer}></path>
        <path class="hex-inner" d=${face.innerPath} fill-rule="evenodd" fill=${colors.inner}></path>
    </svg>`;
}
