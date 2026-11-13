import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['6e05860f0c9f451d9adf3f351e0ee65e'],
    description: 'Authors and facilitators can update Lab Event records, including opening and closing them.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.author', 'x_snc_holg.facilitator'],
    table: 'x_snc_holg_event',
})
