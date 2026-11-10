import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b9474399afab42239083cef0be1d9978'],
    description: 'Only facilitators delete Criterion Responses.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    script: "answer = gs.hasRole('x_snc_holg.facilitator');",
    roles: ['x_snc_holg.facilitator'],
    table: 'x_snc_holg_criterion_response',
})
