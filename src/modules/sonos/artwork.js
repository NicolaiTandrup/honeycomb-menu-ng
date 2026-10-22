// Only HA-supplied image locations. No scraping, stream parsing or credentials.
function validThumbnail(value)
{
    if (typeof value !== 'string' || /[\s"'<>\\]/.test(value)) return false;
    return /^https?:\/\/[^/]+/i.test(value) || /^\/(?!\/)/.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value);
}
module.exports = {validThumbnail};
