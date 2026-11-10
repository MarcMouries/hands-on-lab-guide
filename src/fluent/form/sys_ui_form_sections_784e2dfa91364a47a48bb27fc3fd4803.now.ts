import { default_view, Form } from '@servicenow/sdk/core'

Form({
    table: 'x_snc_holg_plan_task',
    view: default_view,
    sections: [
        {
            caption: 'Plan Task',
            content: [
                {
                    layout: 'two-column',
                    leftElements: [
                        {
                            field: 'plan_section',
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
                            field: 'description',
                            type: 'table_field',
                        },
                        {
                            field: 'scenario',
                            type: 'table_field',
                        },
                        {
                            field: 'how_to_test',
                            type: 'table_field',
                        },
                        {
                            field: 'dependency_note',
                            type: 'table_field',
                        },
                    ],
                },
            ],
        },
    ],
})
