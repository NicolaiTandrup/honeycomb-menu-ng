// Match Light's preset-cell hierarchy locally. Radio's outer favorites keep
// their own descriptors and artwork styles.
function sonosButtonStyles(options = {})
{
    const styles = {
        grid: [
            { 'grid-template-areas': '"i" "n" "l"' },
            { 'grid-template-columns': '1fr' },
            { 'grid-template-rows': '43% 29% 28%' },
            { height: '100%' },
            { 'align-items': 'center' }
        ],
        icon: [{ width: '22px' }, { 'align-self': 'end' }, { color: '#f6f7f9' }],
        name: [
            { 'font-size': '11px' }, { 'font-weight': '650' },
            { 'line-height': '1' }, { 'align-self': 'center' },
            { color: '#f6f7f9' }, { 'white-space': 'nowrap' },
            { overflow: 'hidden' }, { 'text-overflow': 'ellipsis' }
        ],
        label: [
            { 'font-size': '8px' }, { 'line-height': '1' },
            { 'align-self': 'start' }, { 'padding-top': '1px' },
            { color: 'rgba(246,247,249,0.82)' }, { 'white-space': 'nowrap' },
            { overflow: 'hidden' }, { 'text-overflow': 'ellipsis' }
        ]
    };
    if (options.background) styles.card = [{ background: options.background }];
    return styles;
}

module.exports = { sonosButtonStyles };
