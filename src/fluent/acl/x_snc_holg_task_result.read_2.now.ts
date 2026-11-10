import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['680245c05ea34488bdca208a3f9da8be'],
    description: 'Facilitators can read Task Result records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_result',
})
