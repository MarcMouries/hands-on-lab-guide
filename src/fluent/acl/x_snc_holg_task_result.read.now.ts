import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['3bcd06de5ce84baaaa3326b9e2ef4e1e'],
    description: 'Participants can read only their own Task Result records.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    script: "answer = current.getValue('user') == gs.getUserID();",
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_task_result',
})
