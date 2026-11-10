import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['559e1d24ae04495a93aaf93a06544bd3'],
    description: 'Facilitators can update Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_participant',
})
