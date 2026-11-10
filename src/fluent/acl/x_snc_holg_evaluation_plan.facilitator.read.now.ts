import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['0a462215a67f4f898a8003567926ddad'],
    description: 'Both app roles can see who the Facilitator is; only facilitators and admins can change it.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.participant', 'x_snc_holg.facilitator'],
    table: 'x_snc_holg_evaluation_plan',
    field: 'facilitator',
})
