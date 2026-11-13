import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['f33f5774ead6468fae29cea89786f722'],
    description:
        'Authors set the Facilitator from the authoring UI; facilitators and admins can change it on the form.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator', 'x_snc_holg.author'],
    table: 'x_snc_holg_evaluation_plan',
    field: 'facilitator',
})
