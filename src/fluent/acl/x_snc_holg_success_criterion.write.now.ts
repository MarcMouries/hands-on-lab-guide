import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b2d0b79311ff46f19ed7a095616954ae'],
    description: 'Facilitators can update Success Criterion records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_success_criterion',
})
