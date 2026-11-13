import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['32c990e73d7a46549115aa412ddc0763'],
    description: 'Facilitators and authors can read Lab Event records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator', 'x_snc_holg.author'],
    table: 'x_snc_holg_event',
})
