import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['f33f5774ead6468fae29cea89786f722'],
    description: 'Only the admin role or x_snc_holg.facilitator may change the Facilitator on an Evaluation Plan.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_evaluation_plan',
    field: 'facilitator',
})
