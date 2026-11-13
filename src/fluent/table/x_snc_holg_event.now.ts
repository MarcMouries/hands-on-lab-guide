import {
    ChoiceColumn,
    DateTimeColumn,
    IntegerColumn,
    ReferenceColumn,
    StringColumn,
    Table,
} from '@servicenow/sdk/core'

/*
 * A workshop someone can register for: "Customer Workshop November 13th 2026".
 *
 * Every control on self-registration is a field here, checked by the
 * registration widget's server script, so an event is safe or unsafe by its own
 * record rather than by code someone has to remember to change. Nothing about
 * registration needs a person awake: an event is created, it accepts people
 * while it is open and inside its window and under its cap, and it stops.
 */
export const x_snc_holg_event = Table({
    actions: {
        read: true,
        update: true,
        delete: true,
        create: true,
    },
    allowClientScripts: false,
    allowConfiguration: false,
    allowNewFields: false,
    allowUiActions: true,
    allowWebServiceAccess: true,
    audit: true,
    callerAccess: 'tracking',
    display: 'name',
    label: 'Lab Event',
    name: 'x_snc_holg_event',
    schema: {
        name: StringColumn({
            label: 'Name',
            mandatory: true,
            maxLength: 160,
        }),
        /**
         * Typed into the form by the registrant. Short and readable because a
         * facilitator reads it out or puts it on a slide - it is a gate, not a
         * secret that survives the day.
         */
        registration_code: StringColumn({
            label: 'Registration code',
            maxLength: 40,
        }),
        status: ChoiceColumn({
            default: 'draft',
            dropdown: 'dropdown_without_none',
            label: 'Status',
            maxLength: 40,
            choices: {
                draft: { label: 'Draft', sequence: 1 },
                open: { label: 'Open for registration', sequence: 2 },
                closed: { label: 'Closed', sequence: 3 },
            },
        }),
        /** Both optional. With no end date an event stays open until closed. */
        starts_on: DateTimeColumn({
            label: 'Starts on',
            maxLength: 40,
        }),
        ends_on: DateTimeColumn({
            label: 'Ends on',
            maxLength: 40,
        }),
        /** 0 means no limit. Any other number bounds a leaked code. */
        capacity: IntegerColumn({
            default: '0',
            label: 'Capacity',
            maxLength: 0,
        }),
        /**
         * What registration grants, on top of x_snc_holg.participant.
         *
         * A comma-separated list of role names rather than a reference, so an
         * event on a customer's instance can grant nothing at all and one on a
         * lab instance can grant admin, with no code change between them.
         */
        granted_roles: StringColumn({
            label: 'Granted roles',
            maxLength: 1000,
        }),
        /** The plan registrants are enrolled into when they join. */
        evaluation_plan: ReferenceColumn({
            cascadeRule: 'none',
            label: 'Evaluation plan',
            maxLength: 32,
            referenceTable: 'x_snc_holg_evaluation_plan',
        }),
        facilitator: ReferenceColumn({
            cascadeRule: 'none',
            label: 'Facilitator',
            maxLength: 32,
            referenceTable: 'sys_user',
        }),
        /** Stamped when the granted roles are taken back, so a sweep is idempotent. */
        roles_revoked_on: DateTimeColumn({
            label: 'Roles revoked on',
            maxLength: 40,
        }),
    },
    index: [
        {
            name: 'index',
            unique: false,
            element: 'status',
        },
    ],
    dbObjectId: true,
})
