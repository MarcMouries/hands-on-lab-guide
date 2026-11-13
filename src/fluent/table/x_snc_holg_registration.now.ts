import { ChoiceColumn, DateTimeColumn, ReferenceColumn, StringColumn, Table } from '@servicenow/sdk/core'

/*
 * One person's registration for one event.
 *
 * Kept after the account is made, because it is the only record of who asked
 * to attend - the `sys_user` row says nothing about which workshop it came
 * from. It holds real names and email addresses, so it is also the thing that
 * gets purged when an event is done with.
 */
export const x_snc_holg_registration = Table({
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
    display: 'email',
    label: 'Lab Registration',
    name: 'x_snc_holg_registration',
    schema: {
        event: ReferenceColumn({
            cascadeRule: 'delete',
            label: 'Event',
            mandatory: true,
            maxLength: 32,
            referenceTable: 'x_snc_holg_event',
        }),
        first_name: StringColumn({
            label: 'First name',
            maxLength: 60,
        }),
        last_name: StringColumn({
            label: 'Last name',
            maxLength: 60,
        }),
        email: StringColumn({
            label: 'Email',
            mandatory: true,
            maxLength: 200,
        }),
        /**
         * `created` - a new account was made for them.
         * `joined` - they were already signed in, so their own account was used.
         * `awaiting_sign_in` - the email matches an existing account, so nothing
         *   was created and no role was granted; they have to sign in and join.
         * `failed` - something went wrong, see failure_reason, retry from the
         *   facilitator view.
         * `revoked` - the event closed and the granted roles were taken back.
         */
        status: ChoiceColumn({
            default: 'created',
            dropdown: 'dropdown_without_none',
            label: 'Status',
            maxLength: 40,
            choices: {
                created: { label: 'Account created', sequence: 1 },
                joined: { label: 'Joined with their own account', sequence: 2 },
                awaiting_sign_in: { label: 'Awaiting sign in', sequence: 3 },
                failed: { label: 'Failed', sequence: 4 },
                revoked: { label: 'Access revoked', sequence: 5 },
            },
        }),
        /** The account created for them, or the one they joined with. */
        user: ReferenceColumn({
            cascadeRule: 'none',
            label: 'User',
            maxLength: 32,
            referenceTable: 'sys_user',
        }),
        /** Which roles this registration actually granted, so B12 can undo exactly those. */
        granted_roles: StringColumn({
            label: 'Granted roles',
            maxLength: 1000,
        }),
        failure_reason: StringColumn({
            label: 'Failure reason',
            maxLength: 500,
        }),
        revoked_on: DateTimeColumn({
            label: 'Revoked on',
            maxLength: 40,
        }),
    },
    index: [
        /*
         * Unique: the same person cannot register twice for one event. The
         * database refuses it rather than the script checking first and hoping,
         * which is the lesson from participant numbers.
         */
        {
            name: 'index',
            unique: true,
            element: ['event', 'email'],
        },
        {
            name: 'index2',
            unique: false,
            element: 'user',
        },
    ],
    dbObjectId: true,
})
