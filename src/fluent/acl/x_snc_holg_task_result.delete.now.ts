import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['c99ecd4d10f649b8a742f31e3363de81'],
    description: 'Facilitators can delete Task Result records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_result',
})
