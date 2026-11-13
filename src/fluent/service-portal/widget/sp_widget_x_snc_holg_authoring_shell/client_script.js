api.controller = function ($location, $element, $timeout) {
    var c = this;

    // Pass the portal page's URL parameters (and the configured page label)
    // through to the React app. The React entry reads window.__X_SNC_HOLG__
    // first, then the data-holg attribute on the root node.
    var context = {
        page: (c.options && c.options.page_name) || 'Plan Authoring',
        params: $location.search() || {}
    };

    // Lets the React app reflect its state (the open plan) in the portal URL.
    // AngularJS owns the URL here: a bare history.pushState would leave
    // $location out of sync and the next digest would revert it, so the write
    // goes through $location. $timeout runs it inside a digest.
    context.setParams = function (patch, replace) {
        $timeout(function () {
            for (var key in patch) {
                if (Object.prototype.hasOwnProperty.call(patch, key)) {
                    // null clears the param.
                    $location.search(key, patch[key] || null);
                }
            }
            if (replace) {
                $location.replace();
            }
        });
    };

    window.__X_SNC_HOLG__ = context;

    /* Retry budget for the mount node: 50ms apart, so about five seconds. */
    var RETRY_MS = 50;
    var MAX_ATTEMPTS = 100;

    /* The bundle mounts into #react-root, so it must not be requested before
     * that node is in the document. This widget's template can be a digest
     * away when the controller runs, and the bundle starts executing the
     * moment it arrives - from the browser cache, that is almost immediately.
     * Injecting early left the module with nothing to mount into, which showed
     * as a blank page that a reload only sometimes fixed. */
    function injectBundle(root) {
        root.setAttribute('data-holg', JSON.stringify(context));

        var script = document.createElement('script');
        script.type = 'module';
        script.src = '/uxasset/externals/x_snc_holg/authoring.jsdbx?uxpcb=' + new Date().getTime();
        script.onerror = function () {
            // A failed asset request is the other way this page went blank
            // with no explanation. Say so where the app would have been.
            root.textContent =
                'The lab app could not be loaded. Refresh the page to try again.';
        };
        document.head.appendChild(script);
    }

    function whenRootReady(attempt) {
        var root = $element[0].querySelector('#react-root');
        if (root) {
            injectBundle(root);
        } else if (attempt < MAX_ATTEMPTS) {
            $timeout(function () {
                whenRootReady(attempt + 1);
            }, RETRY_MS);
        }
    }

    $timeout(function () {
        whenRootReady(0);
    });
};
