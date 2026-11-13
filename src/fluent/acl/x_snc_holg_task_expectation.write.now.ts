import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['110c92ca59da425c8f4e52a245b4397d'],
    description: 'Authors can update Task Expectation records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_task_expectation',
})
