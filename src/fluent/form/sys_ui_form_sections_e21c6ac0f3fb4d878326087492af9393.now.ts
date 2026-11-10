import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_criterion_response',
    view: default_view,
    sections: [
        {
            caption: 'Criterion Response',
            content: [
                {
                    layout: 'one-column',
                    elements: [
                        {
                            field: 'task_result',
                            type: 'table_field',
                        },
                        {
                            field: 'success_criterion',
                            type: 'table_field',
                        },
                        {
                            field: 'answer',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
