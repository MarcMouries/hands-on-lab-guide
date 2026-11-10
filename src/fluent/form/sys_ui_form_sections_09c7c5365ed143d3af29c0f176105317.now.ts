import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_plan_section',
    view: default_view,
    sections: [
        {
            caption: 'Plan Section',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'evaluation_plan',
                            type: 'table_field',
                        },
                        {
                            field: 'title',
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
                            field: 'overview',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
