import { IntegerColumn, MultiLineTextColumn, ReferenceColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_success_criterion = Table({
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
    display: 'criterion',
    label: 'Success Criterion',
    name: 'x_snc_holg_success_criterion',
    schema: {
        criterion: MultiLineTextColumn({
            maxLength: 4000,
        }),
        order: IntegerColumn({
            default: '100',
            maxLength: 0,
        }),
        plan_task: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_plan_task',
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'plan_task',
        },
    ],
    dbObjectId: true,
})
