import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_evaluation_plan',
    view: default_view,
    columns: ['name', 'description', 'status'],
})
