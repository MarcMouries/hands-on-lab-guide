import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['6d1069bd310744bc81446f750a9dd839'],
    description: 'Participants can read only their own Plan Participant records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    script: "answer = current.getValue('user') == gs.getUserID();",
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_plan_participant',
})
