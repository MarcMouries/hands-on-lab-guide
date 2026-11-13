import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['596594696f704a979f80376d621a2516'],
    description: 'Authors can update Plan Section records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_plan_section',
})
