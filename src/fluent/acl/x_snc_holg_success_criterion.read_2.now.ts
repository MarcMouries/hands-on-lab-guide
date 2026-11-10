import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['b95da745851548f5b32adcdc8f31accd'],
    description: 'Participants can read Success Criteria only while the related Evaluation Plan is Published.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    script: `answer = false;
var taskGr = current.plan_task.getRefRecord();
if (taskGr && taskGr.isValidRecord()) {
    var sectionGr = taskGr.plan_section.getRefRecord();
    if (sectionGr && sectionGr.isValidRecord()) {
        var planGr = sectionGr.evaluation_plan.getRefRecord();
        if (planGr && planGr.isValidRecord()) {
            answer = planGr.getValue('status') == 'published';
        }
    }
}`,
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_success_criterion',
})
