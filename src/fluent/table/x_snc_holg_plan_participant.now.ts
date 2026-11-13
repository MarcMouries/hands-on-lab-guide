import {
    ChoiceColumn,
    DateTimeColumn,
    IntegerColumn,
    ReferenceColumn,
    StringColumn,
    Table,
} from '@servicenow/sdk/core'

export const x_snc_holg_plan_participant = Table({
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
    display: 'user',
    label: 'Plan Participant',
    name: 'x_snc_holg_plan_participant',
    schema: {
        completed_on: DateTimeColumn({
            label: 'Completed on',
            maxLength: 40,
        }),
        evaluation_plan: ReferenceColumn({
            cascadeRule: 'delete',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_evaluation_plan',
        }),
        participant_number: IntegerColumn({
            default: '0',
            label: 'Participant number',
            maxLength: 0,
        }),
        percent_complete: IntegerColumn({
            default: '0',
            label: 'Percent complete',
            maxLength: 0,
        }),
        prefix: StringColumn({
            maxLength: 20,
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
                complete: {
                    label: 'Complete',
                    sequence: 3,
                },
            },
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
            element: ['evaluation_plan', 'user'],
        },
        {
            name: 'index2',
            unique: false,
            element: 'user',
        },
        // Unique, and the whole point of it: it is what makes two people
        // enrolling in the same instant get two different numbers. LabApi sets
        // the number on the insert and retries a refusal against a fresh read,
        // which only works because the database says no here.
        {
            name: 'index3',
            unique: true,
            element: ['evaluation_plan', 'participant_number'],
        },
    ],
    dbObjectId: true,
})
