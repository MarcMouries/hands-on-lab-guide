import { Record } from '@servicenow/sdk/core'

Record({
    $id: Now.ID['b88da55489ad451e94bbc77b81f22560'],
    table: 'sys_app_module',
    data: {
        active: true,
        application: '93fd834ebd6742c8ba2ea1f948380390',
        hint: 'All plan participants',
        link_type: 'LIST',
        mobile_view_name: 'Mobile',
        name: 'x_snc_holg_plan_participant',
        order: 600,
        override_menu_roles: false,
        require_confirmation: true,
        roles: ['x_snc_holg.facilitator'],
        sys_domain: 'global',
        sys_domain_path: '/',
        title: 'Plan Participants',
        uncancelable: false,
    },
})
