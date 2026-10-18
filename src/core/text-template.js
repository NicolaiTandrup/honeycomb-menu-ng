function templateBody(value)
{
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^(\[{3,})([\s\S]*?)(\]{3,})$/);
    return match && match[1].length === match[3].length ? match[2] : null;
}

// A menu item is the final button-card host. Extra escape layers belong to
// ancestor button-cards and must never become literal name/label text here.
function cardTextTemplate(value)
{
    const body = templateBody(value);
    if (body === null) return typeof value === 'string' && value.includes('[[[') ? 'Unavailable' : value;
    return `[[[ try { const text = (() => { ${body} })(); return text == null || (typeof text === 'string' && text.includes('[[[')) ? 'Unavailable' : text; } catch (_) { return 'Unavailable'; } ]]]`;
}

module.exports = { templateBody, cardTextTemplate };
