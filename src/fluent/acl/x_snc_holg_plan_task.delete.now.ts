import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['20aa90025cd546cebc1823650912a4ef'],
    description: 'Authors can delete Plan Task records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'delete',
    roles: ['x_snc_holg.author'],
    table: 'x_snc_holg_plan_task',
})
