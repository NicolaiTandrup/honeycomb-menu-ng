const { persistentHexPoints } = require('./layout.js');

// One geometry contract for native controls and wrapped Lovelace cards.
function hexFace(size, border = {}, mode)
{
    const width = (value, fallback) => {
        const number = Number(value === undefined ? fallback : value);
        return Number.isFinite(number) ? Math.max(0, number) : fallback;
    };
    const pixels = Number(size) > 0 ? Number(size) : 72;
    const innerScale = Math.max(0.55, 1 - width(border.outer_width, 3) * 2 / pixels);
    const centerScale = Math.max(0.45, innerScale - width(border.inner_width, 3) * 2 / pixels);
    const points = persistentHexPoints(mode);
    const path = scale => 'M' + points.split(' ').map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return `${50 + (x - 50) * scale},${57.735 + (y - 57.735) * scale}`;
    }).join(' L') + ' Z';
    return { points, innerScale, centerScale,
        outerPath: path(1) + ' ' + path(innerScale),
        innerPath: path(innerScale) + ' ' + path(centerScale) };
}

module.exports = { hexFace };
