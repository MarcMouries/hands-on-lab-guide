import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['5a33a2290b104617a3aa5c03c313bdb5'],
    description: 'Participants can read Plan Sections only while the related Evaluation Plan is Published.',
    localOrExisting: 'Existing',
    type: 'record',
    operation: 'read',
    script: `answer = false;
var planGr = current.evaluation_plan.getRefRecord();
if (planGr && planGr.isValidRecord()) {
    answer = planGr.getValue('status') == 'published';
}`,
    roles: ['x_snc_holg.participant'],
    table: 'x_snc_holg_plan_section',
})
