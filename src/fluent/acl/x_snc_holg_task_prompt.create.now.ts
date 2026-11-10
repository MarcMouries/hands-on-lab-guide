import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['2abfea47ff5249ff8934bf28c1abf675'],
    description: 'Facilitators can create Task Prompt records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_prompt',
})
