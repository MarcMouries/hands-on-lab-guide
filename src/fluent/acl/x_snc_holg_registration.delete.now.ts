import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['d3ea31308496418eb22b5038f20ff0c4'],
    description: 'Facilitators can delete Lab Registration records, which is how personal data is purged.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_registration',
})
