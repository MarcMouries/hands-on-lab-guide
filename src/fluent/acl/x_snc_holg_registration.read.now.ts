import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['2d02f28190504fcf8ac16cc1fa90ce67'],
    description: 'Only facilitators can read Lab Registration records - they hold names and email addresses.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_registration',
})
