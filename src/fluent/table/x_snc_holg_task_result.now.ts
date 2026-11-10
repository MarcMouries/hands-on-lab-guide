import { ChoiceColumn, DateTimeColumn, MultiLineTextColumn, ReferenceColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_task_result = Table({
    actions: {
        read: true,
        update: true,
        delete: true,
        create: true,
    },
    allowClientScripts: false,
    allowConfiguration: false,
    allowNewFields: false,
    allowUiActions: false,
    allowWebServiceAccess: true,
    audit: true,
    callerAccess: 'tracking',
    display: 'plan_task',
    label: 'Task Result',
    name: 'x_snc_holg_task_result',
    schema: {
        feedback: MultiLineTextColumn({
            maxLength: 4000,
        }),
        plan_participant: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_plan_participant',
        }),
        plan_task: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_plan_task',
        }),
        result: ChoiceColumn({
            dropdown: 'dropdown_with_none',
            maxLength: 40,
            choices: {
                pass: {
                    label: 'Pass',
                    sequence: 1,
                },
                fail: {
                    label: 'Fail',
                    sequence: 2,
                },
            },
        }),
        started_on: DateTimeColumn({
            label: 'Started on',
            maxLength: 40,
        }),
        status: ChoiceColumn({
            default: 'not_started',
            dropdown: 'dropdown_without_none',
            maxLength: 40,
            choices: {
                not_started: {
                    label: 'Not started',
                    sequence: 1,
                },
                in_progress: {
                    label: 'In progress',
                    sequence: 2,
                },
                submitted: {
                    label: 'Submitted',
                    sequence: 3,
                },
            },
        }),
        submitted_on: DateTimeColumn({
            label: 'Submitted on',
            maxLength: 40,
        }),
        user: ReferenceColumn({
            cascadeRule: 'none',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'sys_user',
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'plan_participant',
        },
        {
            name: 'index2',
            unique: false,
            element: 'plan_task',
        },
        {
            name: 'index3',
            unique: false,
            element: 'user',
        },
    ],
    dbObjectId: true,
})
