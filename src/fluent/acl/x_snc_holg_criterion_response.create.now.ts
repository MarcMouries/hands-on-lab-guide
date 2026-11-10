import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['52b4621d0d5b4805984a65dd75a9a7f7'],
    description:
        'Participants create answers only on their own Task Result. Not gated on submission: the checklist stays editable after the verdict is final.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'create',
    script: `answer = false;
if (gs.hasRole('x_snc_holg.facilitator')) {
    answer = true;
} else {
    var resultId = current.getValue('task_result');
    if (resultId) {
        var tr = new GlideRecord('x_snc_holg_task_result');
        if (tr.get(resultId)) {
            answer = tr.getValue('user') == gs.getUserID();
        }
    }
}`,
    roles: ['x_snc_holg.participant', 'x_snc_holg.facilitator'],
    table: 'x_snc_holg_criterion_response',
})
