import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['3ae653d8ec7245bab547f53e8e2457b6'],
    description: 'Authors can create Lab Event records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_event',
})
