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

    /* Which event this page is for. The slug is in the URL; the code is typed,
     * because a code in a URL is not a gate. */
    var slug = $sp.getParameter('event') || options.event_slug || '';
    var api = new x_snc_holg.LabApi();

    var found = api.registrationEvent(slug);
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
    }
})();
