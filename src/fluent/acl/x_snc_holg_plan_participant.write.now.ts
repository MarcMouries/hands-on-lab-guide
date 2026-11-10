import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['53832fc081904f21b2cdd70fab655681'],
    description: 'Participants can update only their own Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    script: "answer = current.getValue('user') == gs.getUserID();",
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_plan_participant',
})
