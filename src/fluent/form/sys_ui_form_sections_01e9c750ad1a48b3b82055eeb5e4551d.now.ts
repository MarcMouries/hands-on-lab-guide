import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_evaluation_plan',
    view: default_view,
    sections: [
        {
            caption: 'Evaluation Plan',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'name',
                            type: 'table_field',
                        },
                    ],
                    rightElements: [
                        {
                            field: 'status',
                            type: 'table_field',
                        },
                        {
                            field: 'facilitator',
                            type: 'table_field',
                        },
                    ],
                },
                {
                    layout: 'one-column',
                    elements: [
                        {
                            field: 'description',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
