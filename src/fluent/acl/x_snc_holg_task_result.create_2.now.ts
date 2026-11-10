import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['de12ad2d39ae4b1f9962da164d586fe8'],
    description: 'Facilitators can create Task Result records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_result',
})
