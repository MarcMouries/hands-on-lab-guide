import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['33f62889dd004f7b914d509203517c6c'],
    condition: 'status=published',
    description: 'Participants can read Evaluation Plans only while the plan is Published.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_evaluation_plan',
})
