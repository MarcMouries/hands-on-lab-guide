import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['d9966233c8824560a77afb6ae2843a0c'],
    description: 'Authors can delete Lab Event records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_event',
})
