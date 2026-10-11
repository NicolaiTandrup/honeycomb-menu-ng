const media = require('../media/index.js');

function actionForScript(script, fallbackService, entity)
{
    if( script )
    {
        return {
            action: 'perform-action',
            perform_action: script
        };
    }

    return {
        action: 'perform-action',
        perform_action: fallbackService,
        target: entity ? { entity_id: entity } : undefined
    };
}

function buildJoinMenu(item)
{
    const members = Array.isArray(item.members) ? item.members : [];

    if( members.length === 0 || ! item.toggle_member_script )
        return null;

    return {
        entity: item.entity,
        nested_expand: true,
        inherit_inner: true,
        empty_slots: 'hidden',
        idle_timeout: 0,
        buttons: members.slice(0, 12).map((member, index) => ({
            slot: index + 7,
            slot_mode: 'hard',
            entity: member.entity,
            icon: member.icon || (
                member.entity && member.entity.includes('tv')
                    ? 'mdi:television-speaker'
                    : 'mdi:speaker'
            ),
            name: member.name || '',
            show_name: true,
            autoclose: false,
            styles: {
                card: [
                    {
                        background: `[[[
                            const members = states['${item.entity}']?.attributes?.group_members || [];
                            return members.includes('${member.entity}')
                                ? 'rgba(45, 105, 116, 0.96)'
                                : 'rgba(52, 66, 78, 0.92)';
                        ]]]`
                    },
                    { border: '1px solid rgba(75, 180, 200, 0.20)' }
                ],
                icon: [
                    { width: '18px' },
                    { 'align-self': 'end' }
                ],
                name: [
                    { 'align-self': 'start' },
                    { 'font-size': '9px' },
                    { 'font-weight': '700' }
                ]
            },
            tap_action: {
                action: 'perform-action',
                perform_action: item.toggle_member_script,
                data: { member: member.entity }
            }
        }))
    };
}

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
            entity: favorites,
            show: `[[[
                const items = states['${favorites}']?.attributes?.items || {};
                return Object.keys(items).length > ${index};
            ]]]`,
            icon: 'mdi:radio',
            show_icon: `[[[
                const base = states['${favorites}']?.attributes?.items || {};
                const id = Object.keys(base)[${index}];
                const cached = states['${cache}']?.attributes?.items || [];
                const match = cached.find(x => x?.media_content_id === id);
                return !Boolean(match?.thumbnail);
            ]]]`,
            show_name: `[[[
                const base = states['${favorites}']?.attributes?.items || {};
                const id = Object.keys(base)[${index}];
                const cached = states['${cache}']?.attributes?.items || [];
                const match = cached.find(x => x?.media_content_id === id);
                return !Boolean(match?.thumbnail);
            ]]]`,
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
}

function buildMenu({ item })
{
    const joinMenu = buildJoinMenu(item);
    const radioMenu = buildRadioMenu(item);

    const playPauseIcon = `[[[
        return entity?.state === 'playing' ? 'mdi:pause' : 'mdi:play';
    ]]]`;

    const playPauseName = `[[[
        return entity?.state === 'playing' ? 'Pause' : 'Play';
    ]]]`;

    const playPauseLabel = `[[[
        const channel = entity?.attributes?.media_channel;
        const title = entity?.attributes?.media_title;
        if( channel && title ) return channel + ' · ' + title;
        return title || channel || '';
    ]]]`;

    const joinedLabel = `[[[
        const members = states['${item.entity}']?.attributes?.group_members || [];
        const joined = members.filter(x => x !== '${item.entity}');
        return joined.length ? joined.length + ' joined' : 'Solo';
    ]]]`;

    return {
        entity: item.entity,
        nested_expand: true,
        promote_to_center: true,
        promoted_center: {
            entity: item.entity,
            icon: item.icon || 'mdi:speaker',
            mode: 'media',
            show_brightness: 'never',
            show_volume: 'when_playing',
            active_color: item.active_color || item.color || '#00bcd4',
            colors: {
                center: 'auto',
                inner_border: 'auto',
                outer_border: '#34383d'
            }
        },
        empty_slots: 'hidden',
        idle_timeout: 8000,
        buttons: [
            {
                slot: 1,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:volume-minus',
                name: 'Vol',
                show_name: true,
                autoclose: false,
                tap_action: item.group_volume_down_script
                    ? actionForScript(
                        item.group_volume_down_script,
                        'media_player.volume_down',
                        item.entity
                    )
                    : {
                        action: 'honeycomb-media-volume',
                        direction: 'down',
                        entity: item.entity
                    }
            },
            {
                slot: 2,
                slot_mode: 'hard',
                entity: item.entity,
                icon: playPauseIcon,
                name: playPauseName,
                label: playPauseLabel,
                show_name: true,
                show_label: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'media_player.media_play_pause',
                    target: { entity_id: item.entity }
                }
            },
            {
                slot: 3,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:speaker-multiple',
                name: 'Join',
                label: joinedLabel,
                show_name: true,
                show_label: true,
                autoclose: false,
                styles: {
                    card: [
                        { background: 'rgba(126, 54, 96, 0.82)' }
                    ]
                },
                tap_action: joinMenu
                    ? {
                        action: 'honeycomb-open-nested',
                        honeycomb_nested_menu: joinMenu
                    }
                    : { action: 'more-info' }
            },
            {
                slot: 4,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:volume-plus',
                name: 'Vol',
                show_name: true,
                autoclose: false,
                tap_action: item.group_volume_up_script
                    ? actionForScript(
                        item.group_volume_up_script,
                        'media_player.volume_up',
                        item.entity
                    )
                    : {
                        action: 'honeycomb-media-volume',
                        direction: 'up',
                        entity: item.entity
                    }
            },
            {
                slot: 5,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:star',
                name: 'Radio',
                show_name: true,
                autoclose: false,
                styles: {
                    card: [
                        { background: 'rgba(108, 62, 78, 0.82)' }
                    ]
                },
                tap_action: {
                    action: 'honeycomb-open-nested',
                    honeycomb_nested_menu: radioMenu
                }
            },
            {
                slot: 6,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:folder-music',
                name: 'Browse',
                show_name: true,
                autoclose: false,
                tap_action: { action: 'more-info' }
            }
        ]
    };
}

module.exports = {
    id: 'sonos',
    aliases: ['media-sonos'],
    priority: 400,

    // Backwards compatible: existing type: media continues to mean the
    // Sonos-oriented module unless the user explicitly selects module: media.
    matches(item)
    {
        return (
            item.type === 'sonos' ||
            (
                item.type === 'media' &&
                item.module !== 'media'
            )
        );
    },

    buildMenu,

    buildLauncher(context)
    {
        return media.buildLauncher(context);
    }
};
