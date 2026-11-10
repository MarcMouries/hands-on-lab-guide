import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_task_prompt',
    view: default_view,
    sections: [
        {
            caption: 'Task Prompt',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'plan_task',
                            type: 'table_field',
                        },
                        {
                            field: 'label',
                            type: 'table_field',
                        },
                    ],
                    rightElements: [
                        {
                            field: 'order',
                            type: 'table_field',
                        },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        {
                            field: 'prompt_text',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
