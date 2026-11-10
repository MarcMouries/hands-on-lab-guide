import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_task_result',
    view: default_view,
    sections: [
        {
            caption: 'Task Result',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'plan_participant',
                            type: 'table_field',
                        },
                        {
                            field: 'plan_task',
                            type: 'table_field',
                        },
                        {
                            field: 'user',
                            type: 'table_field',
                        },
                    ],
                    rightElements: [
                        {
                            field: 'status',
                            type: 'table_field',
                        },
                        {
                            field: 'result',
                            type: 'table_field',
                        },
                        {
                            field: 'started_on',
                            type: 'table_field',
                        },
                        {
                            field: 'submitted_on',
                            type: 'table_field',
                        },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        {
                            field: 'feedback',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
