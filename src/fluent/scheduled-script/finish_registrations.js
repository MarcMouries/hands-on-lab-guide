/*
 * Finishes what a public registration cannot.
 *
 * Runs as the system user, which is the entire point: a registrant is a guest,
 * and a guest cannot grant `admin` because that role belongs to Global and the
 * insert is therefore a cross-scope write. The same grant from this same scope
 * succeeds for an admin, so the missing piece was the caller, not the scope.
 *
 * Idempotent and bounded. On a settled room it reads a handful of rows, writes
 * nothing and logs nothing.
 */
(function finishRegistrations() {
    var summary = new x_snc_holg.LabApi().grantPendingEventRoles();

    if (summary.granted || summary.errors.length) {
        gs.info(
            '[x_snc_holg] registrations finished: checked ' +
                summary.checked +
                ', granted ' +
                summary.granted +
                (summary.people.length ? ' (' + summary.people.join('; ') + ')' : '') +
                (summary.errors.length ? ' | errors: ' + summary.errors.join('; ') : ''),
        );
    }
})();
