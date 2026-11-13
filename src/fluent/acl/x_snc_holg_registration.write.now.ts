import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['8ddfe64d478341f38b567b5e928e1b93'],
    description: 'Facilitators can update Lab Registration records, to retry a failure.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_registration',
})
