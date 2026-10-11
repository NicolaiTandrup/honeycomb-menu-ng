const { persistentLauncher } = require('../shared.js');

function playPauseIcon()
{
    return `[[[
        return entity?.state === 'playing' ? 'mdi:pause' : 'mdi:play';
    ]]]`;
}

function playPauseName()
{
    return `[[[
        return entity?.state === 'playing' ? 'Pause' : 'Play';
    ]]]`;
}

function buildMenu({ item })
{
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
                tap_action: {
                    action: 'honeycomb-media-volume',
                    direction: 'down',
                    entity: item.entity
                }
            },
            {
                slot: 2,
                slot_mode: 'hard',
                entity: item.entity,
                icon: playPauseIcon(),
                name: playPauseName(),
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'perform-action',
                    perform_action: 'media_player.media_play_pause',
                    target: { entity_id: item.entity }
                }
            },
            {
                slot: 4,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:volume-plus',
                name: 'Vol',
                show_name: true,
                autoclose: false,
                tap_action: {
                    action: 'honeycomb-media-volume',
                    direction: 'up',
                    entity: item.entity
                }
            },
            {
                slot: 6,
                slot_mode: 'hard',
                entity: item.entity,
                icon: 'mdi:dots-horizontal',
                name: 'More',
                show_name: true,
                autoclose: false,
                tap_action: { action: 'more-info' }
            }
        ]
    };
}

function buildLauncher({ item, index, slot, submenu })
{
    return persistentLauncher({
        item,
        index,
        slot,
        submenu,
        mode: 'media',
        fallbackIcon: 'mdi:speaker',
        tapAction: {
            action: 'perform-action',
            perform_action: 'media_player.media_play_pause',
            target: { entity_id: item.entity }
        },
        extra: {
            show_brightness: 'never',
            show_volume: 'when_playing',
            active_color: item.active_color || item.color || '#00bcd4',
            colors: {
                center: 'auto',
                inner_border: 'auto',
                outer_border: '#34383d'
            }
        }
    });
}

module.exports = {
    id: 'media',
    aliases: ['generic-media'],
    priority: 100,

    matches(item)
    {
        return item.type === 'media-generic' || item.module === 'media';
    },

    buildMenu,
    buildLauncher
};
