import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_success_criterion',
    view: default_view,
    sections: [
        {
            caption: 'Success Criterion',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'plan_task',
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
                            field: 'criterion',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
