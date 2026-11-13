import { IntegerColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

/*
 * What a participant is expected to have built by the end of a task.
 *
 * One row is one artifact the facilitator can look for: a table to find it in,
 * an optional name fragment, and how many of them count as done. Evidence comes
 * from sys_update_xml (Customer Updates), which records every metadata change
 * with its table, its display name and who made it - so a task can be checked
 * without reading into each participant's own scope.
 *
 * Expectations are authored, not inferred: a lab task says what good looks
 * like, and only a person knows that.
 */
export const x_snc_holg_task_expectation = Table({
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
    label: 'Task Expectation',
    name: 'x_snc_holg_task_expectation',
    schema: {
        label: StringColumn({
            label: 'Label',
            mandatory: true,
            maxLength: 120,
        }),
        /** The table the artifact lives in, as sys_update_xml records it. */
        target_table: StringColumn({
            label: 'Target table',
            mandatory: true,
            maxLength: 80,
        }),
        /**
         * Optional fragment of the artifact's name, matched case-insensitively.
         * Left empty, any artifact in the table counts.
         */
        name_contains: StringColumn({
            label: 'Name contains',
            maxLength: 120,
        }),
        /** How many distinct artifacts count as done. */
        minimum: IntegerColumn({
            default: '1',
            label: 'Minimum',
            maxLength: 0,
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
