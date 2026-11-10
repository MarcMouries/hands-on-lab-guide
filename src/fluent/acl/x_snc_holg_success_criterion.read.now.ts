import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['5e64164b294d418c9168c76009c36c72'],
    description: 'Facilitators can read Success Criterion records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_success_criterion',
})
