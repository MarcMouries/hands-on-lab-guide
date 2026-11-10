import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['c906c081160a46899fb4007e702a4115'],
    description: 'Facilitators can create Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_participant',
})
