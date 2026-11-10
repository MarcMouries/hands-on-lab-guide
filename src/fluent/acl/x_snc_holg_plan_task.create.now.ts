import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['dc78e856d00c4f9d96b5a7cc55924338'],
    description: 'Facilitators can create Plan Task records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_task',
})
