import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['65692bf6f82a4a5faeae70611a3a336a'],
    description: 'Authors can delete Task Prompt records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_task_prompt',
})
