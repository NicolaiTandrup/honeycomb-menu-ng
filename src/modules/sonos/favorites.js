const { accentTemplate } = require('./station.js');

function buildRadioMenu(item)
{
    const favorites = item.favorites_sensor || 'sensor.sonos_favorites';
    const cache = item.favorites_cache_sensor || 'sensor.sonos_favorites_cache';

    return {
        entity: item.entity,
        nested_expand: true,
        inherit_inner: true,
        empty_slots: 'hidden',
        idle_timeout: 0,
        buttons: Array.from({ length: 12 }, (_, index) => ({
            slot: index + 7,
            slot_mode: 'hard',
            colors: { inner_border: accentTemplate(favorites, index) },
            entity: favorites,
            show: `[[[
                const items = states['${favorites}']?.attributes?.items || {};
                return Object.keys(items).length > ${index};
            ]]]`,
            icon: 'mdi:radio',
            show_icon: true,
            show_name: true,
            name: `[[[
                const items = states['${favorites}']?.attributes?.items || {};
                return Object.values(items)[${index}] || '';
            ]]]`,
            autoclose: true,
            styles: {
                card: [
                    { background: 'rgba(52, 66, 78, 0.92)' },
                    {
                        'background-image': `[[[
                            const base = states['${favorites}']?.attributes?.items || {};
                            const id = Object.keys(base)[${index}];
                            const cached = states['${cache}']?.attributes?.items || [];
                            const match = cached.find(x => x?.media_content_id === id);
                            const thumb = match?.thumbnail || '';
                            return thumb ? 'url("' + thumb + '")' : 'none';
                        ]]]`
                    },
                    { 'background-position': 'center' },
                    { 'background-repeat': 'no-repeat' },
                    { 'background-size': '56% auto' },
                    { border: '1px solid rgba(75, 180, 200, 0.22)' }
                ],
                icon: [
                    { width: '17px' },
                    { 'align-self': 'end' },
                    {
                        display: `[[[
                            const base = states['${favorites}']?.attributes?.items || {};
                            const id = Object.keys(base)[${index}];
                            const cached = states['${cache}']?.attributes?.items || [];
                            const match = cached.find(x => x?.media_content_id === id);
                            return match?.thumbnail ? 'none' : 'block';
                        ]]]`
                    }
                ],
                name: [
                    { 'align-self': 'start' },
                    { 'font-size': '9px' },
                    { 'font-weight': '600' },
                    { 'white-space': 'nowrap' },
                    { overflow: 'hidden' },
                    { 'text-overflow': 'ellipsis' },
                    {
                        display: `[[[
                            const base = states['${favorites}']?.attributes?.items || {};
                            const id = Object.keys(base)[${index}];
                            const cached = states['${cache}']?.attributes?.items || [];
                            const match = cached.find(x => x?.media_content_id === id);
                            return match?.thumbnail ? 'none' : 'block';
                        ]]]`
                    }
                ]
            },
            tap_action: {
                action: 'perform-action',
                perform_action: 'media_player.play_media',
                target: { entity_id: item.entity },
                data: {
                    media_content_id: `[[[
                        const items = states['${favorites}']?.attributes?.items || {};
                        return Object.keys(items)[${index}] || '';
                    ]]]`,
                    media_content_type: 'favorite_item_id'
                }
            }
        }))
    };
}

module.exports = {
    buildRadioMenu
};
