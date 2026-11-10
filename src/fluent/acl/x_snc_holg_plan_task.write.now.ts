import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['e2ae80dabda640ca97a138bb0f4a52c2'],
    description: 'Facilitators can update Plan Task records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_task',
})
