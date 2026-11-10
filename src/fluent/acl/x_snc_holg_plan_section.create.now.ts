import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['29a32680c97f43058df92b905a7afee5'],
    description: 'Facilitators can create Plan Section records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_plan_section',
})
