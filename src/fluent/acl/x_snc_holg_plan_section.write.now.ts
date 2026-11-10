import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['596594696f704a979f80376d621a2516'],
    description: 'Facilitators can update Plan Section records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_section',
})
