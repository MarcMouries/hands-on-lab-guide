import { IntegerColumn, MultiLineTextColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_plan_task = Table({
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
    label: 'Plan Task',
    name: 'x_snc_holg_plan_task',
    schema: {
        dependency_note: MultiLineTextColumn({
            label: 'Dependency note',
            maxLength: 4000,
        }),
        description: MultiLineTextColumn({
            maxLength: 4000,
        }),
        how_to_test: MultiLineTextColumn({
            label: 'How to test',
            maxLength: 4000,
        }),
        order: IntegerColumn({
            default: '100',
            maxLength: 0,
        }),
        plan_section: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_plan_section',
        }),
        scenario: MultiLineTextColumn({
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
            element: 'plan_section',
        },
    ],
    dbObjectId: true,
})
