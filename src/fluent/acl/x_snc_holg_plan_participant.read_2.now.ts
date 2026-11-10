import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['9695d9e510bc46d59f87987bd84f1458'],
    description: 'Facilitators can read Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_participant',
})
