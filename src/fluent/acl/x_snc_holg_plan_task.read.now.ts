import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['86045587082e4d65b760c9730c420bcf'],
    description: 'Participants can read Plan Tasks only while the related Evaluation Plan is Published.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    script: `answer = false;
var sectionGr = current.plan_section.getRefRecord();
if (sectionGr && sectionGr.isValidRecord()) {
    var planGr = sectionGr.evaluation_plan.getRefRecord();
    if (planGr && planGr.isValidRecord()) {
        answer = planGr.getValue('status') == 'published';
    }
}`,
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_plan_task',
})
