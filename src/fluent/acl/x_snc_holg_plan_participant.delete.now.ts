import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['f17fdf9a354b4bcebea417a94f05637c'],
    description: 'Facilitators can delete Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_participant',
})
