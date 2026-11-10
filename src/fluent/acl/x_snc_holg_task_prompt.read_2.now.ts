import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['c4a7dff3159a4acc821391f86e20f4c8'],
    description: 'Facilitators can read Task Prompt records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_task_prompt',
})
