import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['cdacb395acf64fe2a5c60d75e2741cb9'],
    description: 'Participants can create a Plan Participant record only for themselves.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    script: "answer = current.getValue('user') == gs.getUserID();",
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_plan_participant',
})
