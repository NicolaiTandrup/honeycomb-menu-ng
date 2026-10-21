// Ordinary Light function cubes use the shared flex/icon/text hierarchy. Do not
// force Light preset's three-row grid onto Sonos functions with optional labels.
// Radio favorite artwork retains its separate, unchanged descriptor styles.
function sonosButtonStyles(options = {})
{
    return options.background ? {card:[{background:options.background}]} : {};
}
module.exports = { sonosButtonStyles };
