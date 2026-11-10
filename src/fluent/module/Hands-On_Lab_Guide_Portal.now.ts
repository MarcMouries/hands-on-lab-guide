import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['55d34c10b06c4592917a43b902fd09d3'],
    table: 'sys_app_module',
    data: {
        active: true,
        application: '93fd834ebd6742c8ba2ea1f948380390',
        hint: 'Open the Hands-On Lab Guide Service Portal in a new tab',
        link_type: 'DIRECT',
        mobile_view_name: 'Mobile',
        order: 50,
        override_menu_roles: false,
        query: '/holg',
        require_confirmation: true,
        roles: ['x_snc_holg.facilitator'],
        sys_domain: 'global',
        sys_domain_path: '/',
        title: 'Hands-On Lab Guide Portal ➚',
        uncancelable: false,
        window_name: '_blank',
    },
})
