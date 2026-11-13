import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['74cd3af7913144689fb270cade17bd30'],
    description: 'Authors can create Evaluation Plan records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_evaluation_plan',
})
