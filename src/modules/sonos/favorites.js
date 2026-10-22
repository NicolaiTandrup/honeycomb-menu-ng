const { accentTemplate,settings } = require('./station.js');
const {validThumbnail} = require('./artwork');
const {browseItems,provider} = require('./native-favorites');
const {artworkLayout} = require('../../core/cube-presentation');

function buildRadioMenu(item)
{
    const favorites = item.favorites_sensor || 'sensor.sonos_favorites';
    const options = settings(item);

    const menu = {
        entity: item.entity,
        nested_expand: true,
        inherit_inner: true,
        empty_slots: 'hidden',
        _navigation_sibling: {group: `sonos:${item.entity}`, id: 'radio'},
        buttons: Array.from({ length: 12 }, (_, index) => ({
            mode: 'sonos-favorite',
            _sonos: options,
            _favoriteIndex: index,
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
                    { 'background-position': 'center' },
                    { 'background-repeat': 'no-repeat' },
                    { 'background-size': '56% auto' },
                    { border: '1px solid rgba(75, 180, 200, 0.22)' }
                ],
                icon: [
                    { width: '17px' },
                    { 'align-self': 'end' }
                ],
                name: [
                    { 'align-self': 'start' },
                    { 'font-size': '9px' },
                    { 'font-weight': '600' },
                    { 'white-space': 'nowrap' },
                    { overflow: 'hidden' },
                    { 'text-overflow': 'ellipsis' }
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
    return menu;
}

function resolveFavorite({hass,config,runtime={}})
{
    const options = config._sonos || settings({}), states = hass && hass.states || {};
    const map = (states[options.favorites] && states[options.favorites].attributes || {}).items || {};
    const id = Object.keys(map)[config._favoriteIndex];
    const matches = browseItems(hass,config).filter(item => item && item.media_content_id === id);
    const favorite = matches.length === 1 ? matches[0] : null;
    const key = JSON.stringify([id,favorite,provider.peek(hass,config).version]);
    const usable = favorite && validThumbnail(favorite.thumbnail) && key !== runtime.failedArtworkKey;
    return {colors:{center:'rgba(52, 66, 78, 0.92)',inner:'#34383d',outer:'#34383d'},secondary:null,
        ...(usable ? {name:'',artwork:{url:favorite.thumbnail,key,style:{...artworkLayout({scale:56/62}),top:'22%'}}} : {})};
}

module.exports = {
    buildRadioMenu, resolveFavorite
};
