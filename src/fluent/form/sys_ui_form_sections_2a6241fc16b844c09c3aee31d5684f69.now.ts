import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_plan_participant',
    view: default_view,
    sections: [
        {
            caption: 'Plan Participant',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'evaluation_plan',
                            type: 'table_field',
                        },
                        {
                            field: 'user',
                            type: 'table_field',
                        },
                        {
                            field: 'status',
                            type: 'table_field',
                        },
                    ],
                    rightElements: [
                        {
                            field: 'percent_complete',
                            type: 'table_field',
                        },
                        {
                            field: 'started_on',
                            type: 'table_field',
                        },
                        {
                            field: 'completed_on',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
