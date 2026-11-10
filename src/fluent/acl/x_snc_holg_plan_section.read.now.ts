import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['3d24b5efe35b44a894c3a278a3de19d3'],
    description: 'Facilitators can read Plan Section records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_section',
})
