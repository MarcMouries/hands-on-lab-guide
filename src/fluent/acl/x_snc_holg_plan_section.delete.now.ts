import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['4ac11e6c66ed40568488016480de3e55'],
    description: 'Facilitators can delete Plan Section records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_section',
})
