import { IntegerColumn, MultiLineTextColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_plan_section = Table({
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
    display: 'title',
    label: 'Plan Section',
    name: 'x_snc_holg_plan_section',
    schema: {
        evaluation_plan: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_evaluation_plan',
        }),
        order: IntegerColumn({
            default: '100',
            maxLength: 0,
        }),
        overview: MultiLineTextColumn({
            maxLength: 4000,
        }),
        title: StringColumn({
            mandatory: true,
            maxLength: 120,
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'evaluation_plan',
        },
    ],
    dbObjectId: true,
})
