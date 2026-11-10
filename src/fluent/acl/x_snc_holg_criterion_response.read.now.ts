import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['97f6efdc513b443899b41be52084d489'],
    description:
        'Facilitators read every Criterion Response; participants read only rows whose Task Result belongs to them.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
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
