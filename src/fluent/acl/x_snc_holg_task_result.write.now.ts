import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['4188732df50540f9ba3354d497b8e4f0'],
    description: 'Participants can update only their own Task Results, and not once the stored Status is Submitted.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'write',
    script: `answer = false;
if (current.getValue('user') == gs.getUserID()) {
    var storedStatus = 'not_started';
    if (!current.isNewRecord()) {
        var resultGr = new GlideRecord('x_snc_holg_task_result');
        if (resultGr.get(current.getUniqueValue())) {
            storedStatus = resultGr.getValue('status');
        }
    }
    answer = storedStatus != 'submitted';
}`,
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_task_result',
})
