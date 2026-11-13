import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b8e0174a59c3433480230105755cfe56'],
    description: 'Facilitators can read Plan Task records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator', 'x_snc_holg.author'],
    table: 'x_snc_holg_plan_task',
})
