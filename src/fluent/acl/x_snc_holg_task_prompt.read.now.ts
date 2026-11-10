import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['69fc31cc6e5c4b7cba5886a7e8a5b236'],
    description: 'Participants can read Task Prompts only while the related Evaluation Plan is Published.',
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
    table: 'x_snc_holg_task_prompt',
})
