import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_plan_section',
    view: default_view,
    parent: 'x_snc_holg_evaluation_plan',
    columns: ['title', 'evaluation_plan', 'overview', 'order'],
})
