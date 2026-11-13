import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['0e31cd8ee6444365888095d7f4c00a9b'],
    description: 'Authors can delete Task Expectation records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_task_expectation',
})
