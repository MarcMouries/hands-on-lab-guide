import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['6b4f57630b5540fe9e48c668b06e81a9'],
    description: 'Facilitators can read Evaluation Plan records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.facilitator', 'x_snc_holg.author'],
    table: 'x_snc_holg_evaluation_plan',
})
