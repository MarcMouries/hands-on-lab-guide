import { ChoiceColumn, ReferenceColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_criterion_response = Table({
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
    callerAccess: 'tracking',
    label: 'Criterion Response',
    name: 'x_snc_holg_criterion_response',
    schema: {
        answer: ChoiceColumn({
            dropdown: 'dropdown_with_none',
            maxLength: 40,
            choices: {
                yes: {
                    label: 'Yes',
                    sequence: 100,
                },
                no: {
                    label: 'No',
                    sequence: 200,
                },
            },
        }),
        success_criterion: ReferenceColumn({
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_success_criterion',
        }),
        task_result: ReferenceColumn({
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_task_result',
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'success_criterion',
        },
        {
            name: 'index2',
            unique: false,
            element: 'task_result',
        },
    ],
    dbObjectId: true,
})
