(function () {
    /* Self-registration for a lab event.
     *
     * Everything happens here rather than through a REST route: this widget is
     * public, and a public Scripted REST endpoint would be a second write path
     * to defend. The only thing reachable without a session is this script.
     *
     * The work itself lives in LabApi (x_snc_holg.LabApi.register), so the
     * matching rules, role grants and enrolment are in one place with the rest
     * of the server logic - and are testable without a browser.
     */
    data.event = {};
    data.result = null;
    data.error = '';

    /* Which event this page is for.
     *
     * `input.event_id` first: a POST from the form carries it in the body, and
     * the page's own `?event=` query parameter is not guaranteed to come with
     * it. Taking the URL first meant a registration could rebuild the page as
     * "this link does not name a workshop" on the one request that mattered. */
    var api = new x_snc_holg.LabApi();
    var wanted =
        (input && input.event_id) || $sp.getParameter('event') || options.event_slug || '';

    var found = api.registrationEvent(wanted);
    if (!found) {
        data.error = 'This registration link does not name a workshop. Check the link you were sent.';
        return;
    }
    data.event = found;

    /* Whether the person filling this in is already signed in decides
     * everything: a signed-in caller joins with the account they have, and no
     * password is ever written. */
    data.signedIn = !api.isGuest();
    data.signedInName = data.signedIn ? gs.getUserDisplayName() + '' : '';

    if (input && input.action === 'register') {
        data.result = api.register(found.sys_id, {
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email,
            code: input.code,
        });

        /* A breadcrumb for the next time this goes quiet. The outcome and the
         * event only - no name, no email, no password. */
        gs.info(
            '[x_snc_holg] registration for event ' +
                found.sys_id +
                ': ' +
                (data.result && data.result.ok ? 'ok' : 'refused') +
                (data.result && data.result.heading ? ' - ' + data.result.heading : ''),
        );
    }
})();
