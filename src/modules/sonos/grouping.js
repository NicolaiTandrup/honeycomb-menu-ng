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

module.exports = {
    buildJoinMenu
};
