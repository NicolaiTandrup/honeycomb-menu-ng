const media = require('../media/index.js');
const { buildJoinMenu } = require('./grouping.js');
const { buildRadioMenu } = require('./favorites.js');

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
