import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_plan_participant',
    view: default_view,
    columns: ['completed_on', 'evaluation_plan', 'percent_complete', 'started_on', 'status', 'user'],
})
