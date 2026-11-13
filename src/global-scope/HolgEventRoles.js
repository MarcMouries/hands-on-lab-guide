var HolgEventRoles = Class.create();

/*
 * Grants the platform roles a lab event asks for.
 *
 * WHY THIS LIVES IN GLOBAL SCOPE
 *
 * x_snc_holg can create a sys_user and can grant its own roles, because those
 * belong to it. It cannot grant `admin`: that role record belongs to Global, so
 * the insert is a cross-scope write, and the platform refuses it with
 * "insufficient privileges granted to scope x_snc_holg" even though the scope
 * privilege for sys_user_has_role is allowed.
 *
 * The refusal only appears for a caller who is not an admin, which is why it
 * was not caught earlier: every probe ran in an admin session, where the check
 * is relaxed. A guest registering on the public page is the real case, and the
 * real case is refused.
 *
 * Running the insert from a Script Include whose own scope IS Global settles
 * it - the write is no longer cross-scope. The pattern is taken from the
 * Triangulator app (Be-Heard_update_set_Triangulator.xml): a global
 * application containing one Script Include with Accessible from = All
 * application scopes, doing the one thing the scoped app may not.
 *
 * WHY IT TAKES A REGISTRATION AND NOT A ROLE NAME
 *
 * Anything in any scope can call a public Script Include. If this took a role
 * name it would be a "grant me any role" API with no gate at all. It takes a
 * registration instead and reads the roles off that registration's own event,
 * so the most a caller can do is apply what a facilitator already wrote on an
 * event - which the lab app would have done anyway.
 */
HolgEventRoles.prototype = {
    initialize: function () {},

    REGISTRATION: 'x_snc_holg_registration',
    EVENT: 'x_snc_holg_event',

    /**
     * Applies the event's granted_roles to the user on a registration.
     *
     * Returns { granted: [], already: [], failed: [], error: '' }. Never
     * throws: the account exists by the time this runs, and losing a role must
     * not read as a failed registration.
     */
    grantForRegistration: function (registrationId) {
        var answer = { granted: [], already: [], failed: [], error: '' };

        var reg = new GlideRecord(this.REGISTRATION);
        if (!registrationId || !reg.get(registrationId)) {
            answer.error = 'No such registration.';
            return answer;
        }

        var userId = reg.getValue('user') + '';
        if (!userId) {
            answer.error = 'That registration has no user.';
            return answer;
        }

        var event = new GlideRecord(this.EVENT);
        if (!event.get(reg.getValue('event'))) {
            answer.error = 'That registration has no event.';
            return answer;
        }

        /* Only an open event hands out roles. A registration row that outlives
         * its workshop must not still be a way to become an admin. */
        if ((event.getValue('status') + '') !== 'open') {
            answer.error = 'That event is not open.';
            return answer;
        }

        var wanted = ('' + (event.getValue('granted_roles') || '')).split(',');
        for (var i = 0; i < wanted.length; i++) {
            var name = ('' + wanted[i]).trim();
            if (!name) {
                continue;
            }

            var role = new GlideRecord('sys_user_role');
            role.addQuery('name', name);
            role.setLimit(1);
            role.query();
            if (!role.next()) {
                answer.failed.push(name + ' (no such role)');
                continue;
            }

            var has = new GlideRecord('sys_user_has_role');
            has.addQuery('user', userId);
            has.addQuery('role', role.getUniqueValue());
            has.setLimit(1);
            has.query();
            if (has.next()) {
                answer.already.push(name);
                continue;
            }

            try {
                var add = new GlideRecord('sys_user_has_role');
                add.initialize();
                add.setValue('user', userId);
                add.setValue('role', role.getUniqueValue());
                if (add.insert()) {
                    answer.granted.push(name);
                } else {
                    answer.failed.push(name + ' (refused)');
                }
            } catch (e) {
                answer.failed.push(name + ' (' + e + ')');
            }
        }

        return answer;
    },

    type: 'HolgEventRoles'
};
