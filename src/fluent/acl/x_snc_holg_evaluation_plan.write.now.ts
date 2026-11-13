import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b99ae1fa294f47798ff10e28ec4358a5'],
    description: 'Authors can update Evaluation Plan records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_evaluation_plan',
})
