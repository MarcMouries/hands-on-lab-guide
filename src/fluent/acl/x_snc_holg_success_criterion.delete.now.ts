import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['dba2f8721a0a4e71929f61f4e378c1d4'],
    description: 'Authors can delete Success Criterion records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_success_criterion',
})
