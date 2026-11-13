import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['1f393d9eb51c40c0b192775bc2d06212'],
    description: 'Authors can create Task Expectation records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_task_expectation',
})
