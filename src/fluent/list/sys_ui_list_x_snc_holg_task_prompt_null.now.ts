import { default_view, List } from '@servicenow/sdk/core'

List({
    table: 'x_snc_holg_task_prompt',
    view: default_view,
    columns: ['plan_task', 'label', 'prompt_text', 'order'],
})
