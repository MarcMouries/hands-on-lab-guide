import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['3e3a4cb955654ce2bc28542972fe8d43'],
    description:
        'Lets a participant create their own Task Result row (POST /tasks/{task_id}/result). Own row only; later writes stay governed by the existing own-row write ACL.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    script: `answer = false;
if (current.getValue('user') == gs.getUserID()) {
    var participantId = current.getValue('plan_participant');
    if (participantId) {
        // Plain GlideRecord: a secure read here would recurse into ACL evaluation
        var pp = new GlideRecord('x_snc_holg_plan_participant');
        if (pp.get(participantId)) {
            answer = pp.getValue('user') == gs.getUserID();
        }
    }
}`,
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_task_result',
})
