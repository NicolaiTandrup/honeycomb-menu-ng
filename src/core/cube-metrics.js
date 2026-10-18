// Cell width is the physical sizing unit. Keep classic menu extent conversion
// at the boundary; never reinterpret existing menu.size configurations.
const MENU_EXTENT_FACTOR = 3.586;
const HEX_HEIGHT = 1.1547;
function cubeWidth(value, fallback = 72)
{
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}
function menuCubeWidth(config)
{
    return cubeWidth(config.cube_size, cubeWidth(config.size, 225) / MENU_EXTENT_FACTOR);
}
function contentMetrics(size, primary = true, secondary = true)
{
    const width = cubeWidth(size);
    return { icon: width * (primary || secondary ? 0.30 : 0.34),
        primary: width * 0.18, secondary: width * (primary ? 0.12 : 0.16) };
}
module.exports = { MENU_EXTENT_FACTOR, HEX_HEIGHT, cubeWidth, menuCubeWidth, contentMetrics };
