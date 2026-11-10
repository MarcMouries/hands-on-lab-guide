import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_plan_participant',
    view: default_view,
    parent: 'x_snc_holg_evaluation_plan',
    columns: ['user', 'evaluation_plan', 'percent_complete', 'started_on', 'completed_on', 'status'],
})
