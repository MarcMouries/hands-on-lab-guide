import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_plan_section',
    view: default_view,
    columns: ['evaluation_plan', 'order', 'overview', 'title'],
})
