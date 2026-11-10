import { IntegerColumn, MultiLineTextColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

export const x_snc_holg_task_prompt = Table({
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
    display: 'label',
    label: 'Task Prompt',
    name: 'x_snc_holg_task_prompt',
    schema: {
        label: StringColumn({
            maxLength: 120,
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
        prompt_text: MultiLineTextColumn({
            label: 'Prompt text',
            maxLength: 8000,
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
