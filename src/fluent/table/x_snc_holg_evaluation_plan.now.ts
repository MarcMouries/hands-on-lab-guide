import { ChoiceColumn, MultiLineTextColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_evaluation_plan = Table({
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
    display: 'name',
    label: 'Evaluation Plan',
    name: 'x_snc_holg_evaluation_plan',
    schema: {
        description: MultiLineTextColumn({
            maxLength: 4000,
        }),
        facilitator: ReferenceColumn({
            cascadeRule: 'none',
            maxLength: 32,
            referenceTable: 'sys_user',
        }),
        name: StringColumn({
            mandatory: true,
            maxLength: 120,
        }),
        status: ChoiceColumn({
            default: 'draft',
            dropdown: 'dropdown_without_none',
            maxLength: 40,
            choices: {
                draft: {
                    label: 'Draft',
                    sequence: 1,
                },
                published: {
                    label: 'Published',
                    sequence: 2,
                },
                closed: {
                    label: 'Closed',
                    sequence: 3,
                },
            },
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'facilitator',
        },
    ],
    dbObjectId: true,
})
