import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['49a84df2312a4c328565aa61e9bcbaf6'],
    description: 'Facilitators can update Task Result records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_result',
})
