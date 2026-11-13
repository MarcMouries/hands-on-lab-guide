import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['08266a9dca3d4e0195085dcf339a0d69'],
    description: 'Facilitators and authors can read Task Expectation records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator', 'x_snc_holg.author'],
    table: 'x_snc_holg_task_expectation',
})
