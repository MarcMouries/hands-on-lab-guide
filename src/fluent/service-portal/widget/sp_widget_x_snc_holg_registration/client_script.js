api.controller = function () {
    var c = this;

    c.form = { first_name: '', last_name: '', email: '', code: '' };
    c.busy = false;

    /* `?email=` in the URL fills the form in, so testing the whole flow is one
     * click. The server derives the names from the address and hands them over
     * already filled; it never submits for you. */
    if (c.data.prefill && c.data.prefill.email) {
        c.form.first_name = c.data.prefill.first_name;
        c.form.last_name = c.data.prefill.last_name;
        c.form.email = c.data.prefill.email;
    }

    /* The server decides everything; this only collects and submits. Guarding
     * here as well keeps the button from firing a request that cannot succeed,
     * but the server re-checks every field - a client check is a courtesy. */
    c.canSubmit = function () {
        if (c.busy) {
            return false;
        }
        if (!c.data.event || !c.data.event.accepting) {
            return false;
        }
        if (c.data.event.needs_code && !c.form.code) {
            return false;
        }
        return c.data.signedIn
            ? true
            : !!(c.form.first_name && c.form.last_name && c.form.email);
    };

    c.submit = function () {
        if (!c.canSubmit()) {
            return;
        }
        c.busy = true;

        /*
         * The values go ON c.data and then `c.server.update()` is called with no
         * argument, because that is the contract: update() sends c.data as the
         * server script's `input` and replaces c.data with what comes back. An
         * argument passed to update() is ignored - the first version passed one,
         * so `input.action` was never set, the server fell straight through, and
         * the button span changed while nothing at all happened.
         *
         * `c.server.get(obj)` is the other half of that API and does take an
         * object, but it leaves c.data alone, so the success state would have to
         * be merged in by hand. Here the whole point is that the server's answer
         * becomes the view.
         */
        c.data.action = 'register';
        c.data.first_name = c.form.first_name;
        c.data.last_name = c.form.last_name;
        c.data.email = c.form.email;
        c.data.code = c.form.code;

        /*
         * The event travels in the body as well. A POST to the widget endpoint
         * does not necessarily carry the page's `?event=` query parameter, and
         * without it the server would rebuild the page as "this link does not
         * name a workshop" on the very request that was meant to register.
         */
        c.data.event_id = c.data.event ? c.data.event.sys_id : '';

        c.server
            .update()
            .then(function () {
                c.busy = false;
                // Not left in c.data: a later update() would resubmit it.
                c.data.action = '';
                // Nor is the code kept once it has been used.
                c.form.code = '';
                c.data.code = '';

                /* Only the already-registered outcome sets this. An account
                 * that was just created must stay put so its password can be
                 * read off the screen. */
                if (c.data.result && c.data.result.redirect) {
                    window.location.href = c.data.result.redirect;
                }
            })
            .catch(function () {
                c.busy = false;
                c.data.action = '';
                c.data.error =
                    'Something went wrong sending your registration. Please try again, or tell your facilitator.';
            });
    };
};
