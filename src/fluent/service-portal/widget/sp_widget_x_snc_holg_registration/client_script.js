api.controller = function () {
    var c = this;

    c.form = { first_name: '', last_name: '', email: '', code: '' };
    c.busy = false;

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
        c.server
            .update({
                action: 'register',
                first_name: c.form.first_name,
                last_name: c.form.last_name,
                email: c.form.email,
                code: c.form.code,
            })
            .then(function () {
                c.busy = false;
                // The code is not kept around once it has been used.
                c.form.code = '';
            })
            .catch(function () {
                c.busy = false;
            });
    };
};
