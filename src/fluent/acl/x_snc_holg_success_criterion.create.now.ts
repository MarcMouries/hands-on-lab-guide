import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['ea7ee063062f43088027da21b833455c'],
    description: 'Authors can create Success Criterion records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_success_criterion',
})
