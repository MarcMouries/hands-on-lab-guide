import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b89ef4f5dd9e434ba7afb4bed20b4d21'],
    description: 'Authors can delete Evaluation Plan records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_evaluation_plan',
})
