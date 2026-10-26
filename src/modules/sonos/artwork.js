const {artworkLayout}=require('../../core/cube-presentation');
// Only HA-supplied image locations. No scraping, stream parsing or credentials.
function validThumbnail(value)
{
    if (typeof value !== 'string' || /[\s"'<>\\]/.test(value)) return false;
    return /^https?:\/\/[^/]+/i.test(value) || /^\/(?!\/)/.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value);
}
// All native Radio surfaces share the same inset. The image box must avoid
// the sloped upper hex edges, not merely fit inside its rectangular bounds.
// Use percentages of the existing fill; contain preserves every source ratio.
function radioArtworkLayout({primary=false,secondary=false}={})
{
    return {...artworkLayout({primary,secondary,scale:48/62}),top:primary || secondary ? '22%' : '26%'};
}
module.exports = {validThumbnail,radioArtworkLayout};
