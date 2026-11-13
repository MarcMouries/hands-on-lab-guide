import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['60f49ad0b0fb4b938ed2d3ffe86773e2'],
    description: 'Authors can update Task Prompt records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_task_prompt',
})
